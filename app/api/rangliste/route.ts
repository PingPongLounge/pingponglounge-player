import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const sb = await createClient()
  const canton = req.nextUrl.searchParams.get("canton")

  let query = sb
    .from("profiles")
    .select("id,name,elo,level,matches_played,matches_won,canton")
    .gt("matches_played", 0)   // nur Spieler die schon gespielt haben
    .order("elo", { ascending: false })
    .limit(100)

  if (canton) query = query.eq("canton", canton)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Rang berechnen
  const ranked = (data || []).map((p, i) => ({ ...p, rank: i + 1 }))
  return NextResponse.json({ players: ranked })
}