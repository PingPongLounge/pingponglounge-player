import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { MAX_RANKED_PER_OPPONENT } from "@/lib/rewards"

// Erstellt ein neues Match direkt im Status "accepted" zwischen dem eingeloggten
// Spieler und einem Gegner innerhalb derselben Liga-Saison.
// Wird verwendet für „Weiteres Spiel eintragen" nach einem abgeschlossenen Match.
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { season_id, opponent_id, friendly } = await req.json()
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

  // Gespielt wird innerhalb der Tabelle — beide sind in derselben Saison
  // registriert (oben geprüft). Mehr braucht es nicht: die Liga ergibt sich
  // aus dem Platz in dieser Tabelle, nicht aus dem Level.

  // Kein offenes Match zwischen diesen zwei Spielern?
  const { data: existing } = await admin
    .from("league_matches")
    .select("id,status")
    .eq("season_id", season_id)
    // "p1_entered" blockiert NICHT mehr: ein weiteres Ergebnis darf eingetragen werden,
    // während ein früheres noch auf die Bestätigung des Gegners wartet.
    .in("status", ["challenge_sent", "accepted", "pending"])
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

  // Limit: max. MAX_RANKED_PER_OPPONENT gewertete Spiele gegen denselben Gegner.
  // Darüber hinaus darf man weiterspielen und eintragen — es zählt dann nur
  // nicht mehr für ELO und Rang. Verhindert, dass jemand von einem Kumpel
  // durch wiederholtes Absichtsverlieren nach oben geschoben wird.
  const { count: rankedCount } = await admin
    .from("league_matches")
    .select("id", { count: "exact", head: true })
    .eq("season_id", season_id)
    .eq("ranked", true)
    .in("status", ["p1_entered", "confirmed"])
    .or(`and(p1_id.eq.${user.id},p2_id.eq.${opponent_id}),and(p1_id.eq.${opponent_id},p2_id.eq.${user.id})`)

  const limitReached = (rankedCount ?? 0) >= MAX_RANKED_PER_OPPONENT
  const ranked = friendly === true ? false : !limitReached

  // Match direkt in "accepted" erstellen (beide haben bereits gespielt → kein Challenge-Flow nötig)
  const { data: match, error } = await admin
    .from("league_matches")
    .insert({
      season_id,
      p1_id: user.id,
      p2_id: opponent_id,
      round,
      status: "accepted",
      ranked,
    })
    .select("id")
    .single()

  if (error || !match) return NextResponse.json({ error: error?.message || "Fehler beim Erstellen" }, { status: 400 })

  return NextResponse.json({ id: match.id, ranked, limitReached, rankedCount: rankedCount ?? 0 })
}
