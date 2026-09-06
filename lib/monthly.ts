import type { SupabaseClient } from "@supabase/supabase-js"
import { MIN_MATCHES_PER_MONTH, MONTHLY_PENALTY_ELO } from "@/lib/rewards"
import { sendMonthlyWarning, sendMonthlyPenalty } from "@/lib/email"

// Aktivitätspflicht: Wer im Monat weniger als MIN_MATCHES_PER_MONTH gewertete
// Matches in der GLOBALEN Liga spielt, verliert am Monatsende Punkte.
// Saison-Teilnahmen sind optional und dürfen NIEMALS einen zusätzlichen
// Aktivitätsabzug erzeugen. So kann jemand eine 3-Monats-Season spielen oder
// auslassen, ohne dass das globale Rating doppelt bestraft wird.

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("de-CH", { month: "long" })
}

function monthRange(month: string): { von: string; bis: string } {
  const [y, m] = month.split("-").map(Number)
  const von = new Date(Date.UTC(y, m - 1, 1)).toISOString()
  const bis = new Date(Date.UTC(y, m, 1)).toISOString()
  return { von, bis }
}

/** Gewertete, bestätigte Liga-Matches eines Spielers in einem Monat. */
export async function monthlyCount(
  admin: SupabaseClient, seasonId: string, playerId: string, month: string,
): Promise<number> {
  const { von, bis } = monthRange(month)
  const { count } = await admin
    .from("league_matches")
    .select("id", { count: "exact", head: true })
    .eq("season_id", seasonId)
    .eq("ranked", true)
    .eq("status", "confirmed")
    .gte("confirmed_at", von)
    .lt("confirmed_at", bis)
    .or(`p1_id.eq.${playerId},p2_id.eq.${playerId}`)
  return count ?? 0
}

async function globalLeague(admin: SupabaseClient): Promise<{id:string}|null> {
  const { data } = await admin
    .from("league_seasons")
    .select("id")
    .eq("is_global", true)
    .in("status", ["open", "running"])
    .maybeSingle()
  return data ?? null
}

/**
 * Den VERGANGENEN Monat abrechnen. Wer in der globalen Liga zu wenig gespielt
 * hat, verliert Punkte und bekommt eine Mail. Doppelabzüge sind ausgeschlossen
 * (elo_history.note). Optionale Seasons werden bewusst ignoriert.
 */
export async function applyMonthlyPenalties(admin: SupabaseClient): Promise<number> {
  const jetzt = new Date()
  const vormonat = monthKey(new Date(jetzt.getFullYear(), jetzt.getMonth() - 1, 1))
  const note = `monatspflicht:${vormonat}`
  const global = await globalLeague(admin)
  if (!global) return 0

  let abzuege = 0
  const { bis: vormonatEnde, von: vormonatStart } = monthRange(vormonat)
  const { data: regs } = await admin
    .from("league_registrations")
    .select("player_id,created_at")
    .eq("season_id", global.id)

  for (const r of regs || []) {
    const pid = r.player_id as string

    // Erster angebrochener Monat ist frei.
    const beitritt = r.created_at ? new Date(r.created_at as string) : null
    if (beitritt && beitritt >= new Date(vormonatStart)) continue
    if (beitritt && beitritt >= new Date(vormonatEnde)) continue

    const { count: schon } = await admin
      .from("elo_history")
      .select("id", { count: "exact", head: true })
      .eq("player_id", pid)
      .eq("note", note)
    if ((schon ?? 0) > 0) continue

    const gespielt = await monthlyCount(admin, global.id, pid, vormonat)
    if (gespielt >= MIN_MATCHES_PER_MONTH) continue

    const { data: p } = await admin.from("profiles").select("elo,name").eq("id", pid).single()
    if (!p) continue

    const alt = p.elo ?? 1000
    const neu = Math.max(100, alt - MONTHLY_PENALTY_ELO)

    await admin.from("profiles").update({ elo: neu }).eq("id", pid)
    await admin.from("elo_history").insert({
      player_id: pid, elo: neu, delta: neu - alt, match_id: null, note,
    })
    abzuege++

    try {
      const { data: authUser } = await admin.auth.admin.getUserById(pid)
      const mail = authUser?.user?.email
      if (mail) {
        await sendMonthlyPenalty({
          to: mail,
          name: p.name || "Spieler",
          monthLabel: monthLabel(vormonat),
          played: gespielt,
          required: MIN_MATCHES_PER_MONTH,
          eloBefore: alt,
          eloAfter: neu,
        })
      }
    } catch (e) {
      console.error("Abzugs-Mail fehlgeschlagen für", pid, e)
    }
  }

  return abzuege
}

/** Gegen Monatsende (ab dem 25.) warnen. Nur globale Liga. */
export async function warnMonthlyOpen(admin: SupabaseClient): Promise<number> {
  const jetzt = new Date()
  if (jetzt.getDate() < 25) return 0

  const global = await globalLeague(admin)
  if (!global) return 0

  const monat = monthKey(jetzt)
  const letzterTag = new Date(jetzt.getFullYear(), jetzt.getMonth() + 1, 0).getDate()
  const tageBleiben = letzterTag - jetzt.getDate() + 1
  let gewarnt = 0

  const { data: regs } = await admin
    .from("league_registrations")
    .select("player_id,warned_month")
    .eq("season_id", global.id)

  for (const r of regs || []) {
    const pid = r.player_id as string
    if (r.warned_month === monat) continue

    const gespielt = await monthlyCount(admin, global.id, pid, monat)
    if (gespielt >= MIN_MATCHES_PER_MONTH) continue

    const { data: p } = await admin.from("profiles").select("name,elo").eq("id", pid).single()
    if (!p) continue

    let verschickt = false
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(pid)
      const mail = authUser?.user?.email
      if (mail) {
        await sendMonthlyWarning({
          to: mail,
          name: p.name || "Spieler",
          monthLabel: monthLabel(monat),
          played: gespielt,
          required: MIN_MATCHES_PER_MONTH,
          daysLeft: tageBleiben,
          penalty: MONTHLY_PENALTY_ELO,
        })
        verschickt = true
        gewarnt++
      }
    } catch (e) {
      console.error("Warn-Mail fehlgeschlagen für", pid, e)
    }

    if (verschickt) {
      await admin.from("league_registrations")
        .update({ warned_month: monat })
        .eq("season_id", global.id).eq("player_id", pid)
    }
  }

  return gewarnt
}
