import { describe, it, expect } from "vitest"
import { planyoBookingUrl, planyoReserveConfigured, planyoUnix, PLANYO_CALENDAR, PLANYO_RESOURCE } from "@/lib/planyo"

describe("Planyo-Helfer", () => {
  it("Booking-URL enthält den Kalender", () => {
    expect(planyoBookingUrl()).toContain(`calendar=${PLANYO_CALENDAR}`)
  })

  it("Booking-URL wählt die Ressource vor, wenn bekannt", () => {
    const url = planyoBookingUrl("Langstrasse")
    expect(url).toContain(`resource_id=${PLANYO_RESOURCE["Langstrasse"]}`)
  })

  it("Unbekannter Standort → nur Kalender, keine resource_id", () => {
    expect(planyoBookingUrl("Glattbrugg")).not.toContain("resource_id=")
  })

  it("Auto-Reservierung ist ohne API-Key nicht konfiguriert", () => {
    const prev = process.env.PLANYO_API_KEY
    delete process.env.PLANYO_API_KEY
    expect(planyoReserveConfigured("Langstrasse")).toBe(false)
    if (prev) process.env.PLANYO_API_KEY = prev
  })

  it("Auto-Reservierung braucht Key UND bekannte Ressource", () => {
    const prev = process.env.PLANYO_API_KEY
    process.env.PLANYO_API_KEY = "dummy"
    expect(planyoReserveConfigured("Langstrasse")).toBe(true)   // hat Ressource
    expect(planyoReserveConfigured("Glattbrugg")).toBe(false)   // Ressource fehlt noch
    if (prev) process.env.PLANYO_API_KEY = prev; else delete process.env.PLANYO_API_KEY
  })

  it("End-Zeit = Start + Dauer (in Sekunden)", () => {
    const start = planyoUnix("2026-08-19", 19)
    const end = start + 90 * 60
    expect(end - start).toBe(5400)
  })
})
