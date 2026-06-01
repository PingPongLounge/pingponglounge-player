import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
export async function POST(req: NextRequest) {
  const { match_id, sets, winner_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: match } = await sb.from("league_matches").select("p1_id,p2_id,status").eq("id", match_id).single()
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.status !== "pending") return NextResponse.json({ error: "Match bereits eingereicht" }, { status: 400 })
  if (match.p1_id !== user.id && match.p2_id !== user.id) return NextResponse.json({ error: "Kein Teilnehmer" }, { status: 403 })
  await sb.from("league_matches").update({ sets, winner_id, status: "p1_entered", played_at: new Date().toISOString() }).eq("id", match_id)
  return NextResponse.json({ ok: true })
}