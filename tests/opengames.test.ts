import { describe, it, expect } from "vitest"
import {
  OG_PREIS_CHF, OG_STORNO_STUNDEN,
  OG_STANDORTE, gruppeFuerLevel, startZeit, stornoMoeglich,
} from "@/lib/opengames"

describe("Open Games — feste Abende", () => {
  it("kostet CHF 10 pro Person", () => {
    expect(OG_PREIS_CHF).toBe(10)
  })

  it("Glattbrugg: Do (Pro, 8 Plätze) und Sa (Einstieg+Pro, je 6)", () => {
    const gl = OG_STANDORTE.find(o => o.id === "glattbrugg")!
    const tage = gl.slots.map(s => s.day)
    expect(tage).toEqual([4, 6])                    // Do, Sa — kein Freitag mehr
    const doSlot = gl.slots.find(s => s.day === 4)!
    expect(doSlot.start).toBe(18); expect(doSlot.end).toBe(24)
    expect(doSlot.gruppen).toHaveLength(1)
    expect(doSlot.gruppen[0]).toMatchObject({ level: "4-7", plaetze: 8 })
    const saSlot = gl.slots.find(s => s.day === 6)!
    expect(saSlot.gruppen.map(g => g.plaetze)).toEqual([6, 6])
  })

  it("St. Gallen: Mo (Einstieg), Mi + Fr (Fortgeschritten), 18–22, je 6", () => {
    const sg = OG_STANDORTE.find(o => o.id === "stgallen")!
    expect(sg.slots.map(s => s.day)).toEqual([1, 3, 5])
    for (const s of sg.slots) {
      expect(s.start).toBe(18); expect(s.end).toBe(22)
      expect(s.gruppen).toHaveLength(1)
      expect(s.gruppen[0].plaetze).toBe(6)
    }
    expect(sg.slots.find(s => s.day === 1)!.gruppen[0].level).toBe("1-3")
    expect(sg.slots.find(s => s.day === 3)!.gruppen[0].level).toBe("4-7")
  })

  it("jeder Spieler landet in genau einer Gruppe", () => {
    expect(gruppeFuerLevel(1)).toBe("einstieg")
    expect(gruppeFuerLevel(3)).toBe("einstieg")
    expect(gruppeFuerLevel(4)).toBe("pro")
    expect(gruppeFuerLevel(7)).toBe("pro")
    expect(gruppeFuerLevel(null)).toBeNull()
  })

  it("die zwei Gruppen decken zusammen alle Level ab, ohne Überschneidung", () => {
    // Sonst gäbe es einen Level, für den es keinen Abend gibt — oder einen,
    // der in beide Gruppen dürfte.
    const zuordnung = [1, 2, 3, 4, 5, 6, 7].map(gruppeFuerLevel)
    expect(zuordnung.filter(Boolean)).toHaveLength(7)
    expect(new Set(zuordnung).size).toBe(2)
  })

  it("Absage bis 24 Stunden vorher — danach nicht mehr", () => {
    expect(OG_STORNO_STUNDEN).toBe(24)

    const in48h = new Date(Date.now() + 48 * 3600 * 1000)
    const in2h  = new Date(Date.now() + 2 * 3600 * 1000)
    const spiel = (d: Date) => ({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      start_hour: d.getHours(),
    })

    expect(stornoMoeglich(spiel(in48h))).toBe(true)
    expect(stornoMoeglich(spiel(in2h))).toBe(false)
  })

  it("die Startzeit trifft den richtigen Tag (keine Zeitzonen-Verschiebung)", () => {
    const z = startZeit({ date: "2026-07-16", start_hour: 19 })
    expect(z.getDate()).toBe(16)
    expect(z.getHours()).toBe(19)
  })
})
