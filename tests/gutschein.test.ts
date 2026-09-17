import { describe, expect, it } from "vitest"
import { normCode, rabattiere, REF_TABELLE, STUFEN } from "@/lib/gutschein"
import { snTicket } from "@/lib/opengames"

/* Die Rechnung selbst — die Stelle, an der ein falsch gerundeter Rappen
   entsteht. Alles Weitere (Kontingent, Ablauf, Nebenlaeufigkeit) haengt an
   der Datenbank und wird dort geprueft, nicht hier. */

describe("Rabattstufen", () => {
  it("kennt genau vier Stufen", () => {
    expect([...STUFEN]).toEqual([20, 30, 50, 100])
  })

  it("rechnet die vier Stufen auf ein Turnier-Startgeld von 25", () => {
    expect(rabattiere(25, 20)).toBe(20)
    expect(rabattiere(25, 30)).toBe(17.5)
    expect(rabattiere(25, 50)).toBe(12.5)
    expect(rabattiere(25, 100)).toBe(0)
  })

  it("rechnet auf den Open-Game-Preis von 10", () => {
    expect(rabattiere(10, 20)).toBe(8)
    expect(rabattiere(10, 30)).toBe(7)
    expect(rabattiere(10, 50)).toBe(5)
    expect(rabattiere(10, 100)).toBe(0)
  })

  it("rechnet auf den Trainingspreis von 29", () => {
    expect(rabattiere(29, 20)).toBe(23.2)
    expect(rabattiere(29, 30)).toBe(20.3)
    expect(rabattiere(29, 50)).toBe(14.5)
    expect(rabattiere(29, 100)).toBe(0)
  })

  it("Single Night «2 für 1»: der Rabatt gilt auf den TICKETPREIS, nicht pro Person", () => {
    // Entscheid Oliver, 17.09.2026 — CHF 29 fuer zwei, 50 % = 14.50 fuer zwei.
    const damen = snTicket("damen") ?? snTicket("frauen")
    const preis = damen?.price ?? 29
    expect(rabattiere(preis, 50)).toBe(preis / 2)
    expect(rabattiere(preis, 100)).toBe(0)
  })

  it("rundet auf Rappen, nie darunter", () => {
    expect(rabattiere(13.35, 30)).toBe(9.35)   // 9.345 → 9.35
    expect(rabattiere(0.05, 50)).toBe(0.03)    // 0.025 → 0.03
    expect(Number.isInteger(rabattiere(19.99, 20) * 100)).toBe(true)
  })
})

describe("Code normalisieren", () => {
  it("macht Grossbuchstaben und schneidet Rand weg", () => {
    expect(normCode("  ppl20 ")).toBe("PPL20")
  })
  it("verträgt Unsinn", () => {
    expect(normCode(null)).toBe("")
    expect(normCode(undefined)).toBe("")
    expect(normCode(12345)).toBe("12345")
  })
  it("begrenzt die Länge", () => {
    expect(normCode("A".repeat(80)).length).toBe(40)
  })
})

describe("Zuordnung Eventart → Tabelle", () => {
  it("zeigt auf die drei echten Teilnehmertabellen", () => {
    expect(REF_TABELLE.tournament).toBe("tournament_registrations")
    expect(REF_TABELLE.open_game).toBe("open_game_players")
    expect(REF_TABELLE.single_night).toBe("single_night_bookings")
  })
})
