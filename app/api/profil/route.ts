import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Profil
  const { data: profile } = await sb
    .from("profiles")
    .select("id,name,real_name,elo,level,matches_played,matches_won,canton,created_at,avatar_url,home_location,handedness,pips,anti,blade,rubber_fh,rubber_bh,player_category,allow_challenges,allow_friend_requests,visible_in_ranking")
    .eq("id", user.id)
    .single()

  // ELO-History (letzte 20 Einträge für Chart)
  const { data: eloHistory } = await sb
    .from("elo_history")
    .select("elo,delta,created_at")
    .eq("player_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20)

  /* Letzte 5 Matches fuer die Profil-Vorschau.

     08.09.2026: Hier stand ein eingebetteter Join auf "profiles" fuer p1
     und p2. Der konnte nie funktionieren: auf profiles greift RLS mit
     "auth.uid() = id" — man liest ausschliesslich die eigene Zeile. Der
     Join lieferte fuer den GEGNER also immer null, und im Profil stand
     "vs." ohne Namen. Aufgefallen ist es niemandem, weil der eigene Name
     ja kam.

     Die Namen kommen jetzt aus public_profiles — der Sicht, die genau
     dafuer da ist und die der Rest der App ohnehin benutzt. */
  const { data: recentMatches } = await sb
    .from("league_matches")
    .select(`
      id,sets,winner_id,confirmed_at,season_id,
      p1_id,p2_id,
      season:league_seasons!league_matches_season_id_fkey(name,city)
    `)
    .eq("status", "confirmed")
    .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    .order("confirmed_at", { ascending: false })
    .limit(5)

  type Zeile = { p1_id: string; p2_id: string }
  const roh = (recentMatches || []) as unknown as Zeile[]
  const gegnerIds = [...new Set(roh.map(m => (m.p1_id === user.id ? m.p2_id : m.p1_id)))]
  const { data: gegner } = gegnerIds.length
    ? await sb.from("public_profiles").select("id,name,avatar_url").in("id", gegnerIds)
    : { data: [] as Array<{ id: string; name: string; avatar_url: string | null }> }
  const nameVon = (id: string) => (gegner || []).find(g => g.id === id)?.name || null
  const bildVon = (id: string) => (gegner || []).find(g => g.id === id)?.avatar_url || null

  // Form beibehalten (p1/p2 als Objekt mit name), damit die Seiten
  // unveraendert weiterlaufen — nur gefuellt statt leer.
  const angereichert = roh.map(m => ({
    ...m,
    p1: { name: m.p1_id === user.id ? (profile?.name || "Du") : (nameVon(m.p1_id) || "Spieler") },
    p2: { name: m.p2_id === user.id ? (profile?.name || "Du") : (nameVon(m.p2_id) || "Spieler") },
    gegnerAvatar: bildVon(m.p1_id === user.id ? m.p2_id : m.p1_id),
  }))

  return NextResponse.json({ profile, eloHistory: eloHistory || [], recentMatches: angereichert })
}