import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { PP_CONFIG } from "@/lib/rewards"

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
    // KRITISCH: ohne diese Prüfung liess sich ein bereits bestätigtes Match erneut
    // eintragen und bestätigen — das überschrieb den Bracket-Fortschritt, vergab
    // ELO doppelt und liess die Podest-PingPoints beliebig oft farmen.
    if (match.status === "confirmed")
      return NextResponse.json({ error: "Dieses Match ist bereits bestätigt" }, { status: 400 })

    if (!Array.isArray(sets) || sets.length === 0 || sets.length > 7)
      return NextResponse.json({ error: "Ungültige Satzzahl" }, { status: 400 })

    const parsed: Array<{ p1: number; p2: number }> = (sets as string[]).map(s => {
      const [a, b] = String(s).split(":").map(Number)
      return { p1: a, p2: b }
    })
    if (parsed.some(s => !Number.isFinite(s.p1) || !Number.isFinite(s.p2) || s.p1 < 0 || s.p2 < 0 || s.p1 > 30 || s.p2 > 30))
      return NextResponse.json({ error: "Ungültige Satzwerte" }, { status: 400 })
    if (parsed.length === 0) return NextResponse.json({ error: "Kein Resultat" }, { status: 400 })
    const p1wins = parsed.filter(s => s.p1 > s.p2).length
    const p2wins = parsed.filter(s => s.p2 > s.p1).length
    if (p1wins === p2wins) return NextResponse.json({ error: "Unentschieden ist nicht möglich" }, { status: 400 })
    const winner_id = p1wins > p2wins ? match.p1_id : match.p2_id
    await admin.from("tournament_matches").update({ sets: parsed, winner_id, status: "p1_entered", entered_by: user.id }).eq("id", match_id)
  }

  if (action === "confirm") {
    const { data: m } = await admin
      .from("tournament_matches")
      .select("winner_id,sets,round,match_number,tournament_id,status,p1_id,p2_id,entered_by")
      .eq("id", match_id)
      .single()
    if (!m || m.status !== "p1_entered") return NextResponse.json({ error: "Nichts zu bestätigen" }, { status: 400 })
    // Nur der Gegner darf bestätigen, nicht wer eingetragen hat
    if (m.entered_by === user.id) return NextResponse.json({ error: "Du kannst dein eigenes Ergebnis nicht bestätigen — das muss dein Gegner tun" }, { status: 403 })
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

      // PingPoints fürs Podest — NUR bei Turnieren, die für den Rang zählen.
      // Vorher wurden sie vor dieser Prüfung geschrieben: zwei Leute, ein
      // Spass-Turnier ohne Wertung, 100 PingPoints = zwei Gratis-Stunden Tisch.
      // Die Währung wäre am ersten Abend entwertet gewesen.
      const { data: tRank } = await admin
        .from("player_tournaments").select("counts_for_rank").eq("id", m.tournament_id).single()
      const { count: teilnehmer } = await admin
        .from("tournament_registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", m.tournament_id)

      // Und erst ab 4 Teilnehmern — ein Podest unter zwei Leuten ist keins.
      if (tRank?.counts_for_rank && (teilnehmer ?? 0) >= 4) {
        const [p1pp, p2pp, p3pp] = PP_CONFIG.tournamentPodium
        const finalLoser = m.winner_id === m.p1_id ? m.p2_id : m.p1_id
        const rows: Array<{ player_id: string; amount: number; source: string; description: string; ref_id: string }> = []
        if (m.winner_id) rows.push({ player_id: m.winner_id, amount: p1pp, source: "turnier_platz1", description: "Turniersieg — Platz 1", ref_id: m.tournament_id })
        if (finalLoser)  rows.push({ player_id: finalLoser,  amount: p2pp, source: "turnier_platz2", description: "Turnier — Platz 2", ref_id: m.tournament_id })

        // Platz 3: beide Halbfinal-Verlierer (Runde vor dem Finale)
        if (m.round > 1) {
          const { data: semis } = await admin
            .from("tournament_matches")
            .select("p1_id,p2_id,winner_id")
            .eq("tournament_id", m.tournament_id)
            .eq("round", m.round - 1)
            .eq("status", "confirmed")
          for (const s of semis || []) {
            const loser = s.winner_id === s.p1_id ? s.p2_id : s.p1_id
            if (loser) rows.push({ player_id: loser, amount: p3pp, source: "turnier_platz3", description: "Turnier — Platz 3", ref_id: m.tournament_id })
          }
        }
        if (rows.length) await admin.from("ping_points_transactions").insert(rows)
      }
    }

    // ELO + Statistik — nur wenn das Turnier für den Rang zählt.
    // PingPoints gibt es NICHT pro Match, sondern nur fürs Podest (siehe oben).
    if (m.winner_id && m.p1_id && m.p2_id) {
      const { data: t } = await admin.from("player_tournaments").select("counts_for_rank").eq("id", m.tournament_id).single()
      if (t?.counts_for_rank) {
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
            { player_id: m.winner_id, elo: newW, delta: newW - wElo, match_id, note: "turnier" },
            { player_id: loserId, elo: newL, delta: newL - lElo, match_id, note: "turnier" },
          ])
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
