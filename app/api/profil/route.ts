import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Profil
  const { data: profile } = await sb
    .from("profiles")
    .select("id,name,real_name,elo,level,matches_played,matches_won,canton,created_at,avatar_url,home_location,handedness,pips,anti,blade,rubber_fh,rubber_bh,player_category")
    .eq("id", user.id)
    .single()

  // ELO-History (letzte 20 Einträge für Chart)
  const { data: eloHistory } = await sb
    .from("elo_history")
    .select("elo,delta,created_at")
    .eq("player_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20)

  // Letzte 5 Matches für Profil-Vorschau
  const { data: recentMatches } = await sb
    .from("league_matches")
    .select(`
      id,sets,winner_id,confirmed_at,season_id,
      p1_id,p2_id,
      p1:profiles!league_matches_p1_id_fkey(name),
      p2:profiles!league_matches_p2_id_fkey(name),
      season:league_seasons!league_matches_season_id_fkey(name,city)
    `)
    .eq("status", "confirmed")
    .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    .order("confirmed_at", { ascending: false })
    .limit(5)

  return NextResponse.json({ profile, eloHistory: eloHistory || [], recentMatches: recentMatches || [] })
}