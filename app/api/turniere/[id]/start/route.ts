import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// Standard-Setzliste: verteilt starke Spieler in verschiedene Baumhälften ("gemischt")
function seedOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const sum = order.length * 2 + 1
    const next: number[] = []
    for (const s of order) { next.push(s); next.push(sum - s) }
    order = next
  }
  return order
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: t } = await sb.from("player_tournaments").select("status,created_by").eq("id", id).single()
  if (!t) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (t.created_by !== user.id) return NextResponse.json({ error: "Nur der Ersteller kann starten" }, { status: 403 })
  if (t.status !== "open") return NextResponse.json({ error: "Turnier ist nicht mehr offen" }, { status: 400 })

  // Anmeldungen + ELO laden, nach ELO sortieren (Setzliste)
  const { data: regs } = await sb.from("tournament_registrations").select("player_id").eq("tournament_id", id)
  const playerIds = (regs || []).map(r => r.player_id)
  if (playerIds.length < 2) return NextResponse.json({ error: "Mindestens 2 Spieler nötig" }, { status: 400 })

  const { data: profs } = await sb.from("public_profiles").select("id,elo").in("id", playerIds)
  const eloMap: Record<string, number> = {}
  ;(profs || []).forEach(p => { eloMap[p.id] = p.elo ?? 1000 })
  const seeded = [...playerIds].sort((a, b) => (eloMap[b] ?? 1000) - (eloMap[a] ?? 1000))

  const playerCount = seeded.length
  let size = 2
  while (size < playerCount) size *= 2
  const rounds = Math.log2(size)
  const order = seedOrder(size)
  const playerAtSlot = (slot: number): string | null => {
    const seed = order[slot]
    return seed <= playerCount ? seeded[seed - 1] : null
  }

  const admin = createAdminClient()

  // Setzliste in Registrierungen schreiben (seed = Rang nach ELO)
  for (let i = 0; i < seeded.length; i++) {
    await admin.from("tournament_registrations").update({ seed: i + 1 }).eq("tournament_id", id).eq("player_id", seeded[i])
  }

  // Bracket im Speicher aufbauen
  type M = { p1: string | null; p2: string | null; winner: string | null; status: string }
  const bracket: M[][] = []

  // Runde 1
  const r1: M[] = []
  for (let k = 0; k < size / 2; k++) {
    const p1 = playerAtSlot(2 * k)
    const p2 = playerAtSlot(2 * k + 1)
    let winner: string | null = null
    let status = "pending"
    if (p1 && !p2) { winner = p1; status = "confirmed" }      // Freilos
    else if (p2 && !p1) { winner = p2; status = "confirmed" } // Freilos
    r1.push({ p1, p2, winner, status })
  }
  bracket.push(r1)

  // Folgerunden: Gewinner aus Freilosen direkt setzen, sonst offen
  for (let r = 1; r < rounds; r++) {
    const prev = bracket[r - 1]
    const cur: M[] = []
    for (let j = 0; j < prev.length / 2; j++) {
      const p1 = prev[2 * j].status === "confirmed" ? prev[2 * j].winner : null
      const p2 = prev[2 * j + 1].status === "confirmed" ? prev[2 * j + 1].winner : null
      cur.push({ p1, p2, winner: null, status: "pending" })
    }
    bracket.push(cur)
  }

  // Matches einfügen
  const rows: Array<{ tournament_id: string; round: number; match_number: number; p1_id: string | null; p2_id: string | null; winner_id: string | null; status: string }> = []
  bracket.forEach((roundMatches, ri) => {
    roundMatches.forEach((m, mi) => {
      rows.push({
        tournament_id: id,
        round: ri + 1,
        match_number: mi + 1,
        p1_id: m.p1,
        p2_id: m.p2,
        winner_id: m.winner,
        status: m.status,
      })
    })
  })

  // Alte (evtl. vorhandene) Matches entfernen, dann neu anlegen
  await admin.from("tournament_matches").delete().eq("tournament_id", id)
  const { error: insErr } = await admin.from("tournament_matches").insert(rows)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  await admin.from("player_tournaments").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", id)

  return NextResponse.json({ ok: true })
}
