import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { campPrice, isCampSessionId, CAMP_LOCATION_NAME } from "@/lib/camp"
import { campBelegung, campVolleSessions } from "@/lib/camp-server"
import { SELF_RATINGS } from "@/lib/tournaments"
import { rateLimited, clientIp } from "@/lib/ratelimit"

// Trainingscamp-Buchung: eine Stripe-Session für beliebig viele Einheiten,
// Preis gestaffelt (siehe lib/camp.ts) und IMMER serverseitig berechnet.
// Login ODER Gast (Name/E-Mail/Telefon). Platz wird erst im Webhook nach
// bezahlter Zahlung endgültig — hier nur reserviert (Frist 20 Min).
export const runtime = "nodejs"

const RESERVE_MINUTES = 20
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const sessionIds: string[] = Array.isArray(body?.session_ids) ? body.session_ids.map(String) : []
  const guest = (body?.guest ?? null) as { name?: string; email?: string; phone?: string } | null
  const selfRating = typeof body?.self_rating === "string" ? body.self_rating : null
  const consent = body?.consent === true

  // Sessions validieren — nur bekannte IDs, keine Duplikate.
  const uniq = Array.from(new Set(sessionIds)).filter(isCampSessionId)
  if (uniq.length === 0) return NextResponse.json({ error: "Keine gültige Einheit gewählt" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const admin = createAdminClient()

  // Identität: eingeloggt ODER Gast mit vollständigen Angaben.
  let payerName = ""
  let payerEmail: string | null = null
  let payerPhone: string | null = null
  if (user) {
    const { data: prof } = await admin.from("profiles").select("name").eq("id", user.id).maybeSingle()
    payerName = prof?.name || "Spieler"
    const { data: au } = await admin.auth.admin.getUserById(user.id)
    payerEmail = au?.user?.email || null
  } else {
    // Gast: Rate-Limit gegen Spam/Flooding.
    if (rateLimited(`camp:${clientIp(req)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Zu viele Versuche. Bitte kurz warten." }, { status: 429 })
    }
    const name = (guest?.name || "").trim().slice(0, 80)
    const email = (guest?.email || "").trim().slice(0, 120)
    const phone = (guest?.phone || "").trim().slice(0, 40)
    if (!name) return NextResponse.json({ error: "Bitte Namen angeben." }, { status: 400 })
    if (!isEmail(email)) return NextResponse.json({ error: "Bitte gültige E-Mail angeben." }, { status: 400 })
    if (!phone) return NextResponse.json({ error: "Bitte Telefonnummer angeben." }, { status: 400 })
    if (!consent) return NextResponse.json({ error: "Bitte den Bedingungen zustimmen." }, { status: 400 })
    payerName = name; payerEmail = email; payerPhone = phone
  }

  // Selbsteinschätzung (optional) gegen Whitelist prüfen.
  const selfOk = !selfRating || SELF_RATINGS.some(r => r.key === selfRating)
  if (!selfOk) return NextResponse.json({ error: "Ungültige Spielstärke" }, { status: 400 })

  // Kapazität: keine der gewählten Einheiten darf voll sein.
  const counts = await campBelegung(admin)
  const voll = campVolleSessions(counts, uniq)
  if (voll.length > 0) return NextResponse.json({ error: "Eine gewählte Einheit ist leider ausgebucht.", full: voll }, { status: 409 })

  // Doppelbuchung derselben Identität für dieselbe Einheit verhindern.
  {
    const q = admin.from("camp_bookings").select("session_ids").in("payment_status", ["paid", "reserved"])
    const { data: mine } = user
      ? await q.eq("user_id", user.id)
      : await q.eq("guest_email", payerEmail)
    const schon = new Set<string>()
    for (const b of mine || []) for (const s of (b.session_ids || [])) schon.add(s)
    const dup = uniq.filter(s => schon.has(s))
    if (dup.length > 0) return NextResponse.json({ error: "Für eine Einheit bist du schon angemeldet.", dup }, { status: 409 })
  }

  // Preis serverseitig.
  const price = campPrice(uniq)
  if (price.total <= 0) return NextResponse.json({ error: "Preis ungültig" }, { status: 400 })

  // Reservierung anlegen (Platz wird erst im Webhook nach Zahlung fest).
  // cancel_token: erlaubt Gästen (ohne Login) das Stornieren über den Link in der
  // Bestätigungsmail. Eingeloggte stornieren zusätzlich als Eigentümer.
  const reservedUntil = new Date(Date.now() + RESERVE_MINUTES * 60_000)
  const cancelToken = crypto.randomUUID()
  const { data: booking, error: insErr } = await admin.from("camp_bookings").insert({
    user_id: user?.id ?? null,
    guest_name: user ? null : payerName,
    guest_email: user ? null : payerEmail,
    guest_phone: user ? null : payerPhone,
    self_rating: selfRating,
    session_ids: uniq,
    amount_chf: price.total,
    payment_status: "reserved",
    reserved_until: reservedUntil.toISOString(),
    cancel_token: cancelToken,
  }).select("id").single()
  if (insErr || !booking) return NextResponse.json({ error: "Buchung konnte nicht angelegt werden" }, { status: 500 })

  // Stripe-Checkout — Betrag serverseitig, Reservierung läuft mit expires_at ab.
  const stripe = getStripe()
  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: payerEmail || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(price.total * 100),
        product_data: {
          name: `Trainingscamp ${CAMP_LOCATION_NAME}`,
          description: `${uniq.length} Einheit${uniq.length > 1 ? "en" : ""} · 13.–16. August`,
        },
      },
    }],
    metadata: { type: "camp", booking_id: booking.id },
    expires_at: Math.floor(reservedUntil.getTime() / 1000),
    success_url: `${BASE_URL}/trainingscamp?bezahlt=1`,
    cancel_url: `${BASE_URL}/trainingscamp?abgebrochen=1`,
  })

  await admin.from("camp_bookings").update({ stripe_session_id: stripeSession.id }).eq("id", booking.id)

  return NextResponse.json({ url: stripeSession.url })
}
