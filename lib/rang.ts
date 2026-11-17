/* Rangliste erst ab 5 Spielen (Oliver, 17.11.2026).
   Wer neu ist, startet bei 1000. Bisher stand er damit sofort in der
   Rangliste und schob alle Spieler unter 1000 einen Platz nach unten — nach
   dem Grand Smash rutschten so viele ab, obwohl sie Punkte gewonnen hatten.
   Jetzt gilt: Rating ab dem ersten Spiel, Rang erst ab dem fuenften. Bis dahin
   ist der Spieler «provisorisch». Die Zaehlung ueberall gleich: hoeheres
   Rating UND mindestens MIN_SPIELE_RANG Spiele. */
export const MIN_SPIELE_RANG = 5

export function hatRang(spiele: number | null | undefined): boolean {
  return (spiele ?? 0) >= MIN_SPIELE_RANG
}

export function fehlendeSpiele(spiele: number | null | undefined): number {
  return Math.max(0, MIN_SPIELE_RANG - (spiele ?? 0))
}

/* Inaktiv (Oliver, 17.11.2026, gleich wie Swiss Table Tennis/WTT ohne Abzug):
   Wer RANG_INAKTIV_TAGE kein gewertetes Spiel hatte, faellt aus der
   Rangliste. Die Punkte bleiben; mit dem naechsten Spiel ist er wieder drin.
   Grundlage ist profiles.zuletzt_gewertet (per Trigger aus elo_history). */
export const RANG_INAKTIV_TAGE = 61

/** Stichtag als ISO-Zeitpunkt: wer zuletzt davor gespielt hat, ist inaktiv. */
export function aktivAb(): string {
  return new Date(Date.now() - RANG_INAKTIV_TAGE * 86400000).toISOString()
}

export function istAktiv(zuletzt: string | null | undefined): boolean {
  return !!zuletzt && zuletzt >= aktivAb()
}

/** Hat einen Rang: genug Spiele UND nicht inaktiv. */
export function rangberechtigt(spiele: number | null | undefined, zuletzt: string | null | undefined): boolean {
  return hatRang(spiele) && istAktiv(zuletzt)
}
