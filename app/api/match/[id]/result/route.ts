import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyElo, eloPreview } from "@/lib/elo"
import { sendResultConfirmRequest } from "@/lib/email"
import { signAction } from "@/lib/token"
import { MAX_RANKED_PER_OPPONENT } from "@/lib/rewards"
import { NextRequest, NextResponse } from "next/server"

// Ergebnis eines Open Games eintragen und bestätigen.
// Bisher fehlte das komplett — die App versprach "Resultat erfassen, dein Rang
// steigt", ein Open Game konnte aber nie enden und gab nie ELO.
export const runtime = "nodejs"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, my_sets, opp_sets } = await req.json()
  const admin = createAdminClient()

  const { data: game } = await admin
    .from("open_games")
    .select("id,status,max_players,winner_id,entered_by,sets,date")
    .eq("id", id)
    .maybeSingle()
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })

  // Teilnehmer laden
  const { data: players } = await admin
    .from("open_game_players")
    .select("user_id")
    .eq("game_id", id)
    .neq("status", "left")
  const ids = (players || []).map(p => p.user_id)
  if (!ids.includes(user.id)) return NextResponse.json({ error: "Du bist bei diesem Spiel nicht dabei" }, { status: 403 })

  // Ergebnisse nur für Einzel (2 Spieler) — bei 3–4 Spielern ist unklar, wer gegen wen spielte
  if (ids.length !== 2) {
    return NextResponse.json({ error: "Ergebnisse lassen sich nur bei Spielen zu zweit eintragen" }, { status: 400 })
  }
  const opponentId = ids.find(i => i !== user.id)!

  // ── Eintragen ─────────────────────────────────────────────────────────────
  if (action === "enter") {
    if (!["open", "full"].includes(game.status))
      return NextResponse.json({ error: "Für dieses Spiel kann kein Ergebnis mehr eingetragen werden" }, { status: 400 })

    // Ein Spiel, das erst in der Zukunft stattfindet, kann noch nicht gespielt sein.
    const heute = new Date().toISOString().slice(0, 10)
    if (game.date && game.date > heute)
      return NextResponse.json({ error: "Dieses Spiel findet erst später statt" }, { status: 400 })

    // Gegner-Limit wie in der Liga: max. 5 gewertete Open Games gegen denselben
    // Gegner pro 90 Tagen. Ohne das wäre die Rangliste über Open Games frei
    // manipulierbar (zwei Kollegen tragen sich gegenseitig beliebig oft Siege ein),
    // während sie in der Liga geschützt ist.
    const seit = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
    const { data: vorherige } = await admin
      .from("open_games")
      .select("id, open_game_players!inner(user_id)")
      .eq("status", "confirmed")
      .gte("confirmed_at", seit)
    const gegenIhn = (vorherige || []).filter(g => {
      const uids = (g.open_game_players as unknown as Array<{ user_id: string }>).map(p => p.user_id)
      return uids.includes(user.id) && uids.includes(opponentId) && uids.length === 2
    }).length
    if (gegenIhn >= MAX_RANKED_PER_OPPONENT) {
      return NextResponse.json({
        error: `Ihr habt in den letzten 90 Tagen schon ${MAX_RANKED_PER_OPPONENT} gewertete Open Games gegeneinander gespielt. Weitere zählen nicht mehr für ELO — trag das Ergebnis in der Liga ein.`,
      }, { status: 400 })
    }

    const my = Number(my_sets), opp = Number(opp_sets)
    if (!Number.isInteger(my) || !Number.isInteger(opp) || my < 0 || opp < 0 || my > 7 || opp > 7)
      return NextResponse.json({ error: "Ungültiges Ergebnis" }, { status: 400 })
    if (my === opp) return NextResponse.json({ error: "Kein Unentschieden möglich" }, { status: 400 })

    const sets = [...Array(my)].map(() => ({ p1: 11, p2: 7 })).concat([...Array(opp)].map(() => ({ p1: 7, p2: 11 })))
    const winner_id = my > opp ? user.id : opponentId

    const { error } = await admin.from("open_games").update({
      sets, winner_id, entered_by: user.id,
      status: "p1_entered",
      entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Gegner per Mail zur Bestätigung auffordern (gleicher Ablauf wie in der Liga)
    try {
      const { data: authOpp } = await admin.auth.admin.getUserById(opponentId)
      const oppEmail = authOpp?.user?.email
      const { data: profs } = await admin.from("profiles").select("id,name,elo").in("id", [user.id, opponentId])
      const me = (profs || []).find(p => p.id === user.id)
      const opp2 = (profs || []).find(p => p.id === opponentId)

      if (oppEmail && opp2) {
        const oppWon = winner_id === opponentId
        const oppElo = opp2.elo ?? 1000
        const after = eloPreview(oppElo, me?.elo ?? 1000, oppWon)
        const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).gt("elo", oppElo)

        const t = signAction("confirm-game", id, opponentId)
        await sendResultConfirmRequest({
          to: oppEmail,
          opponentName: me?.name || "Dein Gegner",
          recipientName: opp2.name || "Spieler",
          scoreLine: `${opp}:${my}`,
          won: oppWon,
          playedLabel: game.date ? new Date(game.date).toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "eurem Open Game",
          matchId: id,
          eloNow: oppElo,
          eloAfter: after,
          rankNow: typeof count === "number" ? count + 1 : null,
          confirmUrl: `${BASE_URL}/api/liga/confirm-email?g=${id}&p=${opponentId}&t=${t}`,
        })
      }
    } catch (e) {
      console.error("Bestätigungs-Mail (Open Game) fehlgeschlagen:", e)
    }

    return NextResponse.json({ ok: true })
  }

  // ── Bestätigen ────────────────────────────────────────────────────────────
  if (action === "confirm") {
    if (game.status !== "p1_entered" || !game.winner_id)
      return NextResponse.json({ error: "Für dieses Spiel liegt kein Ergebnis vor" }, { status: 400 })
    if (game.entered_by === user.id)
      return NextResponse.json({ error: "Du kannst dein eigenes Ergebnis nicht bestätigen — das muss dein Gegner tun" }, { status: 403 })

    // Atomar werten (verhindert Doppelwertung bei Doppelklick)
    const { data: upd } = await admin.from("open_games")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "p1_entered")
      .select("id")
      .maybeSingle()
    if (!upd) return NextResponse.json({ error: "Bereits gewertet" }, { status: 400 })

    const loserId = game.winner_id === ids[0] ? ids[1] : ids[0]
    await applyElo(admin, game.winner_id, loserId, "open_game", null)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 })
}
