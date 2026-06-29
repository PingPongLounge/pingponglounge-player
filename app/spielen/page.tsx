"use client"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const G = "#39FF14"
const DARK = "#0E1014"
const SURFACE = "#1A1D24"
const CARD = "#1A1D24"
const BORDER = "#1A1D24"
const TEXT = "#FFFFFF"
const MUTED = "rgba(255,255,255,0.66)"

// Level-Logik analog zum Onboarding (LEVELS-Array dort).
const LEVELS = [
  { name: "Rookie",     color: "#4ADE80", elo: 1000 },
  { name: "Challenger", color: "#FACC15", elo: 1100 },
  { name: "Advanced",   color: "#FB923C", elo: 1300 },
  { name: "Elite",      color: "#1FD1C4", elo: 1500 },
]

// Nächstkleineres Level zu einer ELO (gleiche Idee wie calcLevel im Onboarding)
function levelForElo(elo: number) {
  let chosen = LEVELS[0]
  for (const l of LEVELS) if (elo >= l.elo) chosen = l
  return chosen
}

type SetScore = { you: string; opp: string }

const inp: React.CSSProperties = { flex: 1, background: SURFACE, border: "1px solid " + BORDER, borderRadius: "8px", padding: "12px", fontSize: "18px", fontWeight: 700, color: TEXT, outline: "none", textAlign: "center", boxSizing: "border-box", fontFamily: "inherit" }
const primaryBtn = (disabled = false): React.CSSProperties => ({ width: "100%", background: disabled ? BORDER : "#fff", color: disabled ? MUTED : "#0E1014", border: "none", borderRadius: "10px", padding: "16px", fontSize: "14px", fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", textTransform: "lowercase", letterSpacing: "0.02em", marginTop: "14px", fontFamily: "inherit" })

function SpielenInner() {
  const router = useRouter()
  const search = useSearchParams()
  const ort = search.get("ort") || ""

  const [screen, setScreen] = useState<"A" | "B">("A")
  const [sets, setSets] = useState<SetScore[]>([{ you: "", opp: "" }, { you: "", opp: "" }, { you: "", opp: "" }])
  const [error, setError] = useState("")

  // Ergebnis nach Validierung
  const [won, setWon] = useState(false)
  const [provisionalElo, setProvisionalElo] = useState(1000)

  // Rang-Vorschau
  const [rank, setRank] = useState<number | null>(null)
  const [rankLoading, setRankLoading] = useState(false)

  function addSet() { setSets(s => s.length < 5 ? [...s, { you: "", opp: "" }] : s) }
  function removeSet(i: number) { setSets(s => s.filter((_, j) => j !== i)) }
  function updateSet(i: number, side: "you" | "opp", val: string) {
    // nur Zahlen 0-30 zulassen
    if (val !== "") {
      const n = parseInt(val, 10)
      if (Number.isNaN(n) || n < 0 || n > 30) return
    }
    setSets(s => s.map((x, j) => j === i ? { ...x, [side]: val } : x))
  }

  // Validierung: mind. 1 vollständiger Satz, Gewinner aus gewonnenen Sätzen.
  function validate(): { valid: boolean; won: boolean } {
    const parsed = sets
      .map(s => ({ you: parseInt(s.you, 10), opp: parseInt(s.opp, 10) }))
      .filter(s => Number.isFinite(s.you) && Number.isFinite(s.opp) && !Number.isNaN(s.you) && !Number.isNaN(s.opp))
    if (parsed.length < 1) return { valid: false, won: false }
    const youWins = parsed.filter(s => s.you > s.opp).length
    const oppWins = parsed.filter(s => s.opp > s.you).length
    return { valid: true, won: youWins > oppWins }
  }

  async function goToResult() {
    const { valid, won: didWin } = validate()
    if (!valid) { setError("Trag mindestens einen vollständigen Satz ein (Zahlen 0–30).") ; return }
    setError("")
    const elo = 1000 + (didWin ? 15 : 0)
    setWon(didWin)
    setProvisionalElo(elo)
    setScreen("B")
    // Rang best-effort laden
    setRankLoading(true)
    setRank(null)
    try {
      const res = await fetch(`/api/spielen/preview?elo=${elo}`)
      if (res.ok) {
        const d = await res.json()
        setRank(typeof d.rank === "number" ? d.rank : null)
      }
    } catch { /* ignore — Rang bleibt null */ }
    finally { setRankLoading(false) }
  }

  function saveProfile() {
    const parsed = sets
      .map(s => ({ you: parseInt(s.you, 10), opp: parseInt(s.opp, 10) }))
      .filter(s => !Number.isNaN(s.you) && !Number.isNaN(s.opp))
    try {
      localStorage.setItem("ppl_pending_result", JSON.stringify({
        elo: provisionalElo, won, sets: parsed, ort, ts: Date.now(),
      }))
    } catch { /* localStorage evtl. nicht verfügbar — egal, Flow läuft trotzdem */ }
    router.push("/login?next=/onboarding")
  }

  const level = levelForElo(provisionalElo)

  const wrap: React.CSSProperties = { minHeight: "100vh", background: DARK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }
  const box: React.CSSProperties = { maxWidth: "400px", width: "100%" }

  // ── Screen A: Gerade gespielt? ────────────────────────────────
  if (screen === "A") return (
    <div style={wrap}><div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>gerade gespielt?</span>
        <span style={{ fontSize: "11px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em" }}>PLAYER</span>
      </div>
      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "lowercase", marginBottom: "6px" }}>dein resultat</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "24px" }}>
        {ort ? <>trag dein ergebnis aus <span style={{ color: TEXT, fontWeight: 700 }}>{ort}</span> ein.</> : "trag dein ergebnis satz für satz ein."}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", padding: "0 4px" }}>
        <span style={{ fontSize: "12px", color: G, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>du</span>
        <span style={{ fontSize: "12px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>gegner</span>
      </div>

      {sets.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", color: MUTED, width: 50, flexShrink: 0 }}>satz {i + 1}</span>
          <input value={s.you} onChange={e => updateSet(i, "you", e.target.value)} placeholder="11" style={inp} type="number" inputMode="numeric" min={0} max={30} />
          <span style={{ color: MUTED, fontSize: "16px" }}>:</span>
          <input value={s.opp} onChange={e => updateSet(i, "opp", e.target.value)} placeholder="8" style={inp} type="number" inputMode="numeric" min={0} max={30} />
          {i >= 3 && <button type="button" onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: "18px", flexShrink: 0 }}>×</button>}
        </div>
      ))}

      {sets.length < 5 && (
        <button type="button" onClick={addSet} style={{ width: "100%", background: "none", border: "1px dashed " + BORDER, borderRadius: "8px", padding: "10px", color: MUTED, cursor: "pointer", fontSize: "13px", marginTop: "4px", fontFamily: "inherit" }}>
          + satz hinzufügen
        </button>
      )}

      {error && <p style={{ fontSize: "13px", color: "#f87171", marginTop: "12px" }}>{error}</p>}

      <button type="button" style={primaryBtn(false)} onClick={goToResult}>resultat ansehen →</button>
      <button type="button" onClick={() => router.push("/login")} style={{ width: "100%", background: "none", border: "none", color: MUTED, fontSize: "12px", textDecoration: "underline", cursor: "pointer", marginTop: "14px", fontFamily: "inherit" }}>
        ich will mich nur anmelden
      </button>
    </div></div>
  )

  // ── Screen B: Du bist jetzt Spieler (Aha) ─────────────────────
  return (
    <div style={wrap}><div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>du bist jetzt spieler</span>
        <span style={{ fontSize: "11px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em" }}>PLAYER</span>
      </div>

      {/* ELO-Ring / Card */}
      <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: "16px", padding: "28px 20px", textAlign: "center", marginBottom: "16px" }}>
        <div style={{
          width: 140, height: 140, margin: "0 auto 16px", borderRadius: "50%",
          border: `4px solid ${level.color}`, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 28px ${level.color}33`,
        }}>
          <span style={{ fontSize: "11px", color: MUTED, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>ELO</span>
          <span style={{ fontSize: "44px", fontWeight: 900, color: TEXT, lineHeight: 1 }}>{provisionalElo}</span>
        </div>

        <p style={{ fontSize: "11px", fontWeight: 700, color: level.color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "4px" }}>dein level</p>
        <h2 style={{ fontSize: "32px", fontWeight: 900, color: level.color, textTransform: "uppercase", marginBottom: "16px", letterSpacing: "-0.02em" }}>{level.name}</h2>

        {/* Rang */}
        <div style={{ borderTop: "1px solid " + BORDER, paddingTop: "16px" }}>
          {rankLoading ? (
            <p style={{ fontSize: "13px", color: MUTED }}>rang wird berechnet…</p>
          ) : rank !== null ? (
            <p style={{ fontSize: "14px", color: TEXT }}>
              geschätzter start-rang <span style={{ color: G, fontWeight: 900, fontSize: "22px" }}>#{rank}</span>
            </p>
          ) : (
            <p style={{ fontSize: "13px", color: MUTED, lineHeight: 1.5 }}>dein rang wird nach dem sichern berechnet.</p>
          )}
        </div>
      </div>

      {/* PingPoints Chip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: CARD, border: "1px solid " + BORDER, borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
        <span style={{ color: "#FFD700", fontWeight: 900, fontSize: "15px" }}>+15 pingpoints</span>
        <span style={{ color: MUTED, fontSize: "12px" }}>nach dem sichern</span>
      </div>
      <p style={{ fontSize: "12px", color: MUTED, textAlign: "center", marginBottom: "8px", lineHeight: 1.5 }}>
        {won ? "sieg eingetragen — dein start-elo bekommt einen bonus." : "resultat eingetragen. sicher dir jetzt deinen rang."}
      </p>

      <button type="button" style={primaryBtn(false)} onClick={saveProfile}>profil sichern →</button>
      <button type="button" onClick={() => router.push("/login")} style={{ width: "100%", background: "none", border: "none", color: MUTED, fontSize: "12px", textDecoration: "underline", cursor: "pointer", marginTop: "14px", fontFamily: "inherit" }}>
        später
      </button>
    </div></div>
  )
}

export default function SpielenPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: DARK }} />}>
      <SpielenInner />
    </Suspense>
  )
}
