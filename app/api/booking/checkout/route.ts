import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PP_CHF } from "@/lib/rewards"

// Lazy init — verhindert Build-Crash wenn STRIPE_SECRET_KEY fehlt
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pingponglounge-player.vercel.app"
const PLANYO_API_KEY = process.env.PLANYO_API_KEY || ""
const PLANYO_BASE = "https://www.planyo.com/rest/"

// Serverseitige Preis-Tabelle — Client-Preis wird IMMER ignoriert
const PRICES: Record<string, { perHour: number; perHalf: number; flat?: number }> = {
  "142166": { perHour: 25, perHalf: 15 }, // Oerlikon
  "206740": { perHour: 25, perHalf: 15 }, // Langstrasse
  "251796": { perHour: 25, perHalf: 15 }, // Basel
  "229327": { perHour: 25, perHalf: 15 }, // Luzern
  "251795": { perHour: 20, perHalf: 10 }, // St. Gallen
  "252049": { perHour: 10, perHalf: 10, flat: 10 }, // Open Game SG
}

function parsePlanyoTime(t: string | number): Date | null {
  if (!t) return null
  if (/^\d+$/.test(String(t))) return new Date(Number(t) * 1000)
  const d = new Date(String(t).replace(" ", "T"))
  return isNaN(d.getTime()) ? null : d
}

export async function POST(req: NextRequest) {
  try {
    const { reservation_id, location_name, date_label, time_label, email, redeem_points } = await req.json()
    if (!reservation_id) return NextResponse.json({ error: "reservation_id fehlt" }, { status: 400 })

    // Eingeloggter Spieler (optional) — nur damit der Webhook die PingPoints
    // dem richtigen Konto gutschreiben kann. Nie vom Client übernehmen.
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()

    // 1. Reservation bei Planyo verifizieren
    const url = new URL(PLANYO_BASE)
    url.searchParams.set("method", "get_reservation_data")
    url.searchParams.set("api_key", PLANYO_API_KEY)
    url.searchParams.set("reservation_id", String(reservation_id))
    const pRes = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    const pJson = await pRes.json()
    const r = pJson?.data
    if (pJson?.response_code !== 0 || !r) return NextResponse.json({ error: "Reservation nicht gefunden" }, { status: 404 })

    // 2. Preis serverseitig berechnen
    const resourceId = String(r.resource_id || "")
    const price = PRICES[resourceId]
    if (!price) return NextResponse.json({ error: "Unbekannter Standort" }, { status: 400 })
    const start = parsePlanyoTime(r.start_time)
    const end   = parsePlanyoTime(r.end_time)
    if (!start || !end || end <= start) return NextResponse.json({ error: "Ungültige Zeit" }, { status: 400 })
    let hours = (end.getTime() - start.getTime()) / 3_600_000
    if (hours < 0) hours += 24
    const tables = Math.max(1, parseInt(String(r.quantity || "1")) || 1)
    const amount = price.flat != null ? price.flat
      : hours <= 0.5 ? price.perHalf * tables
      : Math.round(price.perHour * tables * hours)

    if (amount <= 0) return NextResponse.json({ error: "Ungültiger Betrag" }, { status: 400 })

    // PingPoints-Rabatt. Die App hat ihn bisher nur ANGEZEIGT und an diese Route
    // geschickt — hier wurde er ignoriert. Der Kunde sah "CHF 25 − 10 = 15" und
    // wurde trotzdem mit 25 belastet, ohne dass Punkte abgezogen wurden.
    // Das Guthaben wird serverseitig geprüft, der Client-Wert nie geglaubt.
    let discount = 0
    let punkte = 0
    if (user && Number.isInteger(redeem_points) && redeem_points > 0) {
      const admin = createAdminClient()
      const { data: tx } = await admin
        .from("ping_points_transactions")
        .select("amount")
        .eq("player_id", user.id)
      const guthaben = (tx || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)

      // Höchstens so viele Punkte, wie er hat — und nie mehr als der Betrag hergibt
      punkte = Math.min(redeem_points, guthaben, Math.floor(amount / PP_CHF))
      if (punkte > 0) discount = punkte * PP_CHF
    }

    const zuZahlen = Math.max(0, amount - discount)
    if (zuZahlen <= 0) return NextResponse.json({ error: "Bitte weniger Punkte einlösen — der Betrag muss über 0 liegen" }, { status: 400 })

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: {
        currency: "chf",
        product_data: {
          name: `Ping Pong Lounge ${location_name || ""}`.trim(),
          description: `${date_label} · ${time_label}${punkte > 0 ? ` · ${punkte} PingPoints eingelöst (−CHF ${discount.toFixed(2)})` : ""}`,
        },
        unit_amount: Math.round(zuZahlen * 100),
      }, quantity: 1 }],
      mode: "payment",
      customer_email: email || undefined,
      metadata: {
        reservation_id: String(reservation_id),
        location_name: String(location_name || ""),
        amount: String(zuZahlen),
        player_id: user?.id || "",
        redeemed_points: String(punkte),
      },
      success_url: `${BASE_URL}/buchen?paid=1`,
      cancel_url:  `${BASE_URL}/buchen`,
    })

    return NextResponse.json({ url: session.url, amount: zuZahlen, discount, redeemed: punkte })
  } catch (e) {
    console.error("Stripe checkout error:", e)
    return NextResponse.json({ error: "Stripe Fehler" }, { status: 500 })
  }
}
