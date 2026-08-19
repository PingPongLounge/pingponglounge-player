"use client"
import { useEffect, useMemo, useState } from "react"
import BottomNav from "@/app/components/BottomNav"
import { SELF_RATINGS } from "@/lib/tournaments"
import { campPrice, CAMP_SESSIONS } from "@/lib/camp"

const BG = "#12151A", CARD = "#2A2F39", CELL = "#353B46", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.9)", MUT = "rgba(255,255,255,.82)", FAINT = "rgba(255,255,255,.55)"
const LINE = "rgba(255,255,255,.07)", CREAM = "#FFF9F3", DARK = "#171A20"
const GRAD = "linear-gradient(135deg,#FF00C8,#FF5CDC)"

type Session = { id: string; date: string; part: "vm" | "nm"; label: string; start: string; end: string; frei: number; belegt: number; max: number }
const DAY_LABEL: Record<string, string> = {
  "2026-08-13": "Do · 13. August", "2026-08-14": "Fr · 14. August",
  "2026-08-15": "Sa · 15. August", "2026-08-16": "So · 16. August",
}
const DATES = ["2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"]

export default function TrainingscampPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [mine, setMine] = useState<string[]>([])
  const [eingeloggt, setEingeloggt] = useState(false)
  const [step, setStep] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [openDay, setOpenDay] = useState<string | null>("2026-08-13")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  // Gast
  const [gName, setGName] = useState(""); const [gMail, setGMail] = useState("")
  const [gPhone, setGPhone] = useState(""); const [self, setSelf] = useState(""); const [consent, setConsent] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/trainingscamp"); const j = await r.json()
        setSessions(j.sessions || []); setMine(j.meineSessions || []); setEingeloggt(!!j.eingeloggt)
      } catch { /* still */ }
    })()
  }, [])

  const byDate = useMemo(() => {
    const m: Record<string, Session[]> = {}
    for (const s of sessions) (m[s.date] = m[s.date] || []).push(s)
    return m
  }, [sessions])

  const ids = Array.from(sel)
  const price = campPrice(ids)
  const nextTierNudge = (() => {
    // pro Tag mit genau 1 Einheit → Ganztag-Hinweis; sonst Tages-Rabatt
    const perDay: Record<string, number> = {}
    for (const id of ids) { const s = CAMP_SESSIONS.find(x => x.id === id); if (s) perDay[s.date] = (perDay[s.date] || 0) + 1 }
    if (Object.values(perDay).some(c => c === 1)) return "Noch 1 Einheit dazu = Ganztag für CHF 150"
    const full = price.fullDays
    if (full >= 1 && full < 4) { const nx = full + 1; return `Nimm 1 Tag mehr und spare CHF ${nx * 150 - [0,150,275,390,500][nx]}` }
    return ""
  })()

  function toggle(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleDay(date: string) {
    const s = (byDate[date] || []).map(x => x.id)
    setSel(prev => { const n = new Set(prev); const both = s.every(i => n.has(i)); s.forEach(i => both ? n.delete(i) : n.add(i)); return n })
  }

  async function checkout() {
    setErr("")
    if (ids.length === 0) return
    if (!eingeloggt) {
      if (!gName.trim()) return setErr("Bitte Namen angeben.")
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gMail)) return setErr("Bitte gültige E-Mail angeben.")
      if (!gPhone.trim()) return setErr("Bitte Telefonnummer angeben.")
      if (!self) return setErr("Bitte deine Spielstärke wählen.")
      if (!consent) return setErr("Bitte den Bedingungen zustimmen.")
    }
    setBusy(true)
    try {
      const r = await fetch("/api/trainingscamp/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_ids: ids,
          self_rating: self || null,
          consent,
          guest: eingeloggt ? null : { name: gName, email: gMail, phone: gPhone },
        }),
      })
      const j = await r.json()
      if (r.ok && j.url) { window.location.href = j.url; return }
      setErr(j.error || "Buchung fehlgeschlagen."); setBusy(false)
    } catch { setErr("Buchung derzeit nicht möglich."); setBusy(false) }
  }

  const H1: React.CSSProperties = { fontSize: 34, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-.01em", lineHeight: .95, color: CREAM }
  // Alle Buttons: nur Verlauf-Umrandung, nicht gefüllt.
  const btnFill: React.CSSProperties = { display: "block", width: "100%", textAlign: "center", background: `linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box`, color: CREAM, borderRadius: 13, padding: 15, fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".03em", border: "1.5px solid transparent", cursor: "pointer", fontFamily: "inherit" }
  const btnOutline: React.CSSProperties = { ...btnFill, background: "transparent", border: "1.5px solid rgba(255,255,255,.35)" }
  const cell: React.CSSProperties = { background: CELL, borderRadius: 12, padding: "11px 8px", textAlign: "center" }
  const inp: React.CSSProperties = { width: "100%", background: BG, borderRadius: 10, padding: "12px 14px", color: W, fontSize: 14, border: "none", outline: "none", fontFamily: "inherit" }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "0 0 100px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* STEP 1 — DETAIL */}
        {step === 1 && (<>
          <div style={{ position: "relative" }}>
            <div style={{ height: 172, background: "repeating-linear-gradient(135deg,#232833 0 22px,#1c212a 22px 44px)", display: "flex", alignItems: "center", justifyContent: "center", color: FAINT, fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>Camp-Foto</div>
            <div style={{ background: DARK, padding: "15px 18px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>13.–16. August · PPL24 Glattbrugg</div>
              <h1 style={{ ...H1, marginTop: 5 }}>Trainings-<br />camp</h1>
              <div style={{ fontSize: 12.5, color: SUB, fontWeight: 300, marginTop: 7 }}>Vier Tage intensives Pingpong-Training mit zwei Spitzenspielern — für alle Levels.</div>
            </div>
          </div>

          <div style={{ padding: "14px 16px 0" }}>
            <div style={{ background: CARD, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em", color: CREAM, marginBottom: 10 }}>Was dich erwartet</div>
              {[
                ["Auf dein Niveau angepasst.", "Wir trainieren in Leistungsgruppen (Rookie/Challenger/Advanced/Elite) — gleiche Stärke zusammen."],
                ["Tag 1 & 2: Ballmaschinen-Training.", "Gezielte Technik & Wiederholung — danach weisst du, wie du die Maschine selbst bedienst."],
                ["Tag 3: Material-Tipps & Testen.", "Beläge und Hölzer verstehen, ausprobieren, das Richtige für dich finden."],
                ["Von zwei Profis.", "Elia Schmid (Schweizer Nr. 1) und Simon Berglund (Schwedens Nr. 3)."],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "7px 0" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: GRAD, color: CREAM, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: SUB, fontWeight: 300, lineHeight: 1.45 }}><b style={{ color: CREAM, fontWeight: 700 }}>{t}</b> {d}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
              <div style={cell}><div style={{ fontSize: 9.5, color: MUT, textTransform: "uppercase" }}>Halbtag</div><div style={{ fontSize: 14, fontWeight: 900, color: CREAM, marginTop: 4 }}>75</div></div>
              <div style={cell}><div style={{ fontSize: 9.5, color: MUT, textTransform: "uppercase" }}>Ganztag</div><div style={{ fontSize: 14, fontWeight: 900, color: CREAM, marginTop: 4 }}>150</div></div>
              <div style={cell}><div style={{ fontSize: 9.5, color: MUT, textTransform: "uppercase" }}>Ganzes Camp</div><div style={{ fontSize: 14, fontWeight: 900, color: CREAM, marginTop: 4 }}>500</div></div>
            </div>
            <div style={{ fontSize: 11.5, color: MUT, fontWeight: 300, textAlign: "center", marginTop: 8 }}>Preise in CHF · mehr Tage = mehr Rabatt</div>

            <button style={{ ...btnOutline, marginTop: 16 }} onClick={() => setStep(2)}>Platz wählen →</button>
          </div>
        </>)}

        {/* STEP 2 — EINHEITEN */}
        {step === 2 && (<>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px 4px" }}>
            <span onClick={() => setStep(1)} style={{ width: 34, height: 34, borderRadius: 11, background: CELL, display: "flex", alignItems: "center", justifyContent: "center", color: CREAM, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>‹</span>
            <h3 style={{ fontSize: 19, fontWeight: 900, textTransform: "uppercase", color: W }}>Einheiten wählen</h3>
          </div>
          <div style={{ padding: "8px 16px 8px" }}>
            <div style={{ fontSize: 11.5, color: MUT, fontWeight: 300, textAlign: "center", marginBottom: 12 }}>Tag antippen → Vormittag / Nachmittag / Ganztag. Mehr Tage = mehr Rabatt.</div>
            {DATES.map(date => {
              const list = byDate[date] || []
              const open = openDay === date
              return (
                <div key={date} style={{ background: CARD, borderRadius: 14, marginBottom: 9, overflow: "hidden" }}>
                  <div onClick={() => setOpenDay(open ? null : date)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", cursor: "pointer" }}>
                    <div><div style={{ fontSize: 14, fontWeight: 800, color: CREAM }}>{DAY_LABEL[date]}</div>
                      <div style={{ fontSize: 11.5, color: MUT, fontWeight: 300, marginTop: 2 }}>{list.filter(s => sel.has(s.id)).length ? `${list.filter(s => sel.has(s.id)).length === 2 ? "Ganztag" : "1 Einheit"} gewählt` : `${list.reduce((a, s) => a + s.frei, 0)} Plätze frei · ab CHF 75`}</div></div>
                    <span style={{ fontSize: 13, color: MUT, transform: open ? "rotate(180deg)" : "none" }}>▾</span>
                  </div>
                  {open && (
                    <div style={{ padding: "0 14px 12px" }}>
                      {list.map(s => {
                        const on = sel.has(s.id); const voll = s.frei <= 0; const schon = mine.includes(s.id)
                        return (
                          <div key={s.id} onClick={() => !voll && !schon && toggle(s.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: on ? "rgba(255,255,255,.07)" : CELL, border: `1.5px solid ${on ? "rgba(255,255,255,.30)" : "transparent"}`, borderRadius: 11, padding: "11px 13px", marginTop: 8, cursor: voll || schon ? "not-allowed" : "pointer", opacity: voll || schon ? .5 : 1 }}>
                            <span><span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{s.label} · {s.start}–{s.end}</span>
                              <span style={{ display: "block", fontSize: 11, color: MUT, fontWeight: 300, marginTop: 2 }}>{schon ? "schon gebucht" : voll ? "ausgebucht" : `${s.frei} frei`}</span></span>
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: CREAM }}>CHF 75</span>
                              <span style={{ width: 21, height: 21, borderRadius: 6, border: `1.5px solid ${on ? "transparent" : "rgba(255,255,255,.3)"}`, background: on ? GRAD : "transparent", color: CREAM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{on ? "✓" : ""}</span>
                            </span>
                          </div>
                        )
                      })}
                      <div onClick={() => toggleDay(date)} style={{ marginTop: 9, fontSize: 12, fontWeight: 800, cursor: "pointer", background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>Ganztag wählen · CHF 150</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Sticky Summe */}
          <div style={{ position: "sticky", bottom: 0, zIndex: 40, background: DARK, borderTop: `1px solid ${LINE}`, padding: "12px 16px" }}>
            {nextTierNudge && <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", marginBottom: 10, background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{nextTierNudge}</div>}
            {ids.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{DATES.flatMap(d => { const a = (byDate[d] || []).filter(s => sel.has(s.id)); if (!a.length) return []; const txt = a.length === 2 ? "Ganztag" : a[0].label; return [<span key={d} style={{ fontSize: 11, fontWeight: 700, color: CREAM, background: CELL, borderRadius: 999, padding: "4px 10px" }}>{DAY_LABEL[d].split(" ")[0]} · {txt}</span>] })}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: MUT }}>Anzahl</span><span style={{ color: CREAM, fontWeight: 800 }}>{ids.length ? `${ids.length} Einheit${ids.length > 1 ? "en" : ""}` : "–"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: MUT }}>Gesamt</span><span style={{ color: CREAM, fontWeight: 800 }}>CHF {price.total}</span></div>
              {price.save > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: MUT }}>Deine Ersparnis</span><span style={{ fontWeight: 900, background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>CHF {price.save}</span></div>}
            </div>
            <button style={{ ...btnFill, opacity: ids.length ? 1 : .45, pointerEvents: ids.length ? "auto" : "none" }} onClick={() => setStep(3)}>{ids.length ? `Weiter · CHF ${price.total}` : "Weiter"}</button>
          </div>
        </>)}

        {/* STEP 3 — ÜBERSICHT / ZAHLUNG */}
        {step === 3 && (<>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px 4px" }}>
            <span onClick={() => setStep(2)} style={{ width: 34, height: 34, borderRadius: 11, background: CELL, display: "flex", alignItems: "center", justifyContent: "center", color: CREAM, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>‹</span>
            <h3 style={{ fontSize: 19, fontWeight: 900, textTransform: "uppercase", color: W }}>Übersicht</h3>
          </div>
          <div style={{ padding: "8px 16px 0" }}>
            <div style={{ background: CARD, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em", color: CREAM, marginBottom: 10 }}>Deine Auswahl</div>
              {DATES.map(d => { const a = (byDate[d] || []).filter(s => sel.has(s.id)); if (!a.length) return null; const txt = a.length === 2 ? "Ganztag" : a[0].label; const pr = a.length === 2 ? 150 : 75; return (
                <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderTop: `1px solid ${LINE}` }}><span style={{ color: MUT }}>{DAY_LABEL[d]} · {txt}</span><span style={{ color: CREAM, fontWeight: 700 }}>CHF {pr}</span></div>
              )})}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900, color: CREAM, paddingTop: 10, marginTop: 6, borderTop: `1px solid ${LINE}` }}><span>Gesamt</span><span>CHF {price.total}{price.save > 0 ? ` (spart ${price.save})` : ""}</span></div>
            </div>

            {!eingeloggt && (
              <div style={{ background: CARD, borderRadius: 16, padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em", color: CREAM, marginBottom: 10 }}>Deine Angaben (Gast)</div>
                <input placeholder="Vor- und Nachname" value={gName} onChange={e => setGName(e.target.value)} style={{ ...inp, marginBottom: 8 }} />
                <input placeholder="E-Mail" type="email" value={gMail} onChange={e => setGMail(e.target.value)} style={{ ...inp, marginBottom: 8 }} />
                <input placeholder="Telefon" value={gPhone} onChange={e => setGPhone(e.target.value)} style={{ ...inp, marginBottom: 12 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: MUT, marginBottom: 8 }}>Deine Spielstärke</div>
                <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                  {SELF_RATINGS.map(r => { const on = self === r.key; return (
                    <button key={r.key} type="button" onClick={() => setSelf(r.key)} style={{ textAlign: "left", background: on ? "rgba(255,255,255,.10)" : CELL, border: `1.5px solid ${on ? "rgba(255,255,255,.30)" : "transparent"}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: CREAM }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: FAINT, fontWeight: 300, marginTop: 2 }}>{r.desc}</div>
                    </button>
                  )})}
                </div>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
                  <span style={{ fontSize: 12.5, color: SUB, fontWeight: 300, lineHeight: 1.5 }}>Ich akzeptiere die Teilnahmebedingungen. Storno gratis bis 1 Woche vor Camp-Start.</span>
                </label>
              </div>
            )}

            <div style={{ background: CELL, borderRadius: 12, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: SUB, fontWeight: 300, lineHeight: 1.5 }}>
              Du kennst dein Level nicht? Der Coach teilt dich vor Ort in die passende Stärkeklasse ein. Zahlung per Karte, Storno gratis bis 1 Woche vorher.
            </div>

            {err && <div style={{ color: "#FF6B6B", fontSize: 13, fontWeight: 500, marginTop: 12 }}>{err}</div>}
            <button style={{ ...btnFill, marginTop: 14, opacity: busy ? .6 : 1 }} disabled={busy} onClick={checkout}>{busy ? "…" : `Weiter zur Zahlung · CHF ${price.total}`}</button>
            <button style={{ ...btnOutline, marginTop: 8 }} onClick={() => setStep(2)}>Auswahl ändern</button>
          </div>
        </>)}
      </div>
      <BottomNav />
    </main>
  )
}
