/* ── INTEGRATIONSTEST: GUTSCHEINE IM CHECKOUT ────────────────────────────────
   Laeuft NICHT im normalen `npm test`. Er braucht die echte Datenbank, weil
   genau das geprueft werden soll: dass der Rabatt aus der Datenbankfunktion
   kommt und nicht aus dem Browser.

     PPL_DB_TEST=1 npx vitest run tests/gutschein-checkout.test.ts

   Stripe wird NICHT kontaktiert. Die Stripe-Klasse ist ersetzt; der Test
   liest mit, mit welchem Betrag sie aufgerufen worden waere. STRIPE_SECRET_KEY
   ist ein Platzhalter — es gibt weder eine Zahlung noch eine Live-Buchung.
   Supabase-Tabellen laufen im Speicher, nur die drei Gutschein-Funktionen
   gehen an die echte Datenbank. Angelegte Testcodes werden am Ende entfernt. */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { createClient as echterClient } from "@supabase/supabase-js"

const AKTIV = process.env.PPL_DB_TEST === "1"

// ── Mitschriften (hoisted, damit vi.mock sie sehen darf) ───────────────────
const H = vi.hoisted(() => ({
  stripe: [] as any[],
  mails: [] as string[],
  user: null as any,
  db: null as any,
}))

vi.mock("stripe", () => ({
  default: class FakeStripe {
    constructor(_key?: string) {}
    checkout = {
      sessions: {
        create: async (a: any) => {
          H.stripe.push(a)
          return { id: "cs_test_" + Math.random().toString(36).slice(2), url: "https://stripe.example/pay" }
        },
      },
    }
  },
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => H.db }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: H.user } }) } }) }))
vi.mock("@/lib/ratelimit", () => ({ rateLimited: () => false, clientIp: () => "127.0.0.1" }))
vi.mock("@/lib/email", () => ({
  melde: async (key: string, _ctx: any, p: Promise<any>) => { H.mails.push("melde:" + key); try { await p } catch { /* egal */ } },
  sendEmail: async (o: any) => { H.mails.push(`sn-bestaetigung:${o.to}`); return { ok: true } },
  sendBookingConfirm: async (o: any) => { H.mails.push(`og-bestaetigung:${o.to}:chf=${o.priceChf}:qr=${o.hatZutritt}`); return { ok: true } },
  sendTournamentConfirm: async (o: any) => { H.mails.push(`turnier-bestaetigung:${o.to}:chf=${o.startgeldChf}`); return { ok: true } },
  sendTournamentStaffNotice: async (o: any) => { H.mails.push(`turnier-staff:${o.zahlungsstatus}`); return { ok: true } },
}))

// ── Supabase-Attrappe: Tabellen im Speicher, rpc an die echte Datenbank ────
type Zeile = Record<string, any>
const gleich = (a: any, b: any) => a === b || (a != null && b != null && String(a) === String(b))

class Abfrage {
  private op: "select" | "insert" | "update" = "select"
  private daten: any = null
  private filter: Array<(r: Zeile) => boolean> = []
  private einzeln = false
  constructor(private db: FakeDb, private tabelle: string) {}
  select(_s?: string, _o?: any) { return this }
  insert(v: Zeile) { this.op = "insert"; this.daten = v; return this }
  update(v: Zeile) { this.op = "update"; this.daten = v; return this }
  eq(c: string, v: any) { this.filter.push(r => gleich(r[c], v)); return this }
  neq(c: string, v: any) { this.filter.push(r => !gleich(r[c], v)); return this }
  ilike(c: string, v: string) { this.filter.push(r => String(r[c] ?? "").toLowerCase() === String(v).replace(/%/g, "").toLowerCase()); return this }
  not(c: string, op: string, v: string) {
    if (op === "in") { const l = String(v).replace(/^\(|\)$/g, "").split(","); this.filter.push(r => !l.includes(String(r[c]))) }
    return this
  }
  order() { return this }
  limit() { return this }
  maybeSingle() { this.einzeln = true; return this.lauf() }
  single() { this.einzeln = true; return this.lauf() }
  then(a: any, b: any) { return this.lauf().then(a, b) }

