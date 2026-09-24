/* ── STORNO AUS DER BESTAETIGUNGSMAIL ────────────────────────────────────────
   Der Gast hat keine Session, nur den cancel_token aus seiner Mail.

   Geprueft wird genau der Fehler, der beim Trainingscamp steckte: die
   Aktualisierung filterte auf booking_id. Storniert der Gast ueber den Token,
   ist booking_id gar nicht gesetzt — die Bedingung traf auf keine Zeile zu,
   und er bekam "Bereits verarbeitet" statt einer Absage. Richtig ist b.id.

   Keine Datenbank, kein Stripe, keine Mail: Tabellen laufen im Speicher.     */

import { beforeEach, describe, expect, it, vi } from "vitest"

const H = vi.hoisted(() => ({ db: null as any, user: null as any }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => H.db }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: H.user } }) } }) }))
vi.mock("@/lib/gutschein", () => ({ gibGutscheinFrei: async () => ({ ok: true }) }))

type Zeile = Record<string, any>
const gleich = (a: any, b: any) => a === b || (a != null && b != null && String(a) === String(b))

function db(tabellen: Record<string, Zeile[]>) {
  return {
    tabellen,
    from(name: string) {
      const rows = () => (tabellen[name] ||= [])
      let modus: "select" | "update" = "select"
      let patch: Zeile = {}
      const filter: Array<(r: Zeile) => boolean> = []
      const api: any = {
        select() { return api },
        update(p: Zeile) { modus = "update"; patch = p; return api },
        eq(k: string, v: any) { filter.push(r => gleich(r[k], v)); return api },
        in(k: string, vs: any[]) { filter.push(r => vs.some(v => gleich(r[k], v))); return api },
        async maybeSingle() {
          const treffer = rows().filter(r => filter.every(f => f(r)))
          if (modus === "update") {
            for (const r of treffer) Object.assign(r, patch)
            return { data: treffer[0] ?? null, error: null }
          }
          return { data: treffer[0] ?? null, error: null }
        },
      }
      return api
    },
  }
}

describe("Storno mit Token — ohne Login, richtige Zeile", () => {
  beforeEach(() => { H.user = null })

  it("Trainingscamp: Token storniert GENAU diese Buchung", async () => {
    const meine = { id: "camp-1", user_id: null, session_ids: [], payment_status: "paid", cancel_token: "TOK-MEINE", cancelled_at: null, reserved_until: null }
    const fremde = { id: "camp-2", user_id: null, session_ids: [], payment_status: "paid", cancel_token: "TOK-FREMDE", cancelled_at: null, reserved_until: null }
    H.db = db({ camp_bookings: [meine, fremde] })

    const { POST } = await import("@/app/api/trainingscamp/cancel/route")
    const r = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ token: "TOK-MEINE" }) }) as any)
    const j = await r.json()

    expect(r.status).toBe(200)
    expect(j.ok).toBe(true)
    expect(meine.payment_status).toBe("cancelled")
    expect(fremde.payment_status).toBe("paid")   // die fremde bleibt unberuehrt
  })

  it("Trainingscamp: falscher Token storniert nichts", async () => {
    const b = { id: "camp-1", user_id: null, session_ids: [], payment_status: "paid", cancel_token: "TOK-ECHT", cancelled_at: null, reserved_until: null }
    H.db = db({ camp_bookings: [b] })
    const { POST } = await import("@/app/api/trainingscamp/cancel/route")
    const r = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ token: "TOK-FALSCH" }) }) as any)
    expect(r.status).toBe(404)
    expect(b.payment_status).toBe("paid")
  })

  it("Single Night: Token storniert GENAU diese Buchung", async () => {
    const meine = { id: "sn-1", user_id: null, payment_status: "paid", cancel_token: "TOK-SN", event_id: "ev-1", cancelled_at: null, reserved_until: null }
    const fremde = { id: "sn-2", user_id: null, payment_status: "paid", cancel_token: "TOK-ANDERS", event_id: "ev-1", cancelled_at: null, reserved_until: null }
    H.db = db({ single_night_bookings: [meine, fremde], single_night_events: [{ id: "ev-1", date: "2099-01-01", start_time: "20:00" }] })

    const { POST } = await import("@/app/api/single-night/cancel/route")
    const r = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ token: "TOK-SN" }) }) as any)

    expect(r.status).toBe(200)
    expect(meine.payment_status).toBe("cancelled")
    expect(fremde.payment_status).toBe("paid")
  })
})
