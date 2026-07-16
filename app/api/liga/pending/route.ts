import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Offene Ergebnisse, die auf die Bestätigung des eingeloggten Spielers warten.
// Das ist die Grundlage für den Hinweis oben ("Ergebnis wartet auf dich") und
// das Badge im Menü. Bewusst schlank: nur was der Banner braucht.
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ count: 0, items: [] })

  const { data: ms } = await sb
    .from("league_matches")
    .select("id,p1_id,p2_id,sets,winner_id,entered_by,entered_at")
    .eq("status", "p1_entered")
    .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)

  // Nur Spiele, die ICH bestätigen muss — also die ein ANDERER eingetragen hat.
  const mine = (ms || []).filter(m => m.entered_by && m.entered_by !== user.id)
  if (mine.length === 0) return NextResponse.json({ count: 0, items: [] })

  const oppIds = Array.from(new Set(mine.map(m => (m.p1_id === user.id ? m.p2_id : m.p1_id))))
  const { data: profs } = await sb.from("public_profiles").select("id,name").in("id", oppIds)
  const nameOf = (id: string) => (profs || []).find(p => p.id === id)?.name || "Spieler"

  const items = mine.map(m => {
    const oppId = m.p1_id === user.id ? m.p2_id : m.p1_id
    const sets = (m.sets as Array<{ p1: number; p2: number }> | null) || []
    // Score aus MEINER Sicht: bin ich p1 oder p2?
    const iAmP1 = m.p1_id === user.id
    const myWins = sets.filter(s => (iAmP1 ? s.p1 > s.p2 : s.p2 > s.p1)).length
    const oppWins = sets.length - myWins
    return {
      id: m.id,
      opponent: nameOf(oppId),
      scoreLine: `${myWins}:${oppWins}`,
      iWon: m.winner_id === user.id,
    }
  })

  return NextResponse.json({ count: items.length, items })
}
