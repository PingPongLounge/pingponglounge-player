import { describe, it, expect } from "vitest"
import { berechneElo, eloPreview, K, ELO_FLOOR } from "@/lib/elo"
import {
  LIGEN, LEAGUE_CUT, ligaForRank, pairForLevel, pairForSeason,
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

describe("Die vier Ligen", () => {
  it("Platz 1 bis 24 ist die obere Liga, ab 25 die untere", () => {
    expect(ligaForRank("pro", 1).key).toBe("elite")
    expect(ligaForRank("pro", LEAGUE_CUT).key).toBe("elite")
    expect(ligaForRank("pro", LEAGUE_CUT + 1).key).toBe("advanced")
    expect(ligaForRank("einstieg", 1).key).toBe("challenger")
    expect(ligaForRank("einstieg", LEAGUE_CUT + 1).key).toBe("rookie")
  })

  it("jede Liga gehört zu genau einer Tabelle", () => {
    expect(LIGEN.filter(l => l.pair === "pro")).toHaveLength(2)
    expect(LIGEN.filter(l => l.pair === "einstieg")).toHaveLength(2)
  })

  it("Level 1–3 spielen Einstieg, Level 4–7 Pro", () => {
    expect(pairForLevel(1)).toBe("einstieg")
    expect(pairForLevel(3)).toBe("einstieg")
    expect(pairForLevel(4)).toBe("pro")
    expect(pairForLevel(7)).toBe("pro")
    expect(pairForLevel(null)).toBeNull()
    expect(pairForLevel(9)).toBeNull()      // ausserhalb 1–7 → keine Tabelle
  })

  it("die Saison-Klasse führt in dieselbe Tabelle wie das Level", () => {
    // Sonst sitzt ein Spieler in der Pro-Saison, gehört aber ins Einstieg-Paar
    // und kann niemanden fordern. Genau das war mal der Fall.
    expect(pairForSeason("4-7")).toBe(pairForLevel(5))
    expect(pairForSeason("1-3")).toBe(pairForLevel(2))
  })
})

describe("Limits und Fristen", () => {
  it("höchstens 5 gewertete Spiele gegen denselben Gegner", () => {
    expect(MAX_RANKED_PER_OPPONENT).toBe(5)
  })

  it("4 Liga-Matches im Monat, sonst 20 Punkte Abzug", () => {
    expect(MIN_MATCHES_PER_MONTH).toBe(4)
    expect(MONTHLY_PENALTY_ELO).toBe(20)
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

  it("10 bezahlte Buchungen ergeben genau eine Gratisstunde", () => {
    // Das steht so auf der PingPoints-Seite. Ändert jemand perPaidBooking,
    // muss dieser Test brechen — sonst stimmt das Versprechen nicht mehr.
    const gratisStunde = PP_REWARDS.find(r => r.type === "play")!
    expect(PP_CONFIG.perPaidBooking * 10).toBe(gratisStunde.threshold)
  })

  it("ein Punkt ist überall gleich viel wert", () => {
    // 50 Punkte = 1 Stunde Tisch (ca. CHF 25) → 1 Punkt = CHF 0.50.
    // Beim Buchen war ein Punkt früher CHF 2 wert — derselbe Punkt hatte je
    // nach Bildschirm einen anderen Preis.
    const gratisStunde = PP_REWARDS.find(r => r.type === "play")!
    expect(gratisStunde.threshold * PP_CHF).toBe(25)
  })

  it("die Prämien-Schwellen steigen", () => {
    const schwellen = PP_REWARDS.map(r => r.threshold)
    expect([...schwellen].sort((a, b) => a - b)).toEqual(schwellen)
  })
})
