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
