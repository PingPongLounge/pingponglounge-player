import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { belegung, anzeigeStatus } from "@/lib/tournaments"
import { getRechte, darfStandort } from "@/lib/roles"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  const { data: t } = await sb
    .from("player_tournaments")
    .select("*")
    .eq("id", id)
    .single()
  if (!t) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  // Belegung/Status für die Anzeige auf beiden Plattformen — eine Quelle.
  const admin = createAdminClient()
  const b = await belegung(admin, id, t.max_players)
  const anzeige = anzeigeStatus(t, b)
  // Darf der eingeloggte Nutzer dieses Turnier verwalten?
  let canManage = false
  if (user) {
    const rechte = await getRechte(admin, user.id, user.email)
    canManage = darfStandort(rechte, t.location_id)
  }

  const { data: regsRaw } = await sb
    .from("tournament_registrations")
    .select("player_id,seed")
    .eq("tournament_id", id)
    .order("seed", { ascending: true, nullsFirst: false })

  const { data: matchesRaw } = await sb
    .from("tournament_matches")
    .select("id,round,match_number,p1_id,p2_id,winner_id,sets,status")
    .eq("tournament_id", id)
    .order("round")
    .order("match_number")

  // Namen sicher über public_profiles (kein E-Mail-Leak) nachladen und einsetzen
  const ids = new Set<string>()
  ;(regsRaw || []).forEach(r => { if (r.player_id) ids.add(r.player_id) })
  ;(matchesRaw || []).forEach(m => { if (m.p1_id) ids.add(m.p1_id); if (m.p2_id) ids.add(m.p2_id) })

  const profMap: Record<string, { name: string; elo: number; level: string }> = {}
  if (ids.size > 0) {
    const { data: profs } = await sb
      .from("public_profiles")
      .select("id,name,elo,level")
      .in("id", [...ids])
    ;(profs || []).forEach(p => { profMap[p.id] = { name: p.name, elo: p.elo, level: p.level } })
  }

  const registrations = (regsRaw || []).map(r => ({
    player_id: r.player_id,
    seed: r.seed,
    profiles: profMap[r.player_id] || null,
  }))

  const matches = (matchesRaw || []).map(m => ({
    ...m,
    p1: m.p1_id ? profMap[m.p1_id] || null : null,
    p2: m.p2_id ? profMap[m.p2_id] || null : null,
  }))

  const isRegistered = user ? registrations.some(r => r.player_id === user.id) : false
  const myMatch = user ? matches.find(m =>
    (m.p1_id === user.id || m.p2_id === user.id) && m.status === "p1_entered"
  ) : null

  return NextResponse.json({ tournament: t, registrations, matches, isRegistered, myMatch, userId: user?.id, capacity: b, displayStatus: anzeige, canManage })
}
