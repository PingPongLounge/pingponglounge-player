import { createClient } from "@/lib/supabase/server"
import { LIGA_CONFIG } from "@/lib/rewards"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb
    .from("league_matches")
    .select("p1_id,p2_id,status,winner_id,sets,season_id")
    .eq("id", match_id)
    .single()

  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.p2_id !== user.id && match.p1_id !== user.id)
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  if (match.status !== "p1_entered")
    return NextResponse.json({ error: "Nichts zu bestätigen" }, { status: 400 })

  const { data: updated } = await sb.from("league_matches")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", match_id)
    .eq("status", "p1_entered")
    .select("id")
    .single()
  if (!updated) return NextResponse.json({ ok: true }) // idempotent

  if (match.winner_id && match.sets) {
    const loserId = match.winner_id === match.p1_id ? match.p2_id : match.p1_id

    const { data: winner } = await sb.from("profiles").select("elo,matches_played,matches_won").eq("id", match.winner_id).single()
    const { data: loser }  = await sb.from("profiles").select("elo,matches_played,matches_won").eq("id", loserId).single()

    if (winner && loser) {
      const K = 32
      const wElo = winner.elo ?? 1000, lElo = loser.elo ?? 1000
      const ea = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
      const newWElo = Math.max(100, Math.round(wElo + K * (1 - ea)))
      const newLElo = Math.max(100, Math.round(lElo + K * (0 - (1 - ea))))

      await sb.from("profiles").update({ elo: newWElo, matches_played: (winner.matches_played ?? 0) + 1, matches_won: (winner.matches_won ?? 0) + 1 }).eq("id", match.winner_id)
      await sb.from("profiles").update({ elo: newLElo, matches_played: (loser.matches_played ?? 0) + 1 }).eq("id", loserId)

      await sb.from("elo_history").insert([
        { player_id: match.winner_id, elo: newWElo, delta: newWElo - wElo, match_id },
        { player_id: loserId, elo: newLElo, delta: newLElo - lElo, match_id },
      ])

      // PingPoints vergeben
      await sb.from("ping_points_transactions").insert([
        { player_id: match.winner_id, amount: 15, source: "liga_win",    description: "Liga-Match gewonnen",  ref_id: match_id },
        { player_id: loserId,         amount: 5,  source: "liga_played", description: "Liga-Match gespielt",  ref_id: match_id },
      ])
      // Upset-Bonus
      if (lElo - wElo >= LIGA_CONFIG.upsetEloDiff) {
        await sb.from("ping_points_transactions").insert({
          player_id: match.winner_id, amount: LIGA_CONFIG.upsetPingPoints,
          source: "liga_upset", description: `Upset-Sieg (+${lElo - wElo} ELO)`, ref_id: match_id
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}