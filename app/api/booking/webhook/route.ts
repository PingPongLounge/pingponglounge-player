import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { PP_CONFIG } from "@/lib/rewards"

// Stripe-Webhook: schreibt PingPoints NUR nach einer tatsächlich bezahlten Buchung.
// Ohne diesen Webhook könnte man sich durch Aufruf von /buchen?paid=1 Punkte erschleichen.
export const runtime = "nodejs"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}

// Deterministische UUID aus der Stripe-Session-ID → macht die Gutschrift idempotent
// (ref_id ist eine uuid-Spalte, Stripe-IDs sind es nicht).
function sessionUuid(sessionId: string): string {
  const h = crypto.createHash("md5").update(sessionId).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get("stripe-signature")
  if (!secret || !sig) return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (e) {
    console.error("Stripe Webhook Signatur ungültig:", e)
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session
    if (s.payment_status === "paid") {
      const playerId = s.metadata?.player_id || ""
      if (playerId) {
        const admin = createAdminClient()
        const refId = sessionUuid(s.id)

        // Idempotent: dieselbe Stripe-Session schreibt nie zweimal gut
        const { data: existing } = await admin
          .from("ping_points_transactions")
          .select("id")
          .eq("player_id", playerId)
          .eq("source", "booking_paid")
          .eq("ref_id", refId)
          .maybeSingle()

        if (!existing) {
          await admin.from("ping_points_transactions").insert({
            player_id: playerId,
            amount: PP_CONFIG.perPaidBooking,
            source: "booking_paid",
            description: `Buchung bezahlt${s.metadata?.location_name ? ` — ${s.metadata.location_name}` : ""}`,
            ref_id: refId,
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
