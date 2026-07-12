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

export const LIGA_CONFIG = {
  minMatchesForRanking: 6,
  inactivityDays: 30,
  inactivityEloPenalty: 20,
  upsetEloDiff: 100,
  seasonCompletionPoints: 50,
}
