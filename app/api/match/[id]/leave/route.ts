import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stornoMoeglich, OG_STORNO_STUNDEN } from "@/lib/opengames"
import { sessionUuid } from "@/lib/stripe-util"
import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: game } = await admin
    .from("open_games")
    .select("id,created_by,status,is_official,date,start_hour,max_players")
    .eq("id", id).single()
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })
  if (game.created_by === user.id) return NextResponse.json({ error: "Als Ersteller bitte das Spiel löschen" }, { status: 400 })

  // KRITISCH: Austreten darf NUR aus einem noch offenen Spiel möglich sein.
  // Vorher setzte diese Route den Status bedingungslos auf "open" zurück — auch
  // bei einem bereits gewerteten Spiel. Damit liess sich dasselbe Spiel durch
  // Austreten → Wiederbeitreten → erneut eintragen beliebig oft werten und ELO
  // unbegrenzt farmen. Ebenso wurde ein abgesagtes Spiel wiederbelebt.
  if (!["open", "full"].includes(game.status)) {
    return NextResponse.json({ error: "Dieses Spiel ist nicht mehr offen" }, { status: 400 })
  }

  // Bezahlter Platz? Dann Geld zurück — aber nur innerhalb der Frist.
  const { data: mein } = await admin
    .from("open_game_players")
    .select("id,paid,stripe_payment_intent,stripe_session_id,refunded_at,redeemed_points,redeem_ref")
    .eq("game_id", id).eq("user_id", user.id).maybeSingle()

  if (!mein) return NextResponse.json({ error: "Du bist nicht angemeldet" }, { status: 400 })

  let erstattet = false
  if (game.is_official && mein.paid && !mein.refunded_at) {
    if (!stornoMoeglich(game)) {
      return NextResponse.json({
        error: `Absagen geht nur bis ${OG_STORNO_STUNDEN} Stunden vorher — dein Platz bleibt bezahlt.`,
        zuSpaet: true,
      }, { status: 400 })
    }

    // Erst erstatten, dann den Platz freigeben. Scheitert die Rückerstattung,
    // bleibt der Spieler drin — besser als Platz weg UND Geld weg.
    try {
      if (mein.stripe_payment_intent) {
        await getStripe().refunds.create({ payment_intent: mein.stripe_payment_intent })
      }
      erstattet = true
    } catch (e) {
      console.error("Rückerstattung fehlgeschlagen:", e)
      return NextResponse.json({ error: "Rückerstattung fehlgeschlagen — melde dich bei uns." }, { status: 500 })
    }

    await admin.from("open_game_players")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", mein.id)

    // Die bei der Buchung gutgeschriebenen +5 PingPoints wieder abziehen. Sonst
    // liesse sich die Belohnungswährung farmen: buchen (+5), rechtzeitig absagen
    // (Geld zurück, Punkte bleiben), wiederholen. Idempotent über die Session-ID.
    if (mein.stripe_session_id) {
      const refId = sessionUuid(mein.stripe_session_id)
      const { data: gutschrift } = await admin.from("ping_points_transactions")
        .select("id,amount").eq("player_id", user.id).eq("ref_id", refId)
        .eq("source", "booking_paid").maybeSingle()
      const { data: storno } = await admin.from("ping_points_transactions")
        .select("id").eq("ref_id", refId).eq("source", "booking_refund").maybeSingle()
      if (gutschrift && !storno) {
        await admin.from("ping_points_transactions").insert({
          player_id: user.id,
          amount: -(gutschrift.amount ?? 0),
          source: "booking_refund",
          description: "Storniert — Open Game",
          ref_id: refId,
        })
      }
    }

    // Mit PingPoints bezahlt? Dann die eingelösten Punkte zurückgeben
    // (idempotent über den redeem_ref).
    if ((mein.redeemed_points ?? 0) > 0 && mein.redeem_ref) {
      const { data: schon } = await admin.from("ping_points_transactions")
        .select("id").eq("ref_id", mein.redeem_ref).eq("source", "booking_redeem_refund").maybeSingle()
      if (!schon) {
        await admin.from("ping_points_transactions").insert({
          player_id: user.id,
          amount: mein.redeemed_points,
          source: "booking_redeem_refund",
          description: "Storniert — PingPoints zurück",
          ref_id: mein.redeem_ref,
        })
      }
    }
  }

  // Teilnahme entfernen
  const { error: delErr } = await admin.from("open_game_players").delete().eq("game_id", id).eq("user_id", user.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

  const { data: players } = await admin.from("open_game_players").select("user_id").eq("game_id", id).neq("status", "left")
  const count = (players || []).length
  await admin.from("open_games").update({
    current_players: count,
    status: "open",   // ein frei gewordener Platz ist wieder buchbar
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  return NextResponse.json({ ok: true, erstattet })
}
