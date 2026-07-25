import { describe, it, expect } from "vitest"
import { campPrice, CAMP_SESSION_IDS, isCampSessionId } from "@/lib/camp"

describe("campPrice — gestaffelter Rabatt", () => {
  it("nichts gewählt = 0", () => {
    expect(campPrice([])).toMatchObject({ total: 0, save: 0, fullDays: 0, halfDays: 0 })
  })
  it("ein Halbtag = 75, kein Rabatt", () => {
    expect(campPrice(["do-vm"])).toMatchObject({ total: 75, save: 0, halfDays: 1, fullDays: 0 })
  })
  it("zwei Halbtage an verschiedenen Tagen = 150, kein Rabatt", () => {
    expect(campPrice(["do-vm", "fr-vm"])).toMatchObject({ total: 150, save: 0, halfDays: 2, fullDays: 0 })
  })
  it("Ganztag (beide Einheiten) = 150", () => {
    expect(campPrice(["do-vm", "do-nm"])).toMatchObject({ total: 150, save: 0, fullDays: 1, halfDays: 0 })
  })
  it("2 ganze Tage = 275 (spart 25)", () => {
    expect(campPrice(["do-vm", "do-nm", "fr-vm", "fr-nm"])).toMatchObject({ total: 275, save: 25, fullDays: 2 })
  })
  it("3 ganze Tage = 390 (spart 60)", () => {
    expect(campPrice(["do-vm", "do-nm", "fr-vm", "fr-nm", "sa-vm", "sa-nm"])).toMatchObject({ total: 390, save: 60, fullDays: 3 })
  })
  it("ganzes Camp (4 Tage) = 500 (spart 100)", () => {
    expect(campPrice(CAMP_SESSION_IDS)).toMatchObject({ total: 500, save: 100, fullDays: 4, halfDays: 0 })
  })
  it("2 ganze Tage + 1 Halbtag = 350", () => {
    expect(campPrice(["do-vm", "do-nm", "fr-vm", "fr-nm", "sa-vm"])).toMatchObject({ total: 350, fullDays: 2, halfDays: 1 })
  })
  it("Duplikate und ungültige IDs werden ignoriert", () => {
    expect(campPrice(["do-vm", "do-vm", "quatsch"])).toMatchObject({ total: 75, count: 1 })
  })
  it("isCampSessionId", () => {
    expect(isCampSessionId("do-vm")).toBe(true)
    expect(isCampSessionId("xx-yy")).toBe(false)
  })
})
