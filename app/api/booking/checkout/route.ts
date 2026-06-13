import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
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
    const { reservation_id, location_name, date_label, time_label, email } = await req.json()
    if (!reservation_id) return NextResponse.json({ error: "reservation_id fehlt" }, { status: 400 })

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: {
        currency: "chf",
        product_data: { name: `Ping Pong Lounge ${location_name || ""}`.trim(), description: `${date_label} · ${time_label}` },
        unit_amount: Math.round(amount * 100),
      }, quantity: 1 }],
      mode: "payment",
      customer_email: email || undefined,
      metadata: { reservation_id: String(reservation_id), location_name: String(location_name || ""), amount: String(amount) },
      success_url: `${BASE_URL}/buchen?paid=1`,
      cancel_url:  `${BASE_URL}/buchen`,
    })

    return NextResponse.json({ url: session.url, amount })
  } catch (e) {
    console.error("Stripe checkout error:", e)
    return NextResponse.json({ error: "Stripe Fehler" }, { status: 500 })
  }
}