  private async lauf(): Promise<{ data: any; error: any }> {
    const t = (this.db.tabellen[this.tabelle] ||= [])
    if (this.op === "insert") {
      const dop = this.db.istDoppelt(this.tabelle, this.daten)
      if (dop) return { data: null, error: { message: "duplicate key" } }
      const z = { id: this.daten.id ?? crypto.randomUUID(), ...this.daten }
      t.push(z)
      return { data: this.einzeln ? z : [z], error: null }
    }
    const treffer = t.filter(r => this.filter.every(f => f(r)))
    if (this.op === "update") {
      treffer.forEach(r => Object.assign(r, this.daten))
      return { data: this.einzeln ? (treffer[0] ?? null) : treffer, error: null }
    }
    return { data: this.einzeln ? (treffer[0] ?? null) : treffer, error: null }
  }
}

class FakeDb {
  tabellen: Record<string, Zeile[]> = {}
  mails: Record<string, string> = {}
  echt: any
  auth = {
    admin: { getUserById: async (id: string) => ({ data: { user: { id, email: this.mails[id] } } }) },
  }
  from(t: string) { return new Abfrage(this, t) }
  rpc(name: string, args: any) { return this.echt.rpc(name, args) }
  istDoppelt(tabelle: string, z: Zeile): boolean {
    if (tabelle !== "open_game_players") return false
    return (this.tabellen[tabelle] || []).some(r =>
      r.status !== "left" && gleich(r.game_id, z.game_id) && (
        (z.user_id && gleich(r.user_id, z.user_id)) ||
        (z.guest_email && String(r.guest_email ?? "").toLowerCase() === String(z.guest_email).toLowerCase())
      ))
  }
}

