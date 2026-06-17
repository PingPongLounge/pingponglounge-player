"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const BG="#14161A",C="#1B1E25",B="#1E2230",M="rgba(255,255,255,0.62)",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

const LEVELS = ["Rookie", "Challenger", "Advanced", "Elite"]
const CITIES = ["Zürich", "Basel", "Luzern", "St. Gallen", "Glattbrugg", "Andere"]

export default function CreateMatchPage() {
  const router = useRouter()
  const [level, setLevel]   = useState("")
  const [city, setCity]     = useState("")
  const [time, setTime]     = useState("")
  const [msg, setMsg]       = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")

  async function submit() {
    if (!level || !city) { setError("Level und Stadt wählen"); return }
    setLoading(true); setError("")
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, city, proposed_time: time || null, message: msg || null }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error || "Fehler"); setLoading(false); return }
    router.push("/match")
  }

  const labelStyle = { fontSize: 11, fontWeight: 400, color: M, letterSpacing: "0.04em", textTransform: "lowercase" as const, marginBottom: 8, display: "block" }
  const inputStyle = { width: "100%", background: C, border: `1px solid ${B}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: W, outline: "none" }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        <Link href="/match" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← open game</Link>

        <div style={{ margin: "20px 0 28px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, ...GRAD }}>dein spiel</h1>
          <p style={{ fontSize: 13, color: M, marginTop: 8, fontWeight: 400 }}>stell ein spiel ein — andere können beitreten</p>
        </div>

        {/* Level */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>dein level</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {LEVELS.map(l => {
              const active = level === l
              return (
                <button key={l} onClick={() => setLevel(l)} style={{
                  padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: active ? 600 : 400, textTransform: "lowercase",
                  background: active ? "#fff" : C,
                  border: `1px solid ${active ? "#fff" : B}`,
                  color: active ? "#14161A" : M, cursor: "pointer"
                }}>{l}</button>
              )
            })}
          </div>
        </div>

        {/* Stadt */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>standort / stadt</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CITIES.map(c => (
              <button key={c} onClick={() => setCity(c)} style={{
                padding: "10px 8px", borderRadius: 10, fontSize: 12, fontWeight: city === c ? 600 : 400, textTransform: "lowercase",
                background: city === c ? "#fff" : C,
                border: `1px solid ${city === c ? "#fff" : B}`,
                color: city === c ? "#14161A" : M, cursor: "pointer"
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Zeit (optional) */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>wann? (optional)</label>
          <input
            type="datetime-local"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{ ...inputStyle, colorScheme: "dark" }}
          />
        </div>

        {/* Nachricht (optional) */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>nachricht (optional)</label>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="z.B. suche jemanden für best-of-5..."
            rows={3}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !level || !city}
          style={{
            width: "100%", padding: "16px", borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: !level || !city ? B : "#fff",
            color: !level || !city ? M : "#14161A",
            border: "none", cursor: !level || !city ? "default" : "pointer",
            textTransform: "lowercase"
          }}
        >
          {loading ? "wird erstellt..." : "spiel veröffentlichen →"}
        </button>

      </div>
    </main>
  )
}