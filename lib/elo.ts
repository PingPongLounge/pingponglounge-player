import type { SupabaseClient } from "@supabase/supabase-js"

// Eine ELO-Berechnung für alles: Liga, Open Game, Turnier.
// Vorher stand dieselbe Formel dreimal im Code — mit dem Risiko, dass sie
// auseinanderläuft. K=32, Untergrenze 100.
export const K = 32
export const ELO_FLOOR = 100

/**
 * Die reine Rechnung — ohne Datenbank, deshalb testbar.
 * Vorher steckte sie mitten in applyElo() und liess sich nur mit einer echten
 * Supabase-Verbindung prüfen. Genau solche Stellen bleiben ungetestet.
 */
export function berechneElo(wElo: number, lElo: number): { neuW: number; neuL: number; gain: number } {
  const ea = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
  const gain = Math.round(K * (1 - ea))
  return {
    gain,
    neuW: Math.max(ELO_FLOOR, wElo + gain),
    neuL: Math.max(ELO_FLOOR, lElo - gain),
  }
}

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
  const { neuW: newW, neuL: newL } = berechneElo(wElo, lElo)

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
  const { neuW, neuL } = iWin ? berechneElo(myElo, oppElo) : berechneElo(oppElo, myElo)
  return iWin ? neuW : neuL
}
