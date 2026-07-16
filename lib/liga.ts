import type { SupabaseClient } from "@supabase/supabase-js"
import { berechneElo } from "@/lib/elo"

// Bestätigt ein Liga-Match (von p1_entered -> confirmed): ELO, Statistik,
// PingPoints und Chat-Feed. Wird von der manuellen Bestätigung UND der
// 48h-Auto-Bestätigung genutzt, damit die Logik nur einmal existiert.
// `admin` muss ein Service-Role-Client sein (umgeht RLS).
export async function applyLeagueConfirm(admin: SupabaseClient, matchId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: m } = await admin
    .from("league_matches")
    .select("id,season_id,p1_id,p2_id,winner_id,sets,status,ranked")
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

  // Spiel ohne Liga-Punkte (Freundschaftsspiel oder Gegner-Limit erreicht):
  // Ergebnis wird gespeichert und im Chat gezeigt, aber ELO/Statistik bleiben unberührt.
  const ranked = m.ranked !== false

  const { data: w } = ranked ? await admin.from("profiles").select("elo,matches_played,matches_won").eq("id", m.winner_id).single() : { data: null }
  const { data: l } = ranked ? await admin.from("profiles").select("elo,matches_played,matches_won").eq("id", loserId).single() : { data: null }
  if (ranked && w && l) {
    // Eine ELO-Rechnung für alles — berechneElo aus lib/elo.ts. Vorher stand die
    // Formel hier inline (eigenes K=32), mit dem Risiko, dass Liga, Open Game und
    // Turnier auseinanderlaufen. Genau das sollte die Zentralisierung verhindern.
    const wElo = w.elo ?? 1000, lElo = l.elo ?? 1000
    const { neuW: newW, neuL: newL } = berechneElo(wElo, lElo)
    await admin.from("profiles").update({ elo: newW, matches_played: (w.matches_played ?? 0) + 1, matches_won: (w.matches_won ?? 0) + 1 }).eq("id", m.winner_id)
    await admin.from("profiles").update({ elo: newL, matches_played: (l.matches_played ?? 0) + 1 }).eq("id", loserId)
    await admin.from("elo_history").insert([
      { player_id: m.winner_id, elo: newW, delta: newW - wElo, match_id: matchId, note: "liga" },
      { player_id: loserId, elo: newL, delta: newL - lElo, match_id: matchId, note: "liga" },
    ])
    // Keine PingPoints für Liga-Matches — PingPoints gibt es nur für
    // Turnier-Podest (1–3) und bezahlte Buchungen. Siehe PP_CONFIG in lib/rewards.ts.
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
  const payload = JSON.stringify({ winner: nameOf(m.winner_id), loser: nameOf(loserId), wSets, lSets, detail, ranked, pending: false })

  // Der Post steht schon seit dem Eintragen im Chat (als "wartet auf Bestätigung").
  // Jetzt wird er nur noch aktualisiert — sonst stünde dasselbe Spiel zweimal drin.
  const { data: vorhanden } = await admin
    .from("league_messages")
    .select("id")
    .eq("match_id", matchId)
    .eq("kind", "match")
    .maybeSingle()

  if (vorhanden) {
    await admin.from("league_messages").update({ text: payload }).eq("id", vorhanden.id)
  } else {
    await admin.from("league_messages").insert({
      season_id: m.season_id,
      user_id: null,
      kind: "match",
      match_id: matchId,
      text: payload,
    })
  }

  // Monats-Zuteilung abhaken, falls dieses Paar für den laufenden Monat
  // eingeteilt war. Nur gewertete Spiele zählen — ein Freundschaftsspiel
  // erfüllt die Zuteilung nicht.
  if (ranked) {
    const monat = new Date().toISOString().slice(0, 7)
    await admin.from("league_fixtures")
      .update({ status: "done", match_id: matchId, done_at: new Date().toISOString() })
      .eq("season_id", m.season_id)
      .eq("month", monat)
      .eq("status", "open")
      .or(`and(p1_id.eq.${m.p1_id},p2_id.eq.${m.p2_id}),and(p1_id.eq.${m.p2_id},p2_id.eq.${m.p1_id})`)
  }

  return { ok: true }
}
