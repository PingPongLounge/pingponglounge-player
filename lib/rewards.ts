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

// Wie oft darf ein Spiel gegen DENSELBEN Gegner pro Saison für ELO/Rang zählen?
// Darüber hinaus kann weitergespielt und eingetragen werden — das Ergebnis
// erscheint in Historie und Chat, zählt aber nicht mehr. Schützt die Rangliste
// davor, dass jemand von einem Kumpel nach oben geschoben wird.
export const MAX_RANKED_PER_OPPONENT = 5

// Aktivitätspflicht statt Gegner-Zuteilung: Wer im Monat zu wenig spielt,
// verliert Punkte. Keine Vorschriften, gegen WEN — nur, DASS gespielt wird.
// Open Games sind das Gefäss dafür.
export const MIN_MATCHES_PER_MONTH = 4   // gewertete Liga-Matches
export const MONTHLY_PENALTY_ELO = 20    // Abzug, wenn nicht erreicht

// Die vier Ligen. Gespielt wird paarweise (Rookie+Challenger in einer Tabelle,
// Advanced+Elite in der anderen) — die Liga selbst ist aber echt und hat ihre
// eigene Rangliste. Wer im Level aufsteigt, wechselt die Liga.
// Die Liga ist ein PLATZ, kein Etikett. Zwei Tabellen — Einstieg (Level 1–3) und
// Pro (Level 4–7). Innerhalb einer Tabelle gilt: Platz 1–24 ist die obere Liga,
// ab Platz 25 die untere. Wer über die Linie klettert, steigt auf; wer darunter
// fällt, ab. Kein Saisonende nötig, keine Zuteilung von Hand.
//
// Solange eine Tabelle weniger als 24 Spieler hat, stehen alle in der oberen
// Liga — das ist gewollt: die untere füllt sich, sobald genug Leute da sind.
export const LEAGUE_CUT = 24

export const LIGEN = [
  { key: "rookie",     name: "Rookie",     pair: "einstieg", oben: false },
  { key: "challenger", name: "Challenger", pair: "einstieg", oben: true  },
  { key: "advanced",   name: "Advanced",   pair: "pro",      oben: false },
  { key: "elite",      name: "Elite",      pair: "pro",      oben: true  },
] as const

export type LigaKey = (typeof LIGEN)[number]["key"]
export type LigaPair = "einstieg" | "pro"

/** Welche Tabelle? Level 1–3 → Einstieg, 4–7 → Pro. */
export function pairForLevel(level: string | number | null | undefined): LigaPair | null {
  const l = typeof level === "string" ? parseInt(level) : level
  if (!l || l < 1 || l > 7) return null
  return l >= 4 ? "pro" : "einstieg"
}

/** Welche Tabelle gehört zu dieser Saison? ("1-3" / "4-7") */
export function pairForSeason(skillClass: string | null | undefined): LigaPair {
  return /5|6|7|pro/i.test(skillClass || "") ? "pro" : "einstieg"
}

/** Aus Tabelle + Platz wird die Liga. Platz 1 ist der beste. */
export function ligaForRank(pair: LigaPair, rank: number) {
  const oben = rank <= LEAGUE_CUT
  return LIGEN.find(l => l.pair === pair && l.oben === oben)!
}

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
