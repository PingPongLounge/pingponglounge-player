import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stornoMoeglich, OG_STORNO_STUNDEN } from "@/lib/opengames"
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
    .select("id,paid,stripe_payment_intent,refunded_at")
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
