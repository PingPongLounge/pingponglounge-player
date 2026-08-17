import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { snTicket, SINGLE_NIGHT_PLAETZE, startZeit } from "@/lib/opengames"
import { rateLimited, clientIp } from "@/lib/ratelimit"

// Single-Night-Ticket: Herren (29, 1 Person) oder Damen 2-für-1 (29, 2 Personen).
// Preis + Personenzahl IMMER serverseitig aus lib/opengames. Platz erst nach
// bezahlter Zahlung fest (Webhook) — hier nur reserviert (20 Min).
export const runtime = "nodejs"

const RESERVE_MINUTES = 20
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}

// Belegte Personen (bezahlt + noch gültige Reservierungen) für ein Event.
async function belegtePersonen(admin: ReturnType<typeof createAdminClient>, eventId: string): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data } = await admin
    .from("single_night_bookings")
    .select("persons,payment_status,reserved_until")
    .eq("event_id", eventId)
  let used = 0
  for (const b of data || []) {
    const active = b.payment_status === "paid" || (b.payment_status === "reserved" && b.reserved_until && b.reserved_until > nowIso)
    if (active) used += Number(b.persons || 1)
  }
  return used
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const eventId = String(body?.event_id || "")
  const ticket = snTicket(String(body?.ticket_type || ""))
  const guest = (body?.guest ?? null) as { name?: string; email?: string; phone?: string } | null
  if (!eventId || !ticket) return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const admin = createAdminClient()

  // Event prüfen: existiert, ist Single Night, offen, in der Zukunft.
  const { data: ev } = await admin
    .from("open_games")
    .select("id,kind,status,date,start_hour,max_players")
    .eq("id", eventId).maybeSingle()
  if (!ev || ev.kind !== "single_night") return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 })
  if (ev.status !== "open") return NextResponse.json({ error: "Nicht mehr buchbar" }, { status: 400 })
  if (startZeit(ev) < new Date()) return NextResponse.json({ error: "Event ist vorbei" }, { status: 400 })

  // Kapazität (Personen).
  const kapazitaet = Number(ev.max_players ?? SINGLE_NIGHT_PLAETZE)
  const used = await belegtePersonen(admin, eventId)
  if (used + ticket.persons > kapazitaet) return NextResponse.json({ error: "Ausgebucht" }, { status: 400 })

  // Identität: eingeloggt ODER Gast.
  let payerName = ""
  let payerEmail: string | null = null
  let payerPhone: string | null = null
  if (user) {
    const { data: prof } = await admin.from("profiles").select("name").eq("id", user.id).maybeSingle()
    payerName = prof?.name || "Spieler"
    const { data: au } = await admin.auth.admin.getUserById(user.id)
    payerEmail = au?.user?.email || null
    // Nur eine aktive Buchung pro Event.
    const nowIso = new Date().toISOString()
    const { data: mine } = await admin.from("single_night_bookings")
      .select("id,payment_status,reserved_until").eq("event_id", eventId).eq("user_id", user.id)
    if ((mine || []).some(b => b.payment_status === "paid" || (b.payment_status === "reserved" && b.reserved_until && b.reserved_until > nowIso))) {
      return NextResponse.json({ error: "Du hast schon ein Ticket für diesen Abend." }, { status: 409 })
    }
  } else {
    if (rateLimited(`sn:${clientIp(req)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Zu viele Versuche. Bitte kurz warten." }, { status: 429 })
    }
    const name = (guest?.name || "").trim().slice(0, 80)
    const email = (guest?.email || "").trim().slice(0, 120)
    const phone = (guest?.phone || "").trim().slice(0, 40)
    if (!name) return NextResponse.json({ error: "Bitte Name angeben." }, { status: 400 })
    if (!isEmail(email)) return NextResponse.json({ error: "Bitte gültige E-Mail angeben." }, { status: 400 })
    // Doppelbuchung/Reservierungs-Spam per Gast-E-Mail verhindern (analog Camp).
    const nowIso = new Date().toISOString()
    const { data: sameMail } = await admin.from("single_night_bookings")
      .select("id,payment_status,reserved_until").eq("event_id", eventId).eq("guest_email", email)
    if ((sameMail || []).some(b => b.payment_status === "paid" || (b.payment_status === "reserved" && b.reserved_until && b.reserved_until > nowIso))) {
      return NextResponse.json({ error: "Für diese E-Mail besteht schon ein Ticket für diesen Abend." }, { status: 409 })
    }
    payerName = name; payerEmail = email; payerPhone = phone || null
  }

  // Reservierung anlegen.
  const reservedUntil = new Date(Date.now() + RESERVE_MINUTES * 60_000)
  const cancelToken = crypto.randomUUID()
  const { data: booking, error: insErr } = await admin.from("single_night_bookings").insert({
    event_id: eventId,
    user_id: user?.id ?? null,
    guest_name: user ? null : payerName,
    guest_email: user ? null : payerEmail,
    guest_phone: user ? null : payerPhone,
    ticket_type: ticket.key,
    persons: ticket.persons,
    amount_chf: ticket.price,
    payment_status: "reserved",
    reserved_until: reservedUntil.toISOString(),
    cancel_token: cancelToken,
  }).select("id").single()
  if (insErr || !booking) return NextResponse.json({ error: "Buchung konnte nicht angelegt werden" }, { status: 500 })

  const stripe = getStripe()
  const datum = new Date(`${ev.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long" })
  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: payerEmail || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(ticket.price * 100),
        product_data: { name: `Single Night — ${ticket.label}`, description: `${datum}, 19:00${ticket.persons > 1 ? " · 2 Personen" : ""}` },
      },
    }],
    metadata: { type: "single_night", booking_id: booking.id },
    expires_at: Math.floor(reservedUntil.getTime() / 1000),
    success_url: `${BASE_URL}/single-night?bezahlt=1`,
    cancel_url: `${BASE_URL}/single-night?abgebrochen=1`,
  })

  await admin.from("single_night_bookings").update({ stripe_session_id: stripeSession.id }).eq("id", booking.id)
  return NextResponse.json({ url: stripeSession.url })
}
