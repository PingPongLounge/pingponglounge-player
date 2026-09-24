/* ── OHNE LOGIN ERREICHBAR ───────────────────────────────────────────────────
   Drei Routen muessen ohne Session durchkommen:

   - /api/gutschein/pruefen      ruft pingponglounge.ch serverseitig auf, ohne
                                 Cookies. Mit 401 sagte der Knopf ANWENDEN bei
                                 JEDEM Code "konnte nicht geprueft werden".
   - /api/single-night/cancel    der Gast hat nur den Link aus seiner Mail.
   - /api/trainingscamp/cancel   dasselbe.

   Die Routen pruefen den Token selbst; ohne ihn laesst keine von ihnen etwas
   zu. Hier wird nur geprueft, dass die Middleware sie nicht vorher abweist —
   und dass sie weiterhin abweist, was sie abweisen soll.                     */

import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}))

const anfrage = (pfad: string, method = "POST") =>
  new NextRequest(new URL("https://playerapp.ch" + pfad), { method })

describe("Middleware — ohne Login", () => {
  it.each(["/api/gutschein/pruefen", "/api/single-night/cancel", "/api/trainingscamp/cancel"])(
    "%s kommt durch", async (pfad) => {
      const { middleware } = await import("@/middleware")
      const r = await middleware(anfrage(pfad))
      expect(r.status).not.toBe(401)
      expect(r.headers.get("location")).toBeNull()   // keine Umleitung zum Login
    })

  it.each(["/api/turniere/neu", "/api/gutschein/einloesen"])(
    "%s bleibt geschuetzt", async (pfad) => {
      const { middleware } = await import("@/middleware")
      const r = await middleware(anfrage(pfad))
      expect(r.status).toBe(401)
    })
})
