import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { season_id, challenged_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.id === challenged_id)
    return NextResponse.json({ error: "Kannst du nicht" }, { status: 400 })

  // Beide müssen angemeldet sein
  const { data: regs } = await sb.from("league_registrations")
    .select("player_id").eq("season_id", season_id)
    .in("player_id", [user.id, challenged_id])
  if (!regs || regs.length < 2)
    return NextResponse.json({ error: "Spieler nicht angemeldet" }, { status: 400 })

  // Kein doppelter offener Challenge
  const { data: existing } = await sb.from("league_matches")
    .select("id").eq("season_id", season_id)
    .in("status", ["challenge_sent", "pending", "p1_entered"])
    .or(`and(p1_id.eq.${user.id},p2_id.eq.${challenged_id}),and(p1_id.eq.${challenged_id},p2_id.eq.${user.id})`)
    .maybeSingle()
  if (existing)
    return NextResponse.json({ error: "Bereits ein offenes Match" }, { status: 400 })

  const { data, error } = await sb.from("league_matches").insert({
    season_id, p1_id: user.id, p2_id: challenged_id,
    status: "challenge_sent", round: 0,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}