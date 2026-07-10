import { LIGA_CONFIG } from "@/lib/rewards"
import type { SupabaseClient } from "@supabase/supabase-js"

// Bestätigt ein Liga-Match (von p1_entered -> confirmed): ELO, Statistik,
// PingPoints und Chat-Feed. Wird von der manuellen Bestätigung UND der
// 48h-Auto-Bestätigung genutzt, damit die Logik nur einmal existiert.
// `admin` muss ein Service-Role-Client sein (umgeht RLS).
export async function applyLeagueConfirm(admin: SupabaseClient, matchId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: m } = await admin
    .from("league_matches")
    .select("id,season_id,p1_id,p2_id,winner_id,sets,status")
    .eq("id", matchId)
    .single()
  if (!m || m.status !== "p1_entered" || !m.winner_id) return { ok: false, reason: "not_pending" }

  // Status atomar setzen (verhindert Doppelwertung)
  const { data: upd } = await admin
    .from("league_matches")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("status", "p1_entered")
    .select("id")
    .single()
  if (!upd) return { ok: false, reason: "race" }

  const loserId = m.winner_id === m.p1_id ? m.p2_id : m.p1_id

  const { data: w } = await admin.from("profiles").select("elo,matches_played,matches_won").eq("id", m.winner_id).single()
  const { data: l } = await admin.from("profiles").select("elo,matches_played,matches_won").eq("id", loserId).single()
  if (w && l) {
    const K = 32
    const wElo = w.elo ?? 1000, lElo = l.elo ?? 1000
    const ea = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
    const newW = Math.max(100, Math.round(wElo + K * (1 - ea)))
    const newL = Math.max(100, Math.round(lElo - K * (1 - ea)))
    await admin.from("profiles").update({ elo: newW, matches_played: (w.matches_played ?? 0) + 1, matches_won: (w.matches_won ?? 0) + 1 }).eq("id", m.winner_id)
    await admin.from("profiles").update({ elo: newL, matches_played: (l.matches_played ?? 0) + 1 }).eq("id", loserId)
    await admin.from("elo_history").insert([
      { player_id: m.winner_id, elo: newW, delta: newW - wElo, match_id: matchId, note: "liga" },
      { player_id: loserId, elo: newL, delta: newL - lElo, match_id: matchId, note: "liga" },
    ])
    await admin.from("ping_points_transactions").insert([
      { player_id: m.winner_id, amount: 15, source: "liga_win", description: "Liga-Match gewonnen", ref_id: matchId },
      { player_id: loserId, amount: 5, source: "liga_played", description: "Liga-Match gespielt", ref_id: matchId },
    ])
    if (lElo - wElo >= LIGA_CONFIG.upsetEloDiff) {
      await admin.from("ping_points_transactions").insert({ player_id: m.winner_id, amount: LIGA_CONFIG.upsetPingPoints, source: "liga_upset", description: `Upset-Sieg (+${lElo - wElo} ELO)`, ref_id: matchId })
    }
  }

  // Chat-Feed: Match-Ergebnis automatisch als strukturierter Post
  const sets = (m.sets as Array<{ p1: number; p2: number }> | null) || []
  const p1w = sets.filter(s => s.p1 > s.p2).length
  const p2w = sets.filter(s => s.p2 > s.p1).length
  const wSets = m.winner_id === m.p1_id ? p1w : p2w
  const lSets = m.winner_id === m.p1_id ? p2w : p1w
  const detail = sets.map(s => `${s.p1}:${s.p2}`).join(" · ")
  const { data: names } = await admin.from("public_profiles").select("id,name").in("id", [m.winner_id, loserId])
  const nameOf = (id: string) => (names || []).find(n => n.id === id)?.name || "Spieler"
  await admin.from("league_messages").insert({
    season_id: m.season_id,
    user_id: null,
    kind: "match",
    match_id: matchId,
    text: JSON.stringify({ winner: nameOf(m.winner_id), loser: nameOf(loserId), wSets, lSets, detail }),
  })

  return { ok: true }
}
