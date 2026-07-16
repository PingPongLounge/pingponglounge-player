import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Aktuelle Serie des eingeloggten Spielers: nimmt die jüngsten bestätigten,
// gewerteten Liga-Spiele und zählt, wie viele davon am Stück gleich ausgingen.
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ won: false, streak: 0 })

  const { data: ms } = await sb
    .from("league_matches")
    .select("winner_id,confirmed_at,played_at")
    .eq("status", "confirmed")
    .eq("ranked", true)
    .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    .order("confirmed_at", { ascending: false })
    .limit(15)

  const list = ms || []
  if (list.length === 0) return NextResponse.json({ won: false, streak: 0 })

  const lastWon = list[0].winner_id === user.id
  let streak = 0
  for (const m of list) {
    const won = m.winner_id === user.id
    if (won === lastWon) streak++
    else break
  }
  return NextResponse.json({ won: lastWon, streak })
}
