// =====================================================================
// TRAININGSCAMP — Single Source of Truth (Sessions + Preise/Rabatt)
// =====================================================================
// Wird von Server (Checkout/Webhook) UND Client (Seite) genutzt. Der Preis
// wird IMMER hier serverseitig gerechnet — nie vom Client übernommen.
//
// Rabatt gestaffelt nach GANZEN Tagen (beide Einheiten eines Tages):
//   0 Tage = 0, 1 = 150, 2 = 275 (−25), 3 = 390 (−60), 4/Camp = 500 (−100)
// Einzelne Halbtage kosten je CHF 75 (kein Mengenrabatt).

export const CAMP_HALFDAY_CHF = 75
export const CAMP_FULLDAY_CHF = 150
export const CAMP_DAY_TIERS = [0, 150, 275, 390, 500] as const // Index = Anzahl ganzer Tage
export const CAMP_LOCATION_ID = "glattbrugg"
export const CAMP_LOCATION_NAME = "Glattbrugg"
export const CAMP_MAX_PER_SESSION = 18
export const CAMP_STORNO_TAGE = 7 // Gratis-Storno bis 1 Woche vorher

export type CampPart = "vm" | "nm"
export type CampSession = {
  id: string          // kanonischer Schlüssel, z.B. "do-vm"
  date: string        // YYYY-MM-DD
  part: CampPart
  start: string       // "09:15"
  end: string         // "11:45"
  startHour: number    // 9 bzw. 13 — für Storno-/Zeitfenster
  label: string       // "Vormittag"
}

// Feste Termine 13.–16. August 2026, je Vormittag + Nachmittag (aus Eversports).
export const CAMP_SESSIONS: CampSession[] = [
  { id: "do-vm", date: "2026-08-13", part: "vm", start: "09:15", end: "11:45", startHour: 9,  label: "Vormittag" },
  { id: "do-nm", date: "2026-08-13", part: "nm", start: "13:15", end: "15:45", startHour: 13, label: "Nachmittag" },
  { id: "fr-vm", date: "2026-08-14", part: "vm", start: "09:15", end: "11:45", startHour: 9,  label: "Vormittag" },
  { id: "fr-nm", date: "2026-08-14", part: "nm", start: "13:15", end: "15:45", startHour: 13, label: "Nachmittag" },
  { id: "sa-vm", date: "2026-08-15", part: "vm", start: "09:15", end: "11:45", startHour: 9,  label: "Vormittag" },
  { id: "sa-nm", date: "2026-08-15", part: "nm", start: "13:15", end: "15:45", startHour: 13, label: "Nachmittag" },
  { id: "so-vm", date: "2026-08-16", part: "vm", start: "09:15", end: "11:45", startHour: 9,  label: "Vormittag" },
  { id: "so-nm", date: "2026-08-16", part: "nm", start: "13:15", end: "15:45", startHour: 13, label: "Nachmittag" },
]

export const CAMP_SESSION_IDS = CAMP_SESSIONS.map(s => s.id)
export function isCampSessionId(id: string): boolean {
  return CAMP_SESSION_IDS.includes(id)
}

export type CampPrice = { total: number; save: number; fullDays: number; halfDays: number; count: number }

/**
 * Rechnet den Camp-Preis für eine Menge gewählter Session-IDs.
 * Doppelte/ungültige IDs werden ignoriert. Ganze Tage (beide Einheiten)
 * lösen den Tages-Rabatt aus; einzelne Halbtage kosten je CHF 75.
 */
export function campPrice(sessionIds: string[]): CampPrice {
  const uniq = Array.from(new Set(sessionIds)).filter(isCampSessionId)
  const byDate: Record<string, number> = {}
  for (const id of uniq) {
    const s = CAMP_SESSIONS.find(x => x.id === id)!
    byDate[s.date] = (byDate[s.date] || 0) + 1
  }
  let fullDays = 0, halfDays = 0
  for (const c of Object.values(byDate)) c >= 2 ? fullDays++ : halfDays++

  const tier = CAMP_DAY_TIERS[Math.min(fullDays, CAMP_DAY_TIERS.length - 1)]
  const total = tier + halfDays * CAMP_HALFDAY_CHF
  const regular = fullDays * CAMP_FULLDAY_CHF + halfDays * CAMP_HALFDAY_CHF
  return { total, save: regular - total, fullDays, halfDays, count: uniq.length }
}

/** Beginn einer Session als Date (lokale Zeit) — für Storno-Frist. */
export function campSessionStart(s: CampSession): Date {
  return new Date(`${s.date}T${s.start}:00`)
}
