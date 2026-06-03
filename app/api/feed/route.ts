import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()

  const { data, error } = await sb
    .from("league_matches")
    .select(`
      id,
      round,
      sets,
      winner_id,
      played_at,
      confirmed_at,
      season_id,
      p1_id,
      p2_id,
      p1:profiles!league_matches_p1_id_fkey(id, name, elo),
      p2:profiles!league_matches_p2_id_fkey(id, name, elo),
      season:league_seasons!league_matches_season_id_fkey(name, city, skill_class),
      match_reactions(type, user_id)
    `)
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data || [] })
}