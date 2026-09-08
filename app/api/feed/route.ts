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
      season:league_seasons!league_matches_season_id_fkey(name, city, skill_class),
      match_reactions(type, user_id)
    `)
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  /* 08.09.2026: Vorher standen hier eingebettete Joins auf "profiles".
     Deren RLS erlaubt nur die eigene Zeile — im Feed hatte also JEDE
     Zeile zwei namenlose Spieler, ausser der eigenen. public_profiles
     ist die Sicht, die genau dafuer existiert. */
  const zeilen = (data || []) as unknown as Array<{ p1_id: string; p2_id: string }>
  const ids = [...new Set(zeilen.flatMap(m => [m.p1_id, m.p2_id]))]
  const { data: leute } = ids.length
    ? await sb.from("public_profiles").select("id,name,elo").in("id", ids)
    : { data: [] as Array<{ id: string; name: string; elo: number | null }> }
  const person = (id: string) => (leute || []).find(p => p.id === id) || { id, name: "Spieler", elo: null }


  // Form beibehalten (p1/p2 als Objekt), damit der Feed unveraendert laeuft.
  const matches = (data || []).map(m => {
    const z = m as unknown as { p1_id: string; p2_id: string }
    return { ...m, p1: person(z.p1_id), p2: person(z.p2_id) }
  })
  return NextResponse.json({ matches })
}