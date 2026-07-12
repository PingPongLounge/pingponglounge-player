import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MAX_RANKED_PER_OPPONENT } from "@/lib/rewards"
import { NextRequest, NextResponse } from "next/server"

// Spielerprofil für das Popup in der Rangliste: Bilanz, Siegquote, letzte Spiele
// und der direkte Vergleich mit dem eingeloggten Spieler.
export const runtime = "nodejs"

type Match = {
  id: string
  p1_id: string
  p2_id: string
  winner_id: string | null
  sets: Array<{ p1: number; p2: number }> | null
  played_at: string | null
  ranked: boolean
  status: string
}

export async function GET(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const playerId = req.nextUrl.searchParams.get("id") || ""
  const seasonId = req.nextUrl.searchParams.get("season_id") || ""
  if (!playerId) return NextResponse.json({ error: "id fehlt" }, { status: 400 })

  const admin = createAdminClient()

  const { data: p } = await admin
    .from("public_profiles")
    .select("id,name,real_short,level,elo,matches_played,matches_won,canton,created_at")
    .eq("id", playerId)
    .maybeSingle()
  if (!p) return NextResponse.json({ error: "Spieler nicht gefunden" }, { status: 404 })

  // Letzte gewertete + ungewertete Spiele dieses Spielers
  const { data: raw } = await admin
    .from("league_matches")
    .select("id,p1_id,p2_id,winner_id,sets,played_at,ranked,status")
    .eq("status", "confirmed")
    .or(`p1_id.eq.${playerId},p2_id.eq.${playerId}`)
    .order("played_at", { ascending: false })
    .limit(10)

  const matches = (raw || []) as Match[]

  // Namen der Gegner nachladen
  const oppIds = [...new Set(matches.map(m => (m.p1_id === playerId ? m.p2_id : m.p1_id)))]
  const { data: opps } = oppIds.length
    ? await admin.from("public_profiles").select("id,name").in("id", oppIds)
    : { data: [] }
  const nameOf = (id: string) => (opps || []).find(o => o.id === id)?.name || "Spieler"

  const recent = matches.map(m => {
    const sets = m.sets || []
    const mine = m.p1_id === playerId
    const wSets = sets.filter(s => (mine ? s.p1 > s.p2 : s.p2 > s.p1)).length
    const lSets = sets.filter(s => (mine ? s.p2 > s.p1 : s.p1 > s.p2)).length
    return {
      id: m.id,
      opponent: nameOf(m.p1_id === playerId ? m.p2_id : m.p1_id),
      won: m.winner_id === playerId,
      score: `${wSets}:${lSets}`,
      date: m.played_at,
      ranked: m.ranked !== false,
    }
  })

  // Direkter Vergleich mit dem eingeloggten Spieler
  let head: { played: number; myWins: number; theirWins: number; rankedLeft: number } | null = null
  if (playerId !== user.id && seasonId) {
    const { data: h2h } = await admin
      .from("league_matches")
      .select("winner_id,ranked,status")
      .eq("season_id", seasonId)
      .in("status", ["p1_entered", "confirmed"])
      .or(`and(p1_id.eq.${user.id},p2_id.eq.${playerId}),and(p1_id.eq.${playerId},p2_id.eq.${user.id})`)

    const all = h2h || []
    const rankedCount = all.filter(m => m.ranked !== false).length
    head = {
      played: all.filter(m => m.status === "confirmed").length,
      myWins: all.filter(m => m.status === "confirmed" && m.winner_id === user.id).length,
      theirWins: all.filter(m => m.status === "confirmed" && m.winner_id === playerId).length,
      rankedLeft: Math.max(0, MAX_RANKED_PER_OPPONENT - rankedCount),
    }
  }

  const played = p.matches_played ?? 0
  const won = p.matches_won ?? 0

  return NextResponse.json({
    player: {
      ...p,
      lost: Math.max(0, played - won),
      winRate: played > 0 ? Math.round((won / played) * 100) : null,
    },
    recent,
    head,
    maxRanked: MAX_RANKED_PER_OPPONENT,
  })
}
