import { describe, it, expect } from "vitest"
import { streakLine } from "../lib/streak"

describe("streakLine", () => {
  it("zeigt nichts ohne Serie", () => {
    expect(streakLine(true, 0)).toBeNull()
    expect(streakLine(false, 0)).toBeNull()
  })

  it("feiert einen Einzelsieg NICHT extra", () => {
    expect(streakLine(true, 1)).toBeNull()
  })

  it("feiert ab zwei Siegen in Folge, mit Feuer-Optik", () => {
    const two = streakLine(true, 2)
    expect(two).not.toBeNull()
    expect(two!.fire).toBe(true)
    const three = streakLine(true, 3)
    expect(three!.fire).toBe(true)
    expect(three!.text).toMatch(/on fire|Folge/i)
  })

  it("nervt bei 1–3 Niederlagen NICHT (keine Meldung)", () => {
    for (const n of [1, 2, 3]) expect(streakLine(false, n)).toBeNull()
  })

  it("verweist erst ab 4 Niederlagen in Folge aufs Training", () => {
    const l = streakLine(false, 4)
    expect(l).not.toBeNull()
    expect(l!.fire).toBe(false)
    expect(l!.cta?.href).toBe("/training")
  })
})
