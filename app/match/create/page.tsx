"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8"

const LEVELS = ["Locker", "Hobby", "Fortgeschritten", "Competitive"]
const CITIES = ["Zürich", "Basel", "Luzern", "St. Gallen", "Glattbrugg", "Andere"]
const levelColor = (l: string) => ({ Locker: "#4ADE80", Hobby: "#FACC15", Fortgeschritten: "#FB923C", Competitive: PK }[l] || G)

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

  const labelStyle = { fontSize: 11, fontWeight: 700, color: M, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8, display: "block" }
  const inputStyle = { width: "100%", background: C, border: `1px solid ${B}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: W, outline: "none" }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        <Link href="/match" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← Open Matches</Link>

        <div style={{ margin: "20px 0 28px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1 }}>MATCH ERSTELLEN</h1>
          <p style={{ fontSize: 13, color: M, marginTop: 6 }}>Stell ein Match ein — andere können beitreten</p>
        </div>

        {/* Level */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Dein Level</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {LEVELS.map(l => {
              const lc = levelColor(l)
              const active = level === l
              return (
                <button key={l} onClick={() => setLevel(l)} style={{
                  padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: active ? `${lc}20` : C,
                  border: `1px solid ${active ? lc : B}`,
                  color: active ? lc : M, cursor: "pointer"
                }}>{l}</button>
              )
            })}
          </div>
        </div>

        {/* Stadt */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Standort / Stadt</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CITIES.map(c => (
              <button key={c} onClick={() => setCity(c)} style={{
                padding: "10px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: city === c ? `${G}18` : C,
                border: `1px solid ${city === c ? G : B}`,
                color: city === c ? G : M, cursor: "pointer"
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Zeit (optional) */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Wann? (optional)</label>
          <input
            type="datetime-local"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{ ...inputStyle, colorScheme: "dark" }}
          />
        </div>

        {/* Nachricht (optional) */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Nachricht (optional)</label>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="z.B. Suche jemanden für Best-of-5..."
            rows={3}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !level || !city}
          style={{
            width: "100%", padding: "16px", borderRadius: 12, fontSize: 15, fontWeight: 800,
            background: !level || !city ? B : G,
            color: !level || !city ? M : "#0A0A0C",
            border: "none", cursor: !level || !city ? "default" : "pointer",
            textTransform: "uppercase", letterSpacing: "0.06em"
          }}
        >
          {loading ? "Wird erstellt..." : "Match einstellen →"}
        </button>

      </div>
    </main>
  )
}