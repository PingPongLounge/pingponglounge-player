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

    // OPEN GAME: Der Platz wird ERST HIER vergeben — nach tatsächlich erfolgter
    // Zahlung. Wer die Kasse abbricht, hat nie einen Platz belegt.
    if (s.payment_status === "paid" && s.metadata?.type === "open_game") {
      const gameId = s.metadata.game_id
      const userId = s.metadata.user_id
      const admin = createAdminClient()

      if (gameId && userId) {
        const { data: game } = await admin
          .from("open_games")
          .select("id,max_players,current_players,status,location_name,price_per_player")
          .eq("id", gameId).maybeSingle()

        // Ausgebucht, während der Spieler an der Kasse stand? Dann Geld zurück.
        const voll = !game || game.status !== "open" ||
          (game.current_players ?? 0) >= (game.max_players ?? 6)

        if (voll) {
          try {
            if (s.payment_intent) {
              await getStripe().refunds.create({ payment_intent: String(s.payment_intent) })
            }
          } catch (e) {
            console.error("Rückerstattung nach Überbuchung fehlgeschlagen:", e)
          }
        } else {
          const { data: prof } = await admin.from("profiles").select("name").eq("id", userId).maybeSingle()

          // Der Unique-Index (game_id, user_id) macht das idempotent: feuert der
          // Webhook zweimal, entsteht kein zweiter Platz.
          const { error: insErr } = await admin.from("open_game_players").insert({
            game_id: gameId,
            user_id: userId,
            display_name: prof?.name || s.metadata.player_name || "Spieler",
            status: "confirmed",
            paid: true,
            amount_chf: game.price_per_player ?? null,
            stripe_session_id: s.id,
            stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
          })

          if (!insErr) {
            await admin.from("open_games").update({
              current_players: (game.current_players ?? 0) + 1,
              status: (game.current_players ?? 0) + 1 >= (game.max_players ?? 6) ? "full" : "open",
              updated_at: new Date().toISOString(),
            }).eq("id", gameId)

            // PingPoints für die bezahlte Buchung — idempotent über die Session-ID
            const refId = sessionUuid(s.id)
            const { data: schon } = await admin.from("ping_points_transactions")
              .select("id").eq("player_id", userId).eq("ref_id", refId).maybeSingle()
            if (!schon) {
              await admin.from("ping_points_transactions").insert({
                player_id: userId,
                amount: PP_CONFIG.perPaidBooking,
                source: "booking_paid",
                description: `Open Game${game.location_name ? ` — ${game.location_name}` : ""}`,
                ref_id: refId,
              })
            }
          }
        }
      }
      return NextResponse.json({ received: true })
    }

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
          const rows: Array<Record<string, unknown>> = [{
            player_id: playerId,
            amount: PP_CONFIG.perPaidBooking,
            source: "booking_paid",
            description: `Buchung bezahlt${s.metadata?.location_name ? ` — ${s.metadata.location_name}` : ""}`,
            ref_id: refId,
          }]

          // Eingelöste Punkte erst hier abziehen — nicht schon beim Checkout.
          // Sonst wären die Punkte weg, auch wenn der Kunde die Bezahlung abbricht.
          const eingeloest = parseInt(s.metadata?.redeemed_points || "0", 10)
          if (Number.isInteger(eingeloest) && eingeloest > 0) {
            rows.push({
              player_id: playerId,
              amount: -eingeloest,
              source: "redeem",
              description: "Rabatt auf Buchung",
              ref_id: refId,
            })
          }

          await admin.from("ping_points_transactions").insert(rows)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
