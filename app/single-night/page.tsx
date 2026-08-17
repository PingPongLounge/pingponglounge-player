"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import BottomNav from "@/app/components/BottomNav"
import { BG, CARD, CELL, W, SUB, MUT, LINE, GREEN, DANGER, btn } from "@/app/theme"
import { SINGLE_NIGHT_TICKETS, SINGLE_NIGHT_ABLAUF, SINGLE_NIGHT_ROTATION, SINGLE_NIGHT_INFO } from "@/lib/opengames"

const PINK = "#FF00C8"

type SnEvent = { id: string; date: string; start_hour: number | null; location_name: string; plaetze: number; frei: number }

function dateLabel(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })
}

export default function SingleNightPage() {
  const [ev, setEv] = useState<SnEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [ticket, setTicket] = useState<string>(SINGLE_NIGHT_TICKETS[0].key)
  const [guest, setGuest] = useState({ name: "", email: "" })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        setLoggedIn(!!user)
        const r = await fetch("/api/single-night")
        if (r.ok) { const j = await r.json(); setEv((j.events || [])[0] || null) }
      } catch { /* still */ }
      setLoading(false)
    })()
  }, [])

  async function buchen() {
    if (!ev) return
    setBusy(true); setErr("")
    const payload: Record<string, unknown> = { event_id: ev.id, ticket_type: ticket }
    if (!loggedIn) payload.guest = { name: guest.name.trim(), email: guest.email.trim() }
    try {
      const r = await fetch("/api/single-night/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.url) { setErr(j.error || "Buchung fehlgeschlagen"); setBusy(false); return }
      window.location.href = j.url
    } catch { setErr("Verbindung fehlgeschlagen"); setBusy(false) }
  }

  const lbl: React.CSSProperties = { color: MUT, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", margin: "24px 0 12px" }
  const input: React.CSSProperties = { width: "100%", background: CELL, border: `1px solid ${LINE}`, borderRadius: 12, padding: "13px 15px", fontSize: 15, color: W, outline: "none", fontFamily: "inherit", marginBottom: 10 }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "16px 16px 110px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 14 }}>
          <Link href="/erstellen" aria-label="Zurück" style={{ display: "inline-flex" }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={W} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </Link>
          <span style={{ fontSize: 15, fontWeight: 700, color: W }}>Single Night</span>
          <span style={{ width: 22 }} />
        </div>

        <div style={{ height: 180, borderRadius: 20, overflow: "hidden", marginBottom: 18, position: "relative" }}>
          <img src="/ppl-single-night.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 30%,rgba(10,11,13,.92))" }} />
          <div style={{ position: "absolute", left: 16, bottom: 14 }}>
            <div style={{ color: PINK, fontSize: 12, fontWeight: 800, letterSpacing: ".14em" }}>SPIELEN &amp; KENNENLERNEN</div>
            <div style={{ color: W, fontSize: 30, fontWeight: 900, letterSpacing: "-.5px", lineHeight: 1 }}>Single Night</div>
          </div>
        </div>

        {loading ? (
          <p style={{ color: MUT, textAlign: "center", padding: "30px 0" }}>Lädt …</p>
        ) : !ev ? (
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18 }}>
            <p style={{ color: SUB, fontSize: 14, lineHeight: 1.5 }}>Aktuell ist keine Single Night ausgeschrieben. Schau bald wieder vorbei!</p>
          </div>
        ) : (
          <>
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px", marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: W }}>{dateLabel(ev.date)} · {String(ev.start_hour ?? 19).padStart(2, "0")}:00</div>
              <div style={{ color: MUT, fontSize: 13, marginTop: 2 }}>PPL24 {ev.location_name} · {ev.frei > 0 ? `${ev.frei} Plätze frei` : "ausgebucht"}</div>
            </div>

            <div style={lbl}>ABLAUF</div>
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "6px 16px" }}>
              {SINGLE_NIGHT_ABLAUF.map((z, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}`, color: SUB, fontSize: 14, lineHeight: 1.4 }}>
                  <span style={{ color: GREEN }}>•</span><span>{z}</span>
                </div>
              ))}
            </div>

            <div style={lbl}>STATIONEN (JE 30 MIN)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SINGLE_NIGHT_ROTATION.map(r => (
                <div key={r.farbe} style={{ display: "flex", alignItems: "center", gap: 12, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 14px" }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: r.hex, flex: "0 0 14px" }} />
                  <span style={{ width: 42, fontSize: 13, fontWeight: 700, color: W }}>{r.farbe}</span>
                  <span style={{ flex: 1, color: SUB, fontSize: 13 }}>{r.plan.join(" → ")}</span>
                </div>
              ))}
            </div>
            <p style={{ color: MUT, fontSize: 12.5, marginTop: 10, lineHeight: 1.4 }}>Bändchen werden vor Ort verteilt. {SINGLE_NIGHT_INFO.minHinweis} {SINGLE_NIGHT_INFO.stornoHinweis}</p>

            <div style={lbl}>TICKET</div>
            {SINGLE_NIGHT_TICKETS.map(t => {
              const active = ticket === t.key
              return (
                <button key={t.key} onClick={() => setTicket(t.key)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  background: CARD, borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer",
                  border: `1px solid ${active ? GREEN : LINE}`, boxShadow: active ? `0 0 0 1px ${GREEN}` : "none",
                }}>
                  <span style={{ flex: 1 }}>
                    <b style={{ display: "block", fontSize: 16, fontWeight: 700, color: W }}>{t.label}</b>
                    {t.hint && <small style={{ color: MUT, fontSize: 13 }}>{t.hint}</small>}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: W }}>CHF {t.price}</span>
                </button>
              )
            })}

            {!loggedIn && (
              <div style={{ marginTop: 6 }}>
                <input style={input} placeholder="Name" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
                <input style={input} placeholder="E-Mail" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} />
              </div>
            )}

            {err && <p style={{ color: DANGER, fontSize: 13, margin: "6px 0" }}>{err}</p>}
            <button onClick={buchen} disabled={busy || ev.frei <= 0 || (!loggedIn && (!guest.name.trim() || !guest.email.trim()))} style={{ ...btn, marginTop: 8, opacity: busy || ev.frei <= 0 || (!loggedIn && (!guest.name.trim() || !guest.email.trim())) ? .5 : 1 }}>
              {ev.frei <= 0 ? "Ausgebucht" : busy ? "…" : "Ticket kaufen"}
            </button>
            <p style={{ color: MUT, fontSize: 12, textAlign: "center", marginTop: 10 }}>Welcome Drink inklusive · Bezahlung sicher über Stripe</p>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
