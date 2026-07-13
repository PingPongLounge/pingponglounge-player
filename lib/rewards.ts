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
// Der Schnitt folgt der Saison-Einteilung: Einstieg = Level 1–3, Pro = Level 4–7.
// Vorher lag Challenger auf 3–4 und damit quer über beide Saisons — ein Level-4-
// Spieler sass in der Pro-Saison, gehörte aber ins Einstieg-Paar und konnte
// deshalb niemanden fordern.
export const LIGEN = [
  { key: "rookie",     name: "Rookie",     levels: [1, 2], pair: "einstieg" },
  { key: "challenger", name: "Challenger", levels: [3],    pair: "einstieg" },
  { key: "advanced",   name: "Advanced",   levels: [4, 5], pair: "pro" },
  { key: "elite",      name: "Elite",      levels: [6, 7], pair: "pro" },
] as const

export type LigaKey = (typeof LIGEN)[number]["key"]

export function ligaForLevel(level: string | number | null | undefined) {
  const l = typeof level === "string" ? parseInt(level) : level
  if (!l) return null
  return LIGEN.find(x => (x.levels as readonly number[]).includes(l)) || null
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
