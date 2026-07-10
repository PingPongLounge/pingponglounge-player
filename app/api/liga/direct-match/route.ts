import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// Erstellt ein neues Match direkt im Status "accepted" zwischen dem eingeloggten
// Spieler und einem Gegner innerhalb derselben Liga-Saison.
// Wird verwendet für „Weiteres Spiel eintragen" nach einem abgeschlossenen Match.
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { season_id, opponent_id } = await req.json()
  if (!season_id || !opponent_id) return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 })

  const admin = createAdminClient()

  // Beide Spieler müssen in der Saison registriert sein
  const { data: regs } = await admin
    .from("league_registrations")
    .select("player_id")
    .eq("season_id", season_id)
    .in("player_id", [user.id, opponent_id])

  const regIds = (regs || []).map(r => r.player_id)
  if (!regIds.includes(user.id) || !regIds.includes(opponent_id)) {
    return NextResponse.json({ error: "Spieler nicht in dieser Saison registriert" }, { status: 403 })
  }

  // Kein offenes Match zwischen diesen zwei Spielern?
  const { data: existing } = await admin
    .from("league_matches")
    .select("id,status")
    .eq("season_id", season_id)
    .in("status", ["challenge_sent", "accepted", "pending", "p1_entered"])
    .or(`and(p1_id.eq.${user.id},p2_id.eq.${opponent_id}),and(p1_id.eq.${opponent_id},p2_id.eq.${user.id})`)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "Es gibt bereits ein offenes Match mit diesem Spieler", existing_id: existing.id }, { status: 409 })
  }

  // Aktuelle Runde der Saison ermitteln
  const { data: season } = await admin
    .from("league_seasons")
    .select("current_round")
    .eq("id", season_id)
    .single()

  const round = season?.current_round ?? 1

  // Match direkt in "accepted" erstellen (beide haben bereits gespielt → kein Challenge-Flow nötig)
  const { data: match, error } = await admin
    .from("league_matches")
    .insert({
      season_id,
      p1_id: user.id,
      p2_id: opponent_id,
      round,
      status: "accepted",
    })
    .select("id")
    .single()

  if (error || !match) return NextResponse.json({ error: error?.message || "Fehler beim Erstellen" }, { status: 400 })

  return NextResponse.json({ id: match.id })
}
