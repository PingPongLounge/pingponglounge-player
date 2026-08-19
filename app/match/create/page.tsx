"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { BG, CARD, CELL, W, SUB, MUT, LINE, GREEN, INK, DANGER, CITIES, btn, btnOutline, lvLabel } from "@/app/theme"

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 7–22 Uhr
const LEVELS = ["1", "2", "3", "4", "5", "6", "7"]

type OrtsArt = "ppl" | "custom"
type LevelMode = "mine" | "all" | "other"

function dateLabel(d: string): string {
  if (!d) return "Datum wählen"
  return new Date(`${d}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })
}

// ---- kleine UI-Bausteine im Briefing-Look ----
function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: ".08em" }}>{label}</div>
        {value ? <div style={{ fontSize: 16, fontWeight: 700, color: W }}>{value}</div>
               : <div style={{ fontSize: 15, color: MUT }}>{placeholder}</div>}
      </div>
    </div>
  )
}

export default function CreateMatchPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [ortsart, setOrtsart] = useState<OrtsArt>("ppl")
  // Ort
  const [city, setCity] = useState<string>(CITIES[0])
  const [customName, setCustomName] = useState("")
  const [customInfo, setCustomInfo] = useState("")
  const [date, setDate] = useState("")
  const [hour, setHour] = useState<number | "">("")
  const [duration, setDuration] = useState(90)
  // Wer
  const [levelMode, setLevelMode] = useState<LevelMode>("mine")
  const [otherLevel, setOtherLevel] = useState("3")
  const [maxPlayers, setMaxPlayers] = useState(4)
  // Spieler-Level
  const [myLevel, setMyLevel] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // PPL: nach dem Erstellen wartet das Game auf die Tischbuchung in Planyo.
  const [created, setCreated] = useState<{ id: string; bookingUrl: string } | null>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: p } = await sb.from("profiles").select("level").eq("id", user.id).maybeSingle()
      setMyLevel(p?.level || "")
    })()
  }, [router])

  const levelValue = levelMode === "all" ? "alle" : levelMode === "mine" ? (myLevel || "3") : otherLevel
  const levelText = levelMode === "all" ? "Alle Level" : levelMode === "mine" ? (lvLabel(myLevel) || "Mein Level") : lvLabel(otherLevel)
  const ortText = ortsart === "ppl" ? city : (customName || "Anderer Ort")

  function step1Valid(): boolean {
    if (!date || hour === "") return false
    if (ortsart === "custom" && !customName.trim()) return false
    return true
  }

  async function submit() {
    setLoading(true); setError("")
    const notes = ortsart === "custom"
      ? `Anderer Ort${customInfo.trim() ? ` · ${customInfo.trim()}` : ""} · Tisch vom Gastgeber organisiert`
      : null
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: levelValue,
        location_name: ortsart === "ppl" ? city : customName.trim(),
        location_type: ortsart,
        date, start_hour: hour, duration_minutes: duration,
        max_players: maxPlayers,
        price_per_player: 0, // Spieler teilen die Tischkosten selbst
        notes,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error || "Fehler"); setLoading(false); return }
    // PPL: erst Tisch in Planyo buchen, dann veröffentlichen.
    if (ortsart === "ppl" && json.needsBooking && json.bookingUrl) {
      setCreated({ id: json.id, bookingUrl: json.bookingUrl })
      setLoading(false)
      window.open(json.bookingUrl, "_blank", "noopener")
      return
    }
    router.push(`/match/${json.id}`)
  }

  async function publish() {
    if (!created) return
    setLoading(true); setError("")
    const r = await fetch(`/api/match/${created.id}/publish`, { method: "POST" })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setError(j.error || "Fehler"); setLoading(false); return }
    router.push(`/match/${created.id}`)
  }

  const pageStyle: React.CSSProperties = { minHeight: "100vh", background: BG, padding: "16px 16px 40px", display: "flex", flexDirection: "column" }
  const inner: React.CSSProperties = { maxWidth: 480, margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column" }
  const bigTitle: React.CSSProperties = { fontSize: 32, fontWeight: 800, letterSpacing: "-.6px", color: W, lineHeight: 1.05, margin: "6px 0 18px" }
  const stepLabel: React.CSSProperties = { color: GREEN, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", marginBottom: 10 }
  const barWrap: React.CSSProperties = { height: 3, background: LINE, borderRadius: 3, overflow: "hidden", marginBottom: 22 }
  const inputStyle: React.CSSProperties = { width: "100%", background: CELL, border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px", fontSize: 15, color: W, outline: "none", fontFamily: "inherit" }
  const lbl: React.CSSProperties = { color: MUT, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", margin: "22px 0 12px" }

  const TopBar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 12 }}>
      <button onClick={() => step > 1 ? setStep(step - 1) : router.push("/erstellen")} aria-label="Zurück" style={{ background: "none", border: "none", padding: 0, display: "inline-flex", cursor: "pointer" }}>
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={W} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <Link href="/match" style={{ color: MUT, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>Abbrechen</Link>
    </div>
  )

  return (
    <main style={pageStyle}>
      <div style={inner}>
        {TopBar}
        <div style={stepLabel}>SCHRITT {step} VON 3</div>
        <div style={barWrap}><div style={{ height: "100%", background: GREEN, width: `${step * 33.4}%` }} /></div>

        {/* ---------- SCHRITT 1 · Wo & wann ---------- */}
        {step === 1 && (
          <>
            <h1 style={bigTitle}>Wo &amp; wann?</h1>
            <div style={{ ...lbl, marginTop: 0 }}>ORT</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {(["ppl", "custom"] as OrtsArt[]).map(a => (
                <button key={a} onClick={() => setOrtsart(a)} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${ortsart === a ? GREEN : LINE}`,
                  color: ortsart === a ? GREEN : MUT, background: ortsart === a ? "rgba(255,0,200,.12)" : "transparent",
                }}>{a === "ppl" ? "Ping Pong Lounge" : "Anderer Ort"}</button>
              ))}
            </div>

            {ortsart === "ppl" ? (
              <div style={{ marginBottom: 12 }}>
                <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ort / Adresse (z. B. Sportzentrum Zürich)" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input value={customInfo} onChange={e => setCustomInfo(e.target.value)} placeholder="Tisch-Info (z. B. 2 Tische vorhanden)" style={inputStyle} />
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div style={{ width: 118 }}>
                <select value={hour} onChange={e => setHour(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...inputStyle, colorScheme: "dark" }}>
                  <option value="">Zeit</option>
                  {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ ...inputStyle, colorScheme: "dark" }}>
                {[60, 90, 120].map(d => <option key={d} value={d}>{d} Minuten</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, color: MUT, fontSize: 13, margin: "8px 2px 0", lineHeight: 1.35 }}>
              {ortsart === "ppl"
                ? "Freie Tische werden über die Ping Pong Lounge geprüft."
                : "Tisch & Verfügbarkeit organisierst du selbst."}
            </div>

            <div style={{ flex: 1 }} />
            <button onClick={() => step1Valid() && setStep(2)} style={{ ...btn, opacity: step1Valid() ? 1 : .5, cursor: step1Valid() ? "pointer" : "default" }}>
              Weiter
            </button>
          </>
        )}

        {/* ---------- SCHRITT 2 · Wer ---------- */}
        {step === 2 && (
          <>
            <h1 style={bigTitle}>Wer soll<br />mitspielen?</h1>
            <div style={{ ...lbl, marginTop: 6 }}>SPIELSTÄRKE</div>
            {([
              { m: "mine" as LevelMode, t: "Mein Level", s: lvLabel(myLevel) || "Deine Einstufung" },
              { m: "all" as LevelMode, t: "Alle Level", s: "Jeder ist willkommen" },
              { m: "other" as LevelMode, t: "Anderes Level wählen", s: levelMode === "other" ? lvLabel(otherLevel) : "" },
            ]).map(o => {
              const active = levelMode === o.m
              return (
                <button key={o.m} onClick={() => setLevelMode(o.m)} style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                  background: CARD, borderRadius: 16, padding: "14px 16px", marginBottom: 12, cursor: "pointer",
                  border: `1px solid ${active ? GREEN : LINE}`, boxShadow: active ? `0 0 0 1px ${GREEN}` : "none",
                }}>
                  <span style={{ flex: 1 }}>
                    <b style={{ display: "block", fontSize: 16, fontWeight: 700, color: W }}>{o.t}</b>
                    {o.s && <small style={{ color: MUT, fontSize: 13 }}>{o.s}</small>}
                  </span>
                  {active && (
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10" /></svg>
                    </span>
                  )}
                </button>
              )
            })}
            {levelMode === "other" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 4 }}>
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setOtherLevel(l)} style={{
                    padding: "10px 4px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${otherLevel === l ? GREEN : LINE}`, color: otherLevel === l ? GREEN : SUB,
                    background: otherLevel === l ? "rgba(255,0,200,.12)" : "transparent",
                  }}>L{l}</button>
                ))}
              </div>
            )}

            <div style={lbl}>TEILNEHMER</div>
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))} style={stepBtn}>
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round"><path d="M5 12h14" /></svg>
              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: W, lineHeight: 1 }}>{maxPlayers}</div>
                <small style={{ color: MUT, fontSize: 12 }}>Personen · inklusive dir</small>
              </div>
              <button onClick={() => setMaxPlayers(Math.min(4, maxPlayers + 1))} style={stepBtn}>
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>

            <div style={{ flex: 1 }} />
            <button onClick={() => setStep(3)} style={btn}>Weiter</button>
          </>
        )}

        {/* ---------- SCHRITT 3 · Übersicht ---------- */}
        {step === 3 && !created && (
          <>
            <h1 style={bigTitle}>Alles bereit?</h1>
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, overflow: "hidden", marginBottom: 18 }}>
              <SumRow text={ortText} />
              <SumRow text={`${dateLabel(date)} · ${hour === "" ? "" : String(hour).padStart(2, "0")}:00`} border />
              <SumRow text={`${levelText} · ${maxPlayers} Personen`} border />
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, color: MUT, fontSize: 13, margin: "2px 2px 0", lineHeight: 1.4 }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={MUT} strokeWidth={1.6} style={{ flex: "0 0 18px", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
              {ortsart === "ppl"
                ? "Tisch über die Ping Pong Lounge buchen. Die Spieler teilen die Kosten selbst auf."
                : "Tisch und Verfügbarkeit werden vom Gastgeber organisiert."}
            </div>

            {error && <p style={{ color: DANGER, fontSize: 13, marginTop: 14 }}>{error}</p>}
            <div style={{ flex: 1 }} />
            <button onClick={submit} disabled={loading} style={{ ...btn, opacity: loading ? .6 : 1 }}>
              {loading ? "Wird erstellt …" : ortsart === "ppl" ? "Buchen & veröffentlichen" : "Veröffentlichen"}
            </button>
            <button onClick={() => setStep(1)} style={{ ...btnOutline, border: "none", color: MUT, fontWeight: 500, marginTop: 8, background: "transparent" }}>Angaben bearbeiten</button>
          </>
        )}

        {/* ---------- SCHRITT 3b · Tischbuchung (Planyo) ---------- */}
        {step === 3 && created && (
          <>
            <h1 style={bigTitle}>Fast fertig!</h1>
            <p style={{ color: SUB, fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>
              Buche jetzt den Tisch in der Ping Pong Lounge. Sobald der Tisch gebucht ist, veröffentlichst du dein Open Game — dann sehen es die anderen.
            </p>
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, overflow: "hidden", marginBottom: 18 }}>
              <SumRow text={ortText} />
              <SumRow text={`${dateLabel(date)} · ${hour === "" ? "" : String(hour).padStart(2, "0")}:00`} border />
              <SumRow text={`${levelText} · ${maxPlayers} Personen`} border />
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, color: MUT, fontSize: 13, margin: "2px 2px 18px", lineHeight: 1.4 }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={MUT} strokeWidth={1.6} style={{ flex: "0 0 18px", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
              Noch nicht veröffentlicht — erst nach der Tischbuchung sichtbar.
            </div>
            {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ flex: 1 }} />
            <button onClick={() => window.open(created.bookingUrl, "_blank", "noopener")} style={btnOutline}>Tisch in Planyo buchen</button>
            <button onClick={publish} disabled={loading} style={{ ...btn, marginTop: 10, opacity: loading ? .6 : 1 }}>
              {loading ? "…" : "Tisch gebucht — veröffentlichen"}
            </button>
          </>
        )}
      </div>
    </main>
  )
}

const stepBtn: React.CSSProperties = { width: 50, height: 50, borderRadius: "50%", border: `1.5px solid ${MUT}`, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", cursor: "pointer" }

function SumRow({ text, border }: { text: string; border?: boolean }) {
  return (
    <div style={{ padding: "15px 16px", borderTop: border ? `1px solid ${LINE}` : "none", fontSize: 15, fontWeight: 600, color: W }}>{text}</div>
  )
}