// ── Hilfen ─────────────────────────────────────────────────────────────────
function envLesen(): Record<string, string> {
  const p = path.resolve(__dirname, "..", ".env.local")
  const raus: Record<string, string> = {}
  if (!fs.existsSync(p)) return raus
  for (const zeile of fs.readFileSync(p, "utf8").split("\n")) {
    const m = zeile.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) raus[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return raus
}

function naechsterDonnerstag(): string {
  const d = new Date(); d.setDate(d.getDate() + 14)
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const TID = "11111111-1111-4111-8111-111111111111"
const REG = "22222222-2222-4222-8222-222222222222"
const OGID = "33333333-3333-4333-8333-333333333333"
const SNID = "44444444-4444-4444-8444-444444444444"

function frischeDb(): FakeDb {
  const db = new FakeDb()
  db.echt = (globalThis as any).__pplEcht
  const datum = naechsterDonnerstag()
  db.tabellen.player_tournaments = [{
    id: TID, name: "Testturnier", entry_fee_chf: 25, payment_mode: "online",
    max_players: 16, status: "open", date: datum, start_time: "10:00", end_time: "16:00", city: "Zürich",
  }]
  db.tabellen.tournament_registrations = [{
    id: REG, tournament_id: TID, payment_status: "none", waitlist: false, status: "active",
    email: "spieler@example.com", first_name: "Test", last_name: "Person", phone: "", self_rating: null,
    amount_chf: null, begleitung: null,
  }]
  db.tabellen.open_games = [
    { id: OGID, is_official: true, kind: "open_game", status: "open", date: datum, start_hour: 19,
      max_players: 6, current_players: 0, price_per_player: 10, level: "alle", location_name: "Glattbrugg" },
    { id: SNID, is_official: true, kind: "single_night", status: "open", date: datum, start_hour: 19, max_players: 32 },
  ]
  db.tabellen.open_game_players = []
  db.tabellen.single_night_bookings = []
  db.tabellen.ping_points_transactions = []
  db.tabellen.profiles = []
  return db
}

function anfrage(body: any): any {
  return {
    json: async () => body,
    headers: new Headers(),
    url: "https://playerapp.ch/api/test",
  }
}

const P = (id: string) => Promise.resolve({ id })

// ── Testcodes ──────────────────────────────────────────────────────────────
const CODES = [
  { code: "ZZE2E20", value: 20 }, { code: "ZZE2E30", value: 30 },
  { code: "ZZE2E50", value: 50 }, { code: "ZZE2E100", value: 100 },
]

describe.skipIf(!AKTIV)("Gutscheine im Checkout — Turnier, Open Game, Single Night", () => {
  let echt: any

  beforeAll(async () => {
    const env = envLesen()
    process.env.STRIPE_SECRET_KEY = "sk_test_platzhalter_kein_echter_schluessel"
    echt = echterClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    ;(globalThis as any).__pplEcht = echt
    await echt.from("discount_codes").delete().like("code", "ZZE2E%")
    for (const c of CODES) {
      const { error } = await echt.from("discount_codes").insert({
        code: c.code, kind: "percent", value: c.value,
        scope: ["tournament", "open_game", "single_night"], label: "Integrationstest",
      })
      if (error) throw new Error("Testcode konnte nicht angelegt werden: " + error.message)
    }
    const { error: zusatzFehler } = await echt.from("discount_codes").insert([
      { code: "ZZE2ELIMIT",   kind: "percent", value: 50, scope: ["tournament"], max_uses: 1,    expires_at: null, is_active: true,  label: "Integrationstest" },
      { code: "ZZE2EABBRUCH", kind: "percent", value: 50, scope: ["tournament"], max_uses: 1,    expires_at: null, is_active: true,  label: "Integrationstest" },
      { code: "ZZE2EAB",      kind: "percent", value: 50, scope: ["tournament"], max_uses: null, expires_at: new Date(Date.now() - 86400000).toISOString(), is_active: true, label: "Integrationstest" },
      { code: "ZZE2EINAKT",   kind: "percent", value: 50, scope: ["tournament"], max_uses: null, expires_at: null, is_active: false, label: "Integrationstest" },
      { code: "ZZE2ESHOP",    kind: "percent", value: 50, scope: ["shop"],       max_uses: null, expires_at: null, is_active: true,  label: "Integrationstest" },
    ])
    if (zusatzFehler) throw new Error("Zusatz-Testcodes: " + zusatzFehler.message)
  })

  afterAll(async () => {
    if (!echt) return
    await echt.from("voucher_redemptions").delete().like("code", "ZZE2E%")
    await echt.from("discount_codes").delete().like("code", "ZZE2E%")
  })

  beforeEach(() => { H.stripe.length = 0; H.mails.length = 0; H.user = null; H.db = frischeDb() })

  // ══════════════════════════════════════════════════════════ TURNIER ══════
  describe("Turnier · Startgeld CHF 25", () => {
    it.each([[20, 20], [30, 17.5], [50, 12.5]])("%i %% → Stripe bekommt CHF %s", async (stufe, erwartet) => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const r = await POST(anfrage({ registration_id: REG, gutschein_code: `ZZE2E${stufe}` }), { params: P(TID) })
      const j = await r.json()
      expect(j.prozent).toBe(stufe)
      expect(j.preis).toBe(erwartet)
      expect(j.preisVorher).toBe(25)
      expect(H.stripe).toHaveLength(1)
      expect(H.stripe[0].line_items[0].price_data.unit_amount).toBe(Math.round(erwartet * 100))
      expect(H.stripe[0].metadata.gutschein_code).toBe(`ZZE2E${stufe}`)
      const reg = H.db.tabellen.tournament_registrations[0]
      expect(Number(reg.amount_chf)).toBe(erwartet)
      expect(reg.payment_status).toBe("pending")
    })

    it("100 % → gar kein Stripe, Anmeldung gratis bestaetigt, Mails raus", async () => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const r = await POST(anfrage({ registration_id: REG, gutschein_code: "ZZE2E100" }), { params: P(TID) })
      const j = await r.json()
      expect(j.gratis).toBe(true)
      expect(j.preis).toBe(0)
      expect(H.stripe).toHaveLength(0)
      const reg = H.db.tabellen.tournament_registrations[0]
      expect(reg.payment_status).toBe("free")
      expect(Number(reg.amount_chf)).toBe(0)
      expect(H.mails.some(m => m.startsWith("turnier-bestaetigung:spieler@example.com:chf=0"))).toBe(true)
      expect(H.mails.some(m => m.startsWith("turnier-staff:gratis"))).toBe(true)
    })

    it("100 %: Einloesung genau einmal gezaehlt, Webhook-Wiederholung zaehlt nicht nach", async () => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      await POST(anfrage({ registration_id: REG, gutschein_code: "ZZE2E100" }), { params: P(TID) })
      const { data: e1 } = await echt.from("voucher_redemptions").select("status").eq("ref_id", REG)
      expect(e1).toHaveLength(1)
      expect(e1[0].status).toBe("confirmed")

      const { schliesseAbTurnier } = await import("@/lib/abschluss")
      H.mails.length = 0
      const nochmal = await schliesseAbTurnier(H.db as any, REG, { neuerStatus: "paid", gutscheinCode: "ZZE2E100", betragChf: 0 })
      expect(nochmal.ok).toBe(false)
      expect(H.mails).toHaveLength(0)
      const { data: e2 } = await echt.from("voucher_redemptions").select("status").eq("ref_id", REG)
      expect(e2).toHaveLength(1)
    })

    it("ungueltiger Code wird abgewiesen, kein Stripe, keine Reservierung", async () => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const r = await POST(anfrage({ registration_id: REG, gutschein_code: "GIBTSNICHT" }), { params: P(TID) })
      expect(r.status).toBe(400)
      const j = await r.json()
      expect(j.gutscheinFehler).toBe("unbekannt")
      expect(H.stripe).toHaveLength(0)
      expect(H.db.tabellen.tournament_registrations[0].payment_status).toBe("none")
    })

    it("ohne Code bleibt alles wie bisher: voller Preis", async () => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const r = await POST(anfrage({ registration_id: REG }), { params: P(TID) })
      const j = await r.json()
      expect(j.prozent).toBe(0)
      expect(H.stripe[0].line_items[0].price_data.unit_amount).toBe(2500)
      expect(H.stripe[0].metadata.gutschein_code).toBe("")
    })
  })

  // ════════════════════════════════════════════════════════ OPEN GAME ══════
  describe("Open Game · CHF 10", () => {
    const gast = { name: "Test Gast", email: "gast@example.com", phone: "079", staerke: "einstieg" }

    it.each([[20, 8], [30, 7], [50, 5]])("%i %% → Stripe bekommt CHF %s", async (stufe, erwartet) => {
      const { POST } = await import("@/app/api/match/[id]/checkout/route")
      const r = await POST(anfrage({ guest: gast, gutschein_code: `ZZE2E${stufe}` }), { params: P(OGID) })
      const j = await r.json()
      expect(j.preis).toBe(erwartet)
      expect(H.stripe[0].line_items[0].price_data.unit_amount).toBe(Math.round(erwartet * 100))
      expect(H.stripe[0].metadata.gutschein_code).toBe(`ZZE2E${stufe}`)
      expect(H.stripe[0].metadata.gutschein_ref).toMatch(/^[0-9a-f-]{36}$/)
      // Platz erst nach der Zahlung — hier noch keine Teilnehmerzeile
      expect(H.db.tabellen.open_game_players).toHaveLength(0)
    })

    it("100 % → kein Stripe, Platz vergeben, amount_chf 0, Bestaetigung mit Zutritts-QR", async () => {
      const { POST } = await import("@/app/api/match/[id]/checkout/route")
      const r = await POST(anfrage({ guest: gast, gutschein_code: "ZZE2E100" }), { params: P(OGID) })
      const j = await r.json()
      expect(j.gratis).toBe(true)
      expect(H.stripe).toHaveLength(0)
      const p = H.db.tabellen.open_game_players
      expect(p).toHaveLength(1)
      expect(p[0].paid).toBe(true)
      expect(Number(p[0].amount_chf)).toBe(0)
      expect(p[0].gutschein_ref).toBeTruthy()
      expect(H.db.tabellen.open_games[0].current_players).toBe(1)
      expect(H.mails.some(m => m === "og-bestaetigung:gast@example.com:chf=0:qr=true")).toBe(true)
      const { data } = await echt.from("voucher_redemptions").select("status").eq("ref_id", p[0].gutschein_ref)
      expect(data).toHaveLength(1)
      expect(data[0].status).toBe("confirmed")
    })

    it("PingPoints und Gutschein zusammen werden abgewiesen", async () => {
      H.user = { id: "55555555-5555-4555-8555-555555555555" }
      H.db.tabellen.profiles = [{ id: H.user.id, level: 3, name: "Spieler" }]
      const { POST } = await import("@/app/api/match/[id]/checkout/route")
      const r = await POST(anfrage({ redeem: true, gutschein_code: "ZZE2E50" }), { params: P(OGID) })
      expect(r.status).toBe(400)
      expect(H.stripe).toHaveLength(0)
    })
  })


  // ═══════════════════════════════════════════ ABGEWIESENE CODES ══════════
  describe("Codes, die abgewiesen werden muessen", () => {
    it.each([
      ["ZZE2EAB", "abgelaufen"],
      ["ZZE2EINAKT", "inaktiv"],
      ["ZZE2ESHOP", "falsche_art"],
      ["GIBTSNICHT", "unbekannt"],
    ])("%s → %s", async (code, grund) => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const r = await POST(anfrage({ registration_id: REG, gutschein_code: code }), { params: P(TID) })
      expect(r.status).toBe(400)
      expect((await r.json()).gutscheinFehler).toBe(grund)
      expect(H.stripe).toHaveLength(0)
    })

    it("ausgeschoepfter Code wird abgewiesen — und zwei gleichzeitige Versuche ueberbuchen ihn nicht", async () => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const REG2 = "66666666-6666-4666-8666-666666666666"
      const REG3 = "77777777-7777-4777-8777-777777777777"
      const vorlage = H.db.tabellen.tournament_registrations[0]
      H.db.tabellen.tournament_registrations.push({ ...vorlage, id: REG2 }, { ...vorlage, id: REG3 })

      // ECHT gleichzeitig, gegen die echte Datenbank, Kontingent 1
      const [a, b] = await Promise.all([
        POST(anfrage({ registration_id: REG, gutschein_code: "ZZE2ELIMIT" }), { params: P(TID) }),
        POST(anfrage({ registration_id: REG2, gutschein_code: "ZZE2ELIMIT" }), { params: P(TID) }),
      ])
      const codes = [a.status, b.status].sort()
      expect(codes).toEqual([200, 400])

      // dritter Versuch danach: klar abgewiesen
      const c = await POST(anfrage({ registration_id: REG3, gutschein_code: "ZZE2ELIMIT" }), { params: P(TID) })
      expect(c.status).toBe(400)
      expect((await c.json()).gutscheinFehler).toBe("kontingent")

      const { data } = await echt.from("voucher_redemptions").select("status").eq("code", "ZZE2ELIMIT")
      expect(data.filter((r: any) => r.status !== "released")).toHaveLength(1)
      expect(H.stripe).toHaveLength(1)
    })

    it("Checkout-Abbruch gibt das Kontingent wieder her", async () => {
      const { POST } = await import("@/app/api/turniere/[id]/checkout/route")
      const r1 = await POST(anfrage({ registration_id: REG, gutschein_code: "ZZE2EABBRUCH" }), { params: P(TID) })
      expect(r1.status).toBe(200)

      // das macht der Webhook bei checkout.session.expired
      const { gibGutscheinFrei } = await import("@/lib/gutschein")
      await gibGutscheinFrei(H.db as any, "tournament", REG)

      const REG4 = "88888888-8888-4888-8888-888888888888"
      H.db.tabellen.tournament_registrations.push({ ...H.db.tabellen.tournament_registrations[0], id: REG4, payment_status: "none" })
      const r2 = await POST(anfrage({ registration_id: REG4, gutschein_code: "ZZE2EABBRUCH" }), { params: P(TID) })
      expect(r2.status).toBe(200)
      expect((await r2.json()).prozent).toBe(50)
    })
  })

  // ═════════════════════════════════════════════════════ SINGLE NIGHT ══════
  describe("Single Night · Ticket CHF 29", () => {
    const gast = { name: "Test Gast", email: "sn@example.com", phone: "079" }

    it.each([[20, 23.2], [30, 20.3], [50, 14.5]])("Herren %i %% → Stripe bekommt CHF %s", async (stufe, erwartet) => {
      const { POST } = await import("@/app/api/single-night/checkout/route")
      const r = await POST(anfrage({ event_id: SNID, ticket_type: "herren", guest: gast, gutschein_code: `ZZE2E${stufe}` }))
      const j = await r.json()
      expect(j.preis).toBe(erwartet)
      expect(H.stripe[0].line_items[0].price_data.unit_amount).toBe(Math.round(erwartet * 100))
      const b = H.db.tabellen.single_night_bookings[0]
      expect(Number(b.amount_chf)).toBe(erwartet)
      expect(b.persons).toBe(1)
    })

    it("Damen 2-fuer-1: erst der Paarpreis, dann der Gutschein — 50 % von 29 = 14.50 fuer zwei", async () => {
      const { POST } = await import("@/app/api/single-night/checkout/route")
      const r = await POST(anfrage({ event_id: SNID, ticket_type: "damen2for1", guest: gast, gutschein_code: "ZZE2E50" }))
      const j = await r.json()
      expect(j.preisVorher).toBe(29)
      expect(j.preis).toBe(14.5)
      expect(H.stripe[0].line_items[0].price_data.unit_amount).toBe(1450)
      const b = H.db.tabellen.single_night_bookings[0]
      expect(b.persons).toBe(2)
      expect(Number(b.amount_chf)).toBe(14.5)
    })

    it("Damen 2-fuer-1 mit 100 % → gratis fuer zwei, kein Stripe, Ticket bestaetigt", async () => {
      const { POST } = await import("@/app/api/single-night/checkout/route")
      const r = await POST(anfrage({ event_id: SNID, ticket_type: "damen2for1", guest: gast, gutschein_code: "ZZE2E100" }))
      const j = await r.json()
      expect(j.gratis).toBe(true)
      expect(H.stripe).toHaveLength(0)
      const b = H.db.tabellen.single_night_bookings[0]
      expect(b.payment_status).toBe("paid")
      expect(Number(b.amount_chf)).toBe(0)
      expect(b.persons).toBe(2)
      expect(H.mails.some(m => m === "sn-bestaetigung:sn@example.com")).toBe(true)
      const { data } = await echt.from("voucher_redemptions").select("status").eq("ref_id", b.id)
      expect(data).toHaveLength(1)
      expect(data[0].status).toBe("confirmed")
    })

    it("abgewiesener Code gibt die Platzreservierung wieder her", async () => {
      const { POST } = await import("@/app/api/single-night/checkout/route")
      const r = await POST(anfrage({ event_id: SNID, ticket_type: "herren", guest: gast, gutschein_code: "GIBTSNICHT" }))
      expect(r.status).toBe(400)
      expect(H.stripe).toHaveLength(0)
      expect(H.db.tabellen.single_night_bookings[0].payment_status).toBe("cancelled")
    })
  })
})
