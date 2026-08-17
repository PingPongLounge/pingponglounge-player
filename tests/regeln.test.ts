import { describe, it, expect } from "vitest"
import { berechneElo, eloPreview, K, ELO_FLOOR } from "@/lib/elo"
import {
  TIERS, tierForElo, RANKED_WINDOW_MONTHS,
  MAX_RANKED_PER_OPPONENT, MIN_MATCHES_PER_MONTH, MONTHLY_PENALTY_ELO,
  PP_CONFIG, PP_REWARDS, PP_CHF, ratingLabel, eloToRating,
} from "@/lib/rewards"
import { monthKey, monthLabel } from "@/lib/monthly"

// Diese Tests prüfen die Regeln, die wirklich weh tun, wenn sie brechen:
// Punkte, Ligen, Limits, Fristen. Sie laufen ohne Datenbank in Millisekunden —
// deshalb können sie bei JEDEM Push laufen.

describe("ELO", () => {
  it("gibt dem Sieger genau so viele Punkte, wie der Verlierer abgibt", () => {
    const { neuW, neuL, gain } = berechneElo(1200, 1200)
    expect(neuW - 1200).toBe(gain)
    expect(1200 - neuL).toBe(gain)
  })

  it("gibt bei gleicher Stärke die halbe K-Zahl", () => {
    const { gain } = berechneElo(1200, 1200)
    expect(gain).toBe(K / 2)   // 16
  })

  it("belohnt den Aussenseiter stärker als den Favoriten", () => {
    const aussenseiter = berechneElo(1000, 1600).gain   // Schwacher schlägt Starken
    const favorit      = berechneElo(1600, 1000).gain   // Starker schlägt Schwachen
    expect(aussenseiter).toBeGreaterThan(favorit)
    expect(favorit).toBeLessThan(5)
  })

  it("fällt nie unter die Untergrenze", () => {
    const { neuL } = berechneElo(2000, ELO_FLOOR)
    expect(neuL).toBeGreaterThanOrEqual(ELO_FLOOR)
  })

  it("die Mail-Vorschau stimmt mit der echten Rechnung überein", () => {
    // Was in der Bestätigungs-Mail steht ("1350 → 1334"), muss exakt das sein,
    // was beim Bestätigen passiert. Sonst lügt die Mail.
    const sieg      = berechneElo(1350, 1400)
    const niederlage = berechneElo(1400, 1350)
    expect(eloPreview(1350, 1400, true)).toBe(sieg.neuW)
    expect(eloPreview(1350, 1400, false)).toBe(niederlage.neuL)
  })
})

describe("Stufen (Rookie/Challenger/Advanced/Elite)", () => {
  it("kommen aus der ELO, nicht aus dem Tabellenplatz", () => {
    expect(tierForElo(900).key).toBe("rookie")
    expect(tierForElo(1149).key).toBe("rookie")
    expect(tierForElo(1150).key).toBe("challenger")
    expect(tierForElo(1349).key).toBe("challenger")
    expect(tierForElo(1350).key).toBe("advanced")
    expect(tierForElo(1599).key).toBe("advanced")
    expect(tierForElo(1600).key).toBe("elite")
    expect(tierForElo(9999).key).toBe("elite")
  })

  it("sind lückenlos und überschneidungsfrei aufsteigend", () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].minElo).toBeGreaterThan(TIERS[i - 1].minElo)
    }
  })

  it("derselbe Spieler hat überall dieselbe Stufe — egal wie gefiltert wird", () => {
    // Das war der Grund für die Umstellung: früher hing die Stufe am Platz,
    // also war derselbe Spieler in Zürich "Elite" und in Europa "Advanced".
    const elo = 1400
    expect(tierForElo(elo).key).toBe(tierForElo(elo).key)
    expect(tierForElo(elo).key).toBe("advanced")
  })
})

describe("Limits und Fristen", () => {
  it("höchstens 5 gewertete Spiele gegen denselben Gegner — rollierend 12 Monate", () => {
    expect(MAX_RANKED_PER_OPPONENT).toBe(5)
    expect(RANKED_WINDOW_MONTHS).toBe(12)
  })

  it("3 gewertete Spiele im Monat, sonst 12 Punkte Abzug", () => {
    expect(MIN_MATCHES_PER_MONTH).toBe(3)
    expect(MONTHLY_PENALTY_ELO).toBe(12)
  })

  it("der Monatsschlüssel ist zweistellig — sonst sortiert '2026-9' falsch", () => {
    expect(monthKey(new Date(2026, 8, 15))).toBe("2026-09")
    expect(monthKey(new Date(2026, 11, 1))).toBe("2026-12")
  })

  it("der Monatsname trifft den richtigen Monat (kein Off-by-one)", () => {
    expect(monthLabel("2026-01").toLowerCase()).toContain("januar")
    expect(monthLabel("2026-12").toLowerCase()).toContain("dezember")
  })
})

describe("Rating (Playtomic-Skala 0–7)", () => {
  it("gerade aufgestiegen = .0, kurz vor dem nächsten Level = .9", () => {
    expect(ratingLabel(1350)).toBe("5.0")   // Level 5 beginnt
    expect(ratingLabel(1400)).toBe("5.5")   // Mitte
    expect(ratingLabel(1449)).toBe("5.9")   // knapp vor Level 6
    expect(ratingLabel(1450)).toBe("6.0")   // aufgestiegen
  })

  it("zeigt nie eine .0 des falschen Levels an (floor, nicht round)", () => {
    // 1449 ist noch Level 5 — es darf NICHT als 6.0 erscheinen.
    expect(eloToRating(1449)).toBeLessThan(6)
    expect(Math.floor(eloToRating(1449))).toBe(5)
  })

  it("bleibt in der Spanne 1.0 bis 7.9", () => {
    expect(eloToRating(100)).toBe(1)
    expect(eloToRating(3000)).toBeLessThanOrEqual(7.9)
    expect(eloToRating(3000)).toBeGreaterThanOrEqual(7)
  })
})

describe("PingPoints", () => {
  it("Podest zahlt 100 / 50 / 25", () => {
    expect(PP_CONFIG.tournamentPodium).toEqual([100, 50, 25])
  })

  it("ein Punkt ist genau einen Franken wert", () => {
    // 1 Punkt = CHF 1. Damit kostet eine Buchung beim Einlösen genau ihren
    // CHF-Preis in Punkten (gratis Tisch ≈ 25, gratis Training = 29).
    expect(PP_CHF).toBe(1)
  })

  it("die erste Gratis-Prämie ist die Tischstunde zu 25 Punkten", () => {
    // Die günstigste play-Prämie = 1 Stunde Tisch = 25 Punkte (≈ CHF 25).
    const guenstigste = PP_REWARDS.filter(r => r.type === "play").sort((a, b) => a.threshold - b.threshold)[0]
    expect(guenstigste.threshold).toBe(25)
    expect(guenstigste.threshold * PP_CHF).toBe(25)
  })

  it("pro Buchung gibt es 0.5 Punkte, Willkommensbonus 10", () => {
    expect(PP_CONFIG.perPaidBooking).toBe(0.5)
    expect(PP_CONFIG.signupBonus).toBe(10)
  })

  it("die Prämien-Schwellen steigen", () => {
    const schwellen = PP_REWARDS.map(r => r.threshold)
    expect([...schwellen].sort((a, b) => a - b)).toEqual(schwellen)
  })
})
