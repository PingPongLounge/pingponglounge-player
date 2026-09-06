import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { STAFF_EMAILS } from "@/lib/staff"

function roundRobinRounds(players: string[]): Array<Array<{p1:string,p2:string}>> {
  const list = [...players]
  if (list.length % 2 !== 0) list.push("BYE")
  const n = list.length
  const rounds: Array<Array<{p1:string,p2:string}>> = []
  for (let round = 0; round < n - 1; round++) {
    const games: Array<{p1:string,p2:string}> = []
    for (let i = 0; i < n / 2; i++) {
      const p1 = list[i], p2 = list[n - 1 - i]
      if (p1 !== "BYE" && p2 !== "BYE") games.push({ p1, p2 })
    }
    rounds.push(games)
    list.splice(1, 0, list.pop()!)
  }
  return rounds
}

// Öffentliche Seasons sollen NICHT wie ein klassisches Round Robin den Besten
// zuerst gegen den Letzten stellen. Die Spieler kommen bereits nach globaler ELO
// sortiert herein. Wir bauen bis zu acht Runden mit möglichst nahen Nachbarn.
// Jede Paarung kommt höchstens einmal vor; pro Runde spielt jeder höchstens einmal.
function nearbyRatingRounds(players: string[], maxRounds = 8): Array<Array<{p1:string,p2:string}>> {
  if (players.length < 2) return []

  const usedPairs = new Set<string>()
  const rounds: Array<Array<{p1:string,p2:string}>> = []
  const maxDistance = Math.min(players.length - 1, Math.max(1, maxRounds))

  for (let distance = 1; distance <= maxDistance && rounds.length < maxRounds; distance++) {
    // Zwei Durchläufe je Distanz (gerade/ungerade Startposition) sorgen dafür,
    // dass Randspieler nicht systematisch zu wenig Gegner erhalten.
    for (let parity = 0; parity < 2 && rounds.length < maxRounds; parity++) {
      const busy = new Set<string>()
      const games: Array<{p1:string,p2:string}> = []

      for (let i = parity; i + distance < players.length; i++) {
        const p1 = players[i]
        const p2 = players[i + distance]
        if (busy.has(p1) || busy.has(p2)) continue

        const key = [p1, p2].sort().join(":")
        if (usedPairs.has(key)) continue

        busy.add(p1)
        busy.add(p2)
        usedPairs.add(key)
        games.push({ p1, p2 })
      }

      if (games.length) rounds.push(games)
    }
  }

  return rounds
}

export async function POST(req: NextRequest) {
  const { season_id } = await req.json().catch(()=>({}))
  if (!season_id) return NextResponse.json({ error: "season_id fehlt" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email||"")) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })

  const admin = createAdminClient()
  const { data: season } = await admin
    .from("league_seasons")
    .select("id,is_global,is_private,status,start_date")
    .eq("id", season_id)
    .maybeSingle()

  if (!season) return NextResponse.json({ error: "Saison nicht gefunden" }, { status: 404 })
  if (season.is_global) return NextResponse.json({ error: "Für die globale Liga dürfen keine Season-Matches generiert werden" }, { status: 400 })

  // Sicherheitsgurt: niemals bestehende Resultate/Challenges wegwerfen.
  const { count: existing } = await admin
    .from("league_matches")
    .select("id", { count:"exact", head:true })
    .eq("season_id", season_id)
  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: "Diese Saison hat bereits Matches. Generierung abgebrochen, damit keine Daten gelöscht werden." }, { status: 409 })
  }

  const { data: regs } = await admin.from("league_registrations").select("player_id").eq("season_id", season_id)
  if (!regs || regs.length < 2) return NextResponse.json({ error: "Zu wenige Spieler" }, { status: 400 })

  const playerIds = regs.map(r => r.player_id)

  // Für die freiwillige öffentliche 3-Monats-Season sortieren wir nach aktuellem
  // globalem Rating. Danach werden nahe Rating-Nachbarn gepaart. Die Season hat
  // keine eigene ELO: jedes bestätigte gewertete Match wirkt auf die globale ELO.
  let players = playerIds
  if (!season.is_private) {
    const { data: profs } = await admin.from("profiles").select("id,elo").in("id", playerIds)
    const elo = new Map((profs || []).map(p => [p.id, p.elo ?? 1000]))
    players = [...playerIds].sort((a,b) => (elo.get(b) || 1000) - (elo.get(a) || 1000))
  }

  // Firmenligen behalten das klassische vollständige Round Robin. Öffentliche
  // Seasons erhalten maximal acht Gegner/Runden mit Nähe im globalen Rating.
  const selectedRounds = season.is_private
    ? roundRobinRounds(players)
    : nearbyRatingRounds(players, 8)

  if (!selectedRounds.length) return NextResponse.json({ error: "Keine gültigen Paarungen gefunden" }, { status: 400 })

  const start = season.start_date ? new Date(season.start_date) : new Date()
  const inserts: Array<Record<string, unknown>> = []

  selectedRounds.forEach((games, idx) => {
    // Öffentliche Season: zwei Match-Runden pro 3-Wochen-Block = vier Blöcke.
    const block = season.is_private ? idx + 1 : Math.floor(idx / 2) + 1
    const deadline = new Date(start)
    deadline.setDate(deadline.getDate() + (season.is_private ? 14 * (idx + 1) : 21 * block))
    for (const g of games) {
      inserts.push({
        season_id,
        round: block,
        p1_id: g.p1,
        p2_id: g.p2,
        deadline: deadline.toISOString(),
        ranked: true,
      })
    }
  })

  const { error } = await admin.from("league_matches").insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("league_seasons").update({ status: "running", current_round: 1 }).eq("id", season_id)
  return NextResponse.json({
    ok: true,
    count: inserts.length,
    rounds: season.is_private ? selectedRounds.length : Math.min(4, Math.ceil(selectedRounds.length / 2)),
    mode: season.is_private ? "round_robin" : "three_month_season_near_rating",
  })
}
