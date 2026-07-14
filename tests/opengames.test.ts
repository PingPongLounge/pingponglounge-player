import { describe, it, expect } from "vitest"
import {
  OG_PREIS_CHF, OG_DAUER_MIN, OG_PLAETZE_PRO_GRUPPE, OG_STORNO_STUNDEN,
  OG_GRUPPEN, OG_STANDORTE, gruppeFuerLevel, startZeit, stornoMoeglich,
} from "@/lib/opengames"

describe("Open Games — feste Abende", () => {
  it("kostet CHF 10 für 4 Stunden", () => {
    expect(OG_PREIS_CHF).toBe(10)
    expect(OG_DAUER_MIN).toBe(240)
  })

  it("12 Plätze pro Abend: zwei Gruppen à 6", () => {
    expect(OG_GRUPPEN).toHaveLength(2)
    expect(OG_PLAETZE_PRO_GRUPPE * OG_GRUPPEN.length).toBe(12)
  })

  it("Glattbrugg spielt Do, Fr, Sa — St. Gallen Mo, Mi, Fr, Sa", () => {
    const gl = OG_STANDORTE.find(o => o.id === "glattbrugg")!
    const sg = OG_STANDORTE.find(o => o.id === "stgallen")!
    expect(gl.tage).toEqual([4, 5, 6])
    expect(sg.tage).toEqual([1, 3, 5, 6])
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
