export interface Reward {
  threshold: number
  type: "discount" | "product" | "play"
  label: string
  description: string
  discountPercent?: number
}

// PingPoints-Ökonomie
// ------------------------------------------------------------------
// PingPoints gibt es NUR für:
//   1. Turnier-Podest (Platz 1–3)
//   2. bezahlte Buchungen (Tisch, Training, Open Game)
//   3. den einmaligen Willkommens-Bonus bei der Registrierung
// KEINE PingPoints für Liga-Matches oder einzelne Turnier-Matches.
//
// Verhältnis: 10 bezahlte Buchungen = 1 Stunde Tisch gratis (5 PP × 10 = 50 PP).
export const PP_CONFIG = {
  perPaidBooking: 5,               // pro bezahlter Buchung
  tournamentPodium: [100, 50, 25], // Platz 1 / 2 / 3
  signupBonus: 15,                 // einmalig bei der Registrierung
}

export const PP_REWARDS: Reward[] = [
  { threshold: 50,  type: "play",                          label: "1 Stunde Tisch gratis", description: "Eine Stunde Tisch gratis — einlösbar in deiner Lounge" },
  { threshold: 100, type: "discount", discountPercent: 10, label: "10% Rabatt",           description: "10% Rabattcode gültig im PPL Online-Shop" },
  { threshold: 300, type: "discount", discountPercent: 15, label: "15% Rabatt",           description: "15% Rabattcode gültig im PPL Online-Shop" },
  { threshold: 500, type: "product",                       label: "Gratis Schlägerhülle", description: "PPL Branded Schlägerhülle — abholbar in deiner Lounge" },
]

// Was ein PingPoint wert ist. EINE Zahl für alles: 50 Punkte = 1 Stunde Tisch
// (≈ CHF 25) → 1 Punkt = CHF 0.50. Beim Buchen war ein Punkt vorher CHF 2 wert,
// also das Vierfache — derselbe Punkt hatte je nach Bildschirm einen anderen Preis.
export const PP_CHF = 0.5

// ─── GEGNER-LIMIT ────────────────────────────────────────────────────────────
// Max. gewertete Spiele gegen DENSELBEN Gegner in einem ROLLIERENDEN Fenster
// von 12 Monaten. Bewusst rollierend statt pro Kalenderjahr: sonst würde die
// Regel am 1. Januar künstlich zurückspringen. Danach darf weitergespielt
// werden — die Partie zählt aber nicht mehr für die ELO, bis die älteste
// Begegnung aus dem Fenster fällt. Schützt die Rangliste davor, dass sich zwei
// Spieler gegenseitig hochschaukeln.
export const MAX_RANKED_PER_OPPONENT = 5
export const RANKED_WINDOW_MONTHS = 12

// ─── AKTIVITÄTSREGEL ─────────────────────────────────────────────────────────
// Wer im Kalendermonat zu wenig gewertete Spiele hat, verliert Punkte. Keine
// Vorschrift, gegen WEN — nur, DASS gespielt wird. Der Kalendermonat bleibt der
// Zeitraum (verständlich und passend zu monatlichen Standortturnieren).
export const MIN_MATCHES_PER_MONTH = 5   // gewertete Spiele pro Kalendermonat
export const MONTHLY_PENALTY_ELO = 20    // Abzug, wenn nicht erreicht
// Erster Monat, der bewertet wird — davor wird NICHT rückwirkend bestraft.
export const ACTIVITY_RULE_START = "2026-08"   // Format YYYY-MM

// ─── LEVEL: Rookie / Challenger / Advanced / Elite ───────────────────────────
// Rein visuelle, motivierende Stufen — automatisch aus der ELO abgeleitet.
// KEINE eigene Liga, KEINE eigene Wertung, KEINE Tabellenplätze mehr:
// Früher hing die Stufe am Platz (1–24 vs. ab 25). Das wurde unlogisch, sobald
// die Spielerzahl schwankt oder regional gefiltert wird — derselbe Spieler wäre
// in Zürich "Elite" und in Europa "Advanced" gewesen.
// Jetzt feste ELO-Bereiche: ein Spieler hat ÜBERALL dieselbe Stufe, egal ob er
// Europa, Land, Region, Stadt oder Freunde filtert.
// Die Grenzen stehen NUR hier (konfigurierbar) — nicht im Frontend verstreut.
export const TIERS = [
  { key: "rookie",     name: "Rookie",     minElo: 0    },
  { key: "challenger", name: "Challenger", minElo: 1150 },
  { key: "advanced",   name: "Advanced",   minElo: 1350 },
  { key: "elite",      name: "Elite",      minElo: 1600 },
] as const

export type TierKey = (typeof TIERS)[number]["key"]
export type Tier = (typeof TIERS)[number]

/** Die Stufe zu einer ELO. Immer eindeutig, überall gleich. */
export function tierForElo(elo: number): Tier {
  let treffer: Tier = TIERS[0]
  for (const t of TIERS) if (elo >= t.minElo) treffer = t
  return treffer
}

/** ELO-Spanne einer Stufe als Text, z.B. "1150–1349" / "ab 1600". */
export function tierRangeLabel(key: TierKey): string {
  const i = TIERS.findIndex(t => t.key === key)
  const t = TIERS[i], next = TIERS[i + 1]
  return next ? `${t.minElo}–${next.minElo - 1}` : `ab ${t.minElo}`
}

// Rating im Playtomic-Stil (0–7 mit einer Nachkommastelle). Hier in rewards.ts,
// weil auch der Server (Mails) es braucht — theme.ts zieht React-Styles mit rein.
const LEVEL_ELO_MIN: Record<number, number> = { 1: 950, 2: 1050, 3: 1150, 4: 1250, 5: 1350, 6: 1450, 7: 1600 }
function levelVonElo(elo: number): number {
  if (elo >= 1600) return 7
  if (elo >= 1450) return 6
  if (elo >= 1350) return 5
  if (elo >= 1250) return 4
  if (elo >= 1150) return 3
  if (elo >= 1050) return 2
  return 1
}
export function eloToRating(elo: number): number {
  const lvl = levelVonElo(elo)
  const start = LEVEL_ELO_MIN[lvl] ?? 950
  const nextStart = LEVEL_ELO_MIN[lvl + 1] ?? (start + 200)
  const frac = Math.max(0, Math.min(0.99, (elo - start) / (nextStart - start)))
  return Math.floor((lvl + frac) * 10) / 10
}
export function ratingLabel(elo: number): string {
  return eloToRating(elo).toFixed(1)
}

// pairForLevel / pairForSeason / ligaForRank sind entfallen: Es gibt keine
// getrennten Tabellen (Einstieg/Pro) und keine Platz-Grenze mehr. Die Stufe
// kommt aus tierForElo(), die Rangposition aus der jeweils gefilterten Ansicht.

// Fertige Sprüche nach dem Bestätigen — Kommentieren muss ein Tipp sein,
// kein Aufsatz. Freitext geht trotzdem.
export const MATCH_SPRUECHE = [
  "Gut gespielt!",
  "Nächstes Mal bist du dran.",
  "Keine Chance gehabt — du Rakete.",
  "Revanche?",
] as const

export const LIGA_CONFIG = {
  minMatchesForRanking: 6,
  inactivityDays: 30,
  inactivityEloPenalty: 20,
  upsetEloDiff: 100,
  seasonCompletionPoints: 50,
}
