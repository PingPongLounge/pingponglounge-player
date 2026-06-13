import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { match_id, sets, winner_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb
    .from("league_matches")
    .select("p1_id,p2_id,status")
    .eq("id", match_id)
    .single()

  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.status !== "pending" && match.status !== "challenge_sent" && match.status !== "accepted")
    return NextResponse.json({ error: "Match bereits eingereicht" }, { status: 400 })
  if (match.p1_id !== user.id && match.p2_id !== user.id)
    return NextResponse.json({ error: "Kein Teilnehmer" }, { status: 403 })

  // winner_id muss p1 oder p2 sein
  if (winner_id !== match.p1_id && winner_id !== match.p2_id)
    return NextResponse.json({ error: "Ungültige winner_id" }, { status: 400 })

  // Sets-Validierung: muss Array von {p1,p2} sein
  if (!Array.isArray(sets) || sets.length === 0 || sets.length > 7)
    return NextResponse.json({ error: "Ungültige Satzzahl" }, { status: 400 })
  for (const s of sets) {
    if (typeof s.p1 !== "number" || typeof s.p2 !== "number" || s.p1 < 0 || s.p2 < 0 || s.p1 > 30 || s.p2 > 30)
      return NextResponse.json({ error: "Ungültige Satzwerte" }, { status: 400 })
  }

  await sb.from("league_matches").update({
    sets,
    winner_id,
    status: "p1_entered",
    played_at: new Date().toISOString(),
    entered_by: user.id,       // für Confirm-Validierung
  }).eq("id", match_id)

  return NextResponse.json({ ok: true })
}