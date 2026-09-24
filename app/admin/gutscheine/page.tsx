"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { STAFF_EMAILS } from "@/lib/staff"
import { SCHWARZ, CREME, VIOLETT, INTER, SUB, MUT, CARD, CELL, LINE } from "@/app/theme"

/* Gutscheinverwaltung — bewusst schlicht. Eine Liste, ein Formular.
   Der Zugang hier ist Komfort; entschieden wird in /api/admin/gutscheine. */

type Code = {
  id: string; code: string; value: number; scope: string[]
  location_name: string | null; event_id: string | null
  is_active: boolean; expires_at: string | null; max_uses: number | null
  label: string | null; eingeloest: number; reserviert: number
}

const ARTEN = [
  { key: "tournament", label: "Turniere" },
  { key: "open_game", label: "Open Games" },
  { key: "single_night", label: "Single Nights" },
] as const

const feld: React.CSSProperties = {
  width: "100%", background: "#0E0E10", border: `1px solid ${LINE}`, borderRadius: 10,
  padding: "13px 14px", fontSize: 16, color: CREME, outline: "none", fontFamily: "inherit",
}
const beschriftung: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: MUT, letterSpacing: ".05em", display: "block", marginBottom: 7,
}

export default function GutscheinePage() {
  const [darf, setDarf] = useState<boolean | null>(null)
  const [codes, setCodes] = useState<Code[]>([])
  const [msg, setMsg] = useState("")
  const [speichert, setSpeichert] = useState(false)
  const [f, setF] = useState({
    code: "", value: 20, scope: ["open_game"] as string[],
    location_name: "", event_id: "", expires_at: "", max_uses: "", label: "",
  })

  async function laden() {
    const r = await fetch("/api/admin/gutscheine")
    if (r.ok) setCodes((await r.json()).codes || [])
  }

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      const ok = !!user && STAFF_EMAILS.includes(user.email || "")
      setDarf(ok)
      if (!ok) { window.location.href = "/entdecken"; return }
      await laden()
    })()
  }, [])

  async function speichern() {
    setSpeichert(true); setMsg("")
    const r = await fetch("/api/admin/gutscheine", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, max_uses: f.max_uses || null, expires_at: f.expires_at || null }),
    })
    const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? `✓ ${j.code} gespeichert` : (j.error || "Fehler"))
    if (r.ok) { setF({ ...f, code: "", label: "" }); await laden() }
    setSpeichert(false)
  }

  async function umschalten(c: Code) {
    await fetch("/api/admin/gutscheine", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c.code, is_active: !c.is_active }),
    })
    await laden()
  }

  if (darf === null) return <main style={{ minHeight: "100vh", background: SCHWARZ, color: MUT, padding: 40, fontFamily: INTER }}>Lädt…</main>
  if (!darf) return null

  return (
    <main style={{ minHeight: "100vh", background: SCHWARZ, color: CREME, fontFamily: INTER, padding: "28px 0 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.02em", textTransform: "uppercase", margin: 0 }}>Gutscheine</h1>
          <p style={{ fontSize: 15, color: SUB, margin: "8px 0 0", lineHeight: 1.5 }}>
            Für Turniere, Open Games und Single Nights. Vier Stufen: 20, 30, 50 und 100 %.
            Webshop-Codes stehen nicht in dieser Liste und lassen sich hier nicht ändern.
          </p>
        </div>

        {/* ── Neu / ändern ───────────────────────────────────────────── */}
        <section style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase", margin: 0 }}>Code anlegen oder ändern</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={beschriftung} htmlFor="g-code">Code</label>
              <input id="g-code" style={feld} value={f.code} placeholder="PPL20"
                onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label style={beschriftung} htmlFor="g-wert">Rabatt</label>
              <select id="g-wert" style={feld} value={f.value} onChange={e => setF({ ...f, value: Number(e.target.value) })}>
                {[20, 30, 50, 100].map(v => <option key={v} value={v}>{v} %</option>)}
              </select>
            </div>
          </div>

          <div>
            <span style={beschriftung}>Gilt für</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ARTEN.map(a => {
                const an = f.scope.includes(a.key)
                return (
                  <button key={a.key} type="button"
                    onClick={() => setF({ ...f, scope: an ? f.scope.filter(x => x !== a.key) : [...f.scope, a.key] })}
                    style={{
                      minHeight: 44, padding: "0 16px", borderRadius: 999, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 14, fontWeight: an ? 800 : 600,
                      border: "none", background: an ? VIOLETT : CELL, color: an ? "#06220E" : SUB,
                    }}>{a.label}</button>
                )
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={beschriftung} htmlFor="g-ort">Standort (optional)</label>
              <input id="g-ort" style={feld} value={f.location_name} placeholder="alle"
                onChange={e => setF({ ...f, location_name: e.target.value })} />
            </div>
            <div>
              <label style={beschriftung} htmlFor="g-event">Event-ID (optional)</label>
              <input id="g-event" style={feld} value={f.event_id} placeholder="alle"
                onChange={e => setF({ ...f, event_id: e.target.value })} />
            </div>
            <div>
              <label style={beschriftung} htmlFor="g-bis">Gültig bis (optional)</label>
              <input id="g-bis" type="date" style={feld} value={f.expires_at}
                onChange={e => setF({ ...f, expires_at: e.target.value })} />
            </div>
            <div>
              <label style={beschriftung} htmlFor="g-max">Max. Einlösungen</label>
              <input id="g-max" type="number" min={1} style={feld} value={f.max_uses} placeholder="unbegrenzt"
                onChange={e => setF({ ...f, max_uses: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={beschriftung} htmlFor="g-label">Notiz (optional)</label>
            <input id="g-label" style={feld} value={f.label} placeholder="z.B. Aktion Herbst"
              onChange={e => setF({ ...f, label: e.target.value })} />
          </div>

          <button onClick={speichern} disabled={speichert || !f.code}
            style={{
              minHeight: 50, borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: VIOLETT, color: "#06220E", fontSize: 14, fontWeight: 900,
              letterSpacing: ".07em", textTransform: "uppercase", opacity: speichert || !f.code ? .5 : 1,
            }}>{speichert ? "Speichert …" : "Speichern"}</button>

          {msg && <p role="status" style={{ fontSize: 14.5, color: msg.startsWith("✓") ? VIOLETT : "#FF8F87", margin: 0 }}>{msg}</p>}
        </section>

        {/* ── Liste ──────────────────────────────────────────────────── */}
        <section style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase", margin: "0 0 10px" }}>
            Bestehende Codes ({codes.length})
          </h2>
          {codes.length === 0 && <p style={{ fontSize: 15, color: MUT, margin: 0 }}>Noch keine Event-Gutscheine angelegt.</p>}
          {codes.map(c => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
              borderTop: `1px solid ${LINE}`,
            }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 16.5, fontWeight: 700 }}>
                  {c.code} <span style={{ color: VIOLETT }}>–{c.value} %</span>
                </span>
                <span style={{ display: "block", fontSize: 14.5, color: SUB, marginTop: 3 }}>
                  {(c.scope || []).map(s => ARTEN.find(a => a.key === s)?.label ?? s).join(" · ")}
                  {c.location_name ? ` · ${c.location_name}` : ""}
                  {c.expires_at ? ` · bis ${new Date(c.expires_at).toLocaleDateString("de-CH")}` : ""}
                </span>
                <span style={{ display: "block", fontSize: 14, color: MUT, marginTop: 2 }}>
                  {c.eingeloest} eingelöst{c.reserviert ? ` · ${c.reserviert} laufend` : ""}
                  {c.max_uses != null ? ` von ${c.max_uses}` : " · unbegrenzt"}
                </span>
              </span>
              <button onClick={() => umschalten(c)} style={{
                minHeight: 44, padding: "0 16px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                border: "none", fontSize: 13, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
                background: c.is_active ? VIOLETT : CELL, color: c.is_active ? "#06220E" : SUB,
              }}>{c.is_active ? "Aktiv" : "Aus"}</button>
            </div>
          ))}
        </section>

        <p style={{ fontSize: 13.5, color: MUT, margin: 0, lineHeight: 1.5 }}>
          «Eingelöst» zählt bestätigte Einlösungen, «laufend» die, die gerade an einer Kasse hängen.
          Ein abgebrochener Kauf gibt seine Einlösung nach 30 Minuten von selbst wieder frei —
          genau wie den Sitzplatz.
        </p>
      </div>
    </main>
  )
}
