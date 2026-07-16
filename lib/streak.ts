// Ansporn nach Spielen: bei einer Siegesserie ein "On Fire", bei Niederlagen
// eine aufmunternde Zeile mit Verweis aufs Training. Reine Funktion → testbar,
// ohne DB. Die Serie (streak) ist die Länge der aktuellen Folge gleicher
// Ergebnisse ab dem jüngsten Spiel; `won` sagt, ob dieses jüngste Spiel ein
// Sieg war.
export type StreakInfo = {
  text: string
  fire: boolean                       // true → Feuer/Feier-Optik, sonst ruhig-aufmunternd
  cta?: { label: string; href: string }
} | null

export function streakLine(won: boolean, streak: number): StreakInfo {
  if (streak <= 0) return null

  if (won) {
    if (streak >= 5) return { text: `Unaufhaltsam — ${streak} Siege in Folge!`, fire: true }
    if (streak >= 3) return { text: `Du bist on fire — ${streak} Siege in Folge!`, fire: true }
    if (streak === 2) return { text: `Zwei in Folge — läuft bei dir!`, fire: true }
    return null                       // einzelner Sieg braucht keine Extra-Feier
  }

  // Niederlagen: NICHT bei jeder Niederlage nerven. Erst ab 4 in Folge
  // aufmunternd + Verweis aufs Training. Darunter: gar keine Meldung.
  if (streak >= 4) {
    const train = { label: "Zum Training", href: "/training" }
    return { text: `Kopf hoch — die Serie dreht sich. Hol dir den Schliff im Training.`, fire: false, cta: train }
  }
  return null
}
