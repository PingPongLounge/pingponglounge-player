import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { match_id, sets, action } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb
    .from("tournament_matches")
    .select("p1_id,p2_id,status,tournament_id")
    .eq("id", match_id)
    .single()
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.tournament_id !== id) return NextResponse.json({ error: "Ungültig" }, { status: 400 })
  if (match.p1_id !== user.id && match.p2_id !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  // Schreiben über Service-Role (Bracket-Fortschritt schreibt in Zeilen, in denen der User noch nicht Teilnehmer ist)
  const admin = createAdminClient()

  if (action === "enter") {
    const parsed: Array<{ p1: number; p2: number }> = (sets as string[]).map(s => {
      const [a, b] = s.split(":").map(Number)
      return { p1: a, p2: b }
    })
    if (parsed.length === 0) return NextResponse.json({ error: "Kein Resultat" }, { status: 400 })
    const p1wins = parsed.filter(s => s.p1 > s.p2).length
    const p2wins = parsed.filter(s => s.p2 > s.p1).length
    if (p1wins === p2wins) return NextResponse.json({ error: "Unentschieden ist nicht möglich" }, { status: 400 })
    const winner_id = p1wins > p2wins ? match.p1_id : match.p2_id
    await admin.from("tournament_matches").update({ sets: parsed, winner_id, status: "p1_entered" }).eq("id", match_id)
  }

  if (action === "confirm") {
    const { data: m } = await admin
      .from("tournament_matches")
      .select("winner_id,sets,round,match_number,tournament_id,status,p1_id,p2_id")
      .eq("id", match_id)
      .single()
    if (!m || m.status !== "p1_entered") return NextResponse.json({ error: "Nichts zu bestätigen" }, { status: 400 })
    await admin.from("tournament_matches").update({ status: "confirmed" }).eq("id", match_id)

    // Gewinner in nächste Runde setzen
    const nextMatchNum = Math.ceil(m.match_number / 2)
    const isFirstSlot = m.match_number % 2 !== 0
    const { data: nextMatch } = await admin
      .from("tournament_matches")
      .select("id,p1_id,p2_id")
      .eq("tournament_id", m.tournament_id)
      .eq("round", m.round + 1)
      .eq("match_number", nextMatchNum)
      .maybeSingle()
    if (nextMatch) {
      if (isFirstSlot) await admin.from("tournament_matches").update({ p1_id: m.winner_id }).eq("id", nextMatch.id)
      else await admin.from("tournament_matches").update({ p2_id: m.winner_id }).eq("id", nextMatch.id)
    } else {
      // Kein nächstes Match -> das war das Finale: Champion + Turnier beendet
      await admin.from("player_tournaments").update({ status: "finished", champion_id: m.winner_id, updated_at: new Date().toISOString() }).eq("id", m.tournament_id)
    }
  }

  return NextResponse.json({ ok: true })
}
