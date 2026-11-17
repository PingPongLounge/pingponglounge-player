import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { globalLeagueId } from "@/lib/liga"
import { tierForElo } from "@/lib/rewards"
import { NextRequest, NextResponse } from "next/server"
import { MIN_SPIELE_RANG, istAktiv } from "@/lib/rang"

// ─── ZENTRALE RANGLISTE MIT FILTERN ──────────────────────────────────────────
// Eine Liga, eine Elo, eine Platzierung. Die Filter berechnen nur die
// Rangposition INNERHALB der gefilterten Auswahl — sie erzeugen keine zweite
// Wertung. Die Stufe (Rookie…Elite) kommt aus der Elo und ist überall gleich.
//
// Filter (alle optional, kombinierbar):
//   scope   = world | europe | country | canton | city   (geografische Reichweite)
//   country, canton, city                                (Werte zur Reichweite)
//   friends = 1                                           (nur bestätigte Freunde)
//   category = parkinson                                  (besondere Kategorie)
//   hand = left|right · pips = none|short|long · anti = 1 (Spielstil)
const EU_LAENDER = ["CH", "DE", "AT", "FR", "IT", "LI"]

export async function GET(req: NextRequest) {
  const admin = createAdminClient()
  const p = req.nextUrl.searchParams

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  const seasonId = await globalLeagueId(admin)
  if (!seasonId) return NextResponse.json({ players: [], me: null })

  const { data: regs } = await admin.from("league_registrations").select("player_id").eq("season_id", seasonId)
  const ids = (regs || []).map(r => r.player_id)
  if (ids.length === 0) return NextResponse.json({ players: [], me: null })

  const { data: profs } = await admin.from("profiles")
    .select("id,name,elo,level,avatar_url,home_location,handedness,pips,anti,player_category,visible_in_ranking,matches_played,zuletzt_gewertet")
    .in("id", ids)
    // Wer sich aus der oeffentlichen Rangliste nimmt, erscheint hier nicht mehr.
    // Die eigenen Spiele und das eigene Rating bleiben davon unberuehrt.
    .or("visible_in_ranking.is.null,visible_in_ranking.eq.true")

  const { data: locs } = await admin.from("locations").select("id,city,canton,country")
  const locMap = new Map((locs || []).map(l => [l.id, l]))

  // Freunde des eingeloggten Nutzers (nur wenn Freunde-Filter aktiv)
  let friendSet: Set<string> | null = null
  if (p.get("friends") === "1" && user) {
    const { data: fr } = await admin.from("my_friends").select("friend_id").eq("user_id", user.id)
    friendSet = new Set((fr || []).map(f => f.friend_id))
    friendSet.add(user.id)
  }

  // Basisliste: nach Elo absteigend → globaler Rang
  const alle = (profs || [])
    .map(pf => {
      const loc = pf.home_location ? locMap.get(pf.home_location) : null
      return {
        user_id: pf.id, name: pf.name, elo: pf.elo ?? 1000,
        level: pf.level || "", avatar: pf.avatar_url || null,
        tier: tierForElo(pf.elo ?? 1000).key,
        city: loc?.city || null, canton: loc?.canton || null, country: loc?.country || null,
        handedness: pf.handedness || null, pips: pf.pips || null, anti: pf.anti || false,
        category: pf.player_category || null,
        spiele: pf.matches_played ?? 0,
        aktiv: istAktiv(pf.zuletzt_gewertet),
        rank_global: 0, rank_filtered: 0,
      }
    })
    .sort((a, b) => b.elo - a.elo)
  // Erst ab MIN_SPIELE_RANG Spielen in der Rangliste (lib/rang.ts).
  // Und nur wer in den letzten 2 Monaten gespielt hat (lib/rang.ts).
  const provisorisch = alle.filter(r => r.spiele < MIN_SPIELE_RANG)
  const inaktiv = alle.filter(r => r.spiele >= MIN_SPIELE_RANG && !r.aktiv)
  alle.splice(0, alle.length, ...alle.filter(r => r.spiele >= MIN_SPIELE_RANG && r.aktiv))
  alle.forEach((r, i) => (r.rank_global = i + 1))

  const scope = p.get("scope") || "world"
  const country = p.get("country"), canton = p.get("canton"), city = p.get("city")
  const category = p.get("category"), hand = p.get("hand"), pips = p.get("pips"), anti = p.get("anti")

  const gefiltert = alle.filter(r => {
    if (scope === "europe" && r.country && !EU_LAENDER.includes(r.country)) return false
    if (scope === "country" && country && r.country !== country) return false
    if (scope === "canton" && canton && r.canton !== canton) return false
    if (scope === "city" && city && r.city !== city) return false
    if (friendSet && !friendSet.has(r.user_id)) return false
    if (category && r.category !== category) return false
    if (hand && r.handedness !== hand) return false
    if (pips && r.pips !== pips) return false
    if (anti === "1" && !r.anti) return false
    return true
  })
  gefiltert.forEach((r, i) => (r.rank_filtered = i + 1))

  const me = user ? (gefiltert.find(r => r.user_id === user.id)
                  || alle.find(r => r.user_id === user.id) || null) : null
  const meProv = user && !me ? provisorisch.find(r => r.user_id === user.id) : null
  const meInaktiv = user && !me ? inaktiv.find(r => r.user_id === user.id) : null

  return NextResponse.json({
    players: gefiltert,
    me: me ?? (meProv ? { ...meProv, provisorisch: true, fehlend: MIN_SPIELE_RANG - meProv.spiele }
             : meInaktiv ? { ...meInaktiv, inaktiv: true } : null),
    total: alle.length,
    // Noch ohne Rang: wer schon gespielt hat, aber weniger als MIN_SPIELE_RANG Spiele.
    provisorisch: provisorisch.filter(r => r.spiele > 0)
      .map(r => ({ user_id: r.user_id, name: r.name, elo: r.elo, level: r.level, avatar: r.avatar, spiele: r.spiele })),
  })
}
