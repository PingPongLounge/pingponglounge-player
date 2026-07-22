import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { belegung, RESERVE_MINUTES } from "@/lib/tournaments"

// TURNIER-ZAHLUNG
// Der Preis kommt NIE vom Client — er steht am Turnier (entry_fee_chf).
// Ablauf: Anmeldung existiert bereits (register / register-guest) mit
// payment_status='none'. Hier wird der Platz für RESERVE_MINUTES reserviert und
// eine Stripe-Session erzeugt. Erst der Webhook setzt 'paid'. Läuft die
// Reservierung ab, ohne dass bezahlt wurde, gibt ein Cron den Platz frei.
//
// Funktioniert für Player UND Gäste: der Zugriff läuft über die
// registration_id (unerratbare UUID) — deshalb kein Auth-Zwang (die Webseite
// ruft serverseitig von einer anderen Domain auf).
export const runtime = "nodejs"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const regId = String(body.registration_id || "")
  // Wohin nach der Zahlung? Player bleibt in der App, Gast kehrt zur Webseite
  // zurück. Nur eigene Pfade/erlaubte Hosts — kein Open-Redirect.
  const successPath = typeof body.success_path === "string" && body.success_path.startsWith("/") ? body.success_path : `/turniere/${id}?bezahlt=1`
  const cancelPath = typeof body.cancel_path === "string" && body.cancel_path.startsWith("/") ? body.cancel_path : `/turniere/${id}?abgebrochen=1`
  const returnBase = typeof body.return_base === "string" && /^https:\/\/(www\.)?pingponglounge\.ch$/.test(body.return_base) ? body.return_base : BASE_URL

  if (!regId) return NextResponse.json({ error: "registration_id fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const { data: reg } = await admin.from("tournament_registrations")
    .select("id,tournament_id,payment_status,waitlist,first_name,player_id")
    .eq("id", regId).eq("tournament_id", id).maybeSingle()
  if (!reg) return NextResponse.json({ error: "Anmeldung nicht gefunden" }, { status: 404 })
  if (reg.waitlist) return NextResponse.json({ error: "Du stehst auf der Warteliste — noch keine Zahlung nötig." }, { status: 400 })
  if (["paid", "free"].includes(reg.payment_status)) return NextResponse.json({ ok: true, alreadyPaid: true })

  const { data: t } = await admin.from("player_tournaments")
    .select("id,name,entry_fee_chf,payment_mode,max_players,status,date,start_time").eq("id", id).single()
  if (!t) return NextResponse.json({ error: "Turnier nicht gefunden" }, { status: 404 })
  if (t.payment_mode !== "online" || Number(t.entry_fee_chf) <= 0)
    return NextResponse.json({ error: "Für dieses Turnier ist keine Online-Zahlung nötig" }, { status: 400 })

  // Noch ein Platz frei? (die eigene reservierte Zeile zählt hier mit)
  const b = await belegung(admin, id, t.max_players)
  if (b.voll && !["reserved", "pending"].includes(reg.payment_status))
    return NextResponse.json({ error: "Turnier ist voll" }, { status: 409 })

  const chf = Number(t.entry_fee_chf)
  const reservedUntil = new Date(Date.now() + RESERVE_MINUTES * 60 * 1000).toISOString()

  // Platz reservieren (zählt jetzt gegen die Kapazität, läuft nach der Frist ab).
  await admin.from("tournament_registrations")
    .update({ payment_status: "reserved", reserved_until: reservedUntil, amount_chf: chf })
    .eq("id", regId)

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(chf * 100),
        product_data: { name: `Turnier: ${t.name}`, description: t.date ? `${t.date}${t.start_time ? " · " + t.start_time : ""}` : undefined },
      },
    }],
    metadata: { type: "tournament", tournament_id: id, registration_id: regId },
    expires_at: Math.floor(Date.now() / 1000) + RESERVE_MINUTES * 60,
    success_url: `${returnBase}${successPath}`,
    cancel_url: `${returnBase}${cancelPath}`,
  })

  await admin.from("tournament_registrations").update({ stripe_session_id: session.id, payment_status: "pending" }).eq("id", regId)
  return NextResponse.json({ url: session.url })
}
