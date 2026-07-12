import type { SupabaseClient } from "@supabase/supabase-js"

// Eine ELO-Berechnung für alles: Liga, Open Game, Turnier.
// Vorher stand dieselbe Formel dreimal im Code — mit dem Risiko, dass sie
// auseinanderläuft. K=32, Untergrenze 100.
const K = 32

export async function applyElo(
  admin: SupabaseClient,
  winnerId: string,
  loserId: string,
  note: string,
  matchId: string | null = null,
): Promise<{ ok: boolean; winnerElo?: number; loserElo?: number }> {
  const { data: w } = await admin.from("profiles").select("elo,matches_played,matches_won").eq("id", winnerId).single()
  const { data: l } = await admin.from("profiles").select("elo,matches_played,matches_won").eq("id", loserId).single()
  if (!w || !l) return { ok: false }

  const wElo = w.elo ?? 1000
  const lElo = l.elo ?? 1000
  const ea = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
  const gain = Math.round(K * (1 - ea))
  const newW = Math.max(100, wElo + gain)
  const newL = Math.max(100, lElo - gain)

  await admin.from("profiles").update({
    elo: newW,
    matches_played: (w.matches_played ?? 0) + 1,
    matches_won: (w.matches_won ?? 0) + 1,
  }).eq("id", winnerId)

  await admin.from("profiles").update({
    elo: newL,
    matches_played: (l.matches_played ?? 0) + 1,
  }).eq("id", loserId)

  await admin.from("elo_history").insert([
    { player_id: winnerId, elo: newW, delta: newW - wElo, match_id: matchId, note },
    { player_id: loserId,  elo: newL, delta: newL - lElo, match_id: matchId, note },
  ])

  return { ok: true, winnerElo: newW, loserElo: newL }
}

// Vorschau, ohne zu schreiben — für die E-Mail ("1350 → 1334")
export function eloPreview(myElo: number, oppElo: number, iWin: boolean): number {
  const wElo = iWin ? myElo : oppElo
  const lElo = iWin ? oppElo : myElo
  const ea = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
  const gain = Math.round(K * (1 - ea))
  return iWin ? Math.max(100, myElo + gain) : Math.max(100, myElo - gain)
}
