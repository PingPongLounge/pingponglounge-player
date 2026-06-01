import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: match } = await sb.from("league_matches").select("p1_id,p2_id,status,winner_id,sets,season_id").eq("id", match_id).single()
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.p2_id !== user.id && match.p1_id !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  if (match.status !== "p1_entered") return NextResponse.json({ error: "Nichts zu bestätigen" }, { status: 400 })
  await sb.from("league_matches").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", match_id)
  // ELO update
  if (match.winner_id && match.sets) {
    const loserId = match.winner_id === match.p1_id ? match.p2_id : match.p1_id
    const { data: winner } = await sb.from("profiles").select("elo").eq("id", match.winner_id).single()
    const { data: loser } = await sb.from("profiles").select("elo").eq("id", loserId).single()
    if (winner && loser) {
      const K = 32
      const ea = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400))
      const eb = 1 - ea
      await sb.from("profiles").update({ elo: Math.round(winner.elo + K * (1 - ea)) }).eq("id", match.winner_id)
      await sb.from("profiles").update({ elo: Math.round(loser.elo + K * (0 - eb)) }).eq("id", loserId)
    }
  }
  return NextResponse.json({ ok: true })
}