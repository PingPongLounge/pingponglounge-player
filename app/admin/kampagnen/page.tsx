"use client"
import { useEffect, useState, useCallback } from "react"
import { BG, CARD, CELL, W, SUB, MUT, LINE, GREEN, DANGER, btn, btnOutline } from "@/app/theme"

type Campaign = {
  id: string; title: string; kicker: string | null; body: string | null
  cta_label: string | null; cta_url: string | null; image_url: string | null
  surface: string; active: boolean; priority: number; starts_at: string | null; ends_at: string | null
}

const empty = { title: "", kicker: "", body: "", cta_label: "", cta_url: "", image_url: "", surface: "app", priority: 0, starts_at: "", ends_at: "" }

export default function KampagnenAdmin() {
  const [list, setList] = useState<Campaign[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [f, setF] = useState({ ...empty })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/campaigns")
    if (r.status === 403) { setForbidden(true); return }
    if (r.ok) { const j = await r.json(); setList(j.campaigns || []) }
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setBusy(true); setErr("")
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(j.error || "Fehler"); return }
    setF({ ...empty }); load()
  }
  async function toggle(c: Campaign) {
    await fetch("/api/admin/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, active: !c.active }) })
    load()
  }
  async function del(id: string) {
    await fetch(`/api/admin/campaigns?id=${id}`, { method: "DELETE" }); load()
  }

  const input: React.CSSProperties = { width: "100%", background: CELL, border: `1px solid ${LINE}`, borderRadius: 10, padding: "11px 13px", fontSize: 14, color: W, outline: "none", fontFamily: "inherit", marginBottom: 10 }
  const lab: React.CSSProperties = { color: MUT, fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }

  if (forbidden) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: MUT }}>Kein Zugriff.</p></main>

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px 80px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: W, marginBottom: 18 }}>Kampagnen</h1>

        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>Neue Kampagne</div>
          <label style={lab}>Titel *</label><input style={input} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <label style={lab}>Kicker (Eyebrow)</label><input style={input} value={f.kicker} onChange={e => setF({ ...f, kicker: e.target.value })} placeholder="z. B. TRAININGSCAMP · 4 TAGE" />
          <label style={lab}>Text</label><textarea style={{ ...input, resize: "none", minHeight: 60 }} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lab}>Button-Text</label><input style={input} value={f.cta_label} onChange={e => setF({ ...f, cta_label: e.target.value })} placeholder="Jetzt Platz sichern" /></div>
            <div style={{ flex: 1 }}><label style={lab}>Button-Link</label><input style={input} value={f.cta_url} onChange={e => setF({ ...f, cta_url: e.target.value })} placeholder="/trainingscamp" /></div>
          </div>
          <label style={lab}>Bild-URL</label><input style={input} value={f.image_url} onChange={e => setF({ ...f, image_url: e.target.value })} placeholder="/ppl-training.png oder https://…" />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lab}>Oberfläche</label>
              <select style={input} value={f.surface} onChange={e => setF({ ...f, surface: e.target.value })}>
                <option value="app">App</option><option value="web">Webseite</option><option value="both">Beide</option>
              </select>
            </div>
            <div style={{ width: 100 }}><label style={lab}>Priorität</label><input type="number" style={input} value={f.priority} onChange={e => setF({ ...f, priority: Number(e.target.value) })} /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lab}>Start (optional)</label><input type="datetime-local" style={{ ...input, colorScheme: "dark" }} value={f.starts_at} onChange={e => setF({ ...f, starts_at: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={lab}>Ende (optional)</label><input type="datetime-local" style={{ ...input, colorScheme: "dark" }} value={f.ends_at} onChange={e => setF({ ...f, ends_at: e.target.value })} /></div>
          </div>
          {err && <p style={{ color: DANGER, fontSize: 13, margin: "4px 0 10px" }}>{err}</p>}
          <button onClick={create} disabled={busy || !f.title} style={{ ...btn, opacity: busy || !f.title ? .5 : 1, marginTop: 6 }}>{busy ? "…" : "Kampagne anlegen"}</button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, color: MUT, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Bestehende</div>
        {list.length === 0 && <p style={{ color: MUT, fontSize: 14 }}>Noch keine Kampagnen.</p>}
        {list.map(c => (
          <div key={c.id} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: W }}>{c.title}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.active ? GREEN : MUT, border: `1px solid ${c.active ? GREEN : LINE}`, borderRadius: 8, padding: "2px 8px" }}>{c.active ? "aktiv" : "aus"}</span>
            </div>
            <div style={{ color: MUT, fontSize: 12, marginTop: 4 }}>{c.surface} · Prio {c.priority}{c.cta_url ? ` · ${c.cta_url}` : ""}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => toggle(c)} style={{ ...btnOutline, flex: 1, padding: "9px", fontSize: 13 }}>{c.active ? "Deaktivieren" : "Aktivieren"}</button>
              <button onClick={() => del(c.id)} style={{ background: "transparent", color: DANGER, border: `1px solid ${LINE}`, borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
