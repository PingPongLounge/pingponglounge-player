"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const BG="#0E1014",C="#1A1D24",B="#23272F",M="rgba(255,255,255,0.85)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

const LEVELS = ["Rookie", "Challenger", "Advanced", "Elite"]
const CITIES = ["Glattbrugg", "Oerlikon", "Zürich", "Winterthur", "Baden", "Andere"]
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 7-22 Uhr

export default function CreateMatchPage() {
  const router = useRouter()
  const [level, setLevel]       = useState("")
  const [city, setCity]         = useState("")
  const [date, setDate]         = useState("")
  const [hour, setHour]         = useState<number | "">("")
  const [duration, setDuration] = useState(60)
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [price, setPrice]       = useState("0")
  const [msg, setMsg]           = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function submit() {
    if (!level || !city) { setError("Level und Standort wählen"); return }
    setLoading(true); setError("")
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level, location_name: city, date: date || null,
        start_hour: hour === "" ? null : hour, duration_minutes: duration,
        max_players: maxPlayers, price_per_player: Number(price) || 0, notes: msg || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error || "Fehler"); setLoading(false); return }
    router.push(`/match/${json.id}`)
  }

  const label = { fontSize: 11, fontWeight: 500, color: M, letterSpacing: "0.04em", textTransform: "lowercase" as const, marginBottom: 8, display: "block" }
  const input = { width: "100%", background: C, border: `1px solid ${B}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: W, outline: "none" }
  const chip = (active: boolean) => ({
    padding: "10px 8px", borderRadius: 10, fontSize: 13, fontWeight: active ? 600 : 400, textTransform: "lowercase" as const,
    background: active ? "#fff" : C, border: `1px solid ${active ? "#fff" : B}`, color: active ? "#0E1014" : M, cursor: "pointer",
  })

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/match" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← open game</Link>

        <div style={{ margin: "20px 0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, ...GRAD }}>open game</h1>
          <p style={{ fontSize: 13, color: M, marginTop: 8, fontWeight: 500, textTransform: "lowercase" }}>tisch + zeit eintragen, plätze freigeben — andere spielen mit</p>
        </div>

        {/* Level */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>level</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={chip(level === l)}>{l}</button>)}
          </div>
        </div>

        {/* Standort */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>standort</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CITIES.map(c => <button key={c} onClick={() => setCity(c)} style={chip(city === c)}>{c}</button>)}
          </div>
        </div>

        {/* Datum + Zeit */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>datum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...input, colorScheme: "dark" }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={label}>uhrzeit</label>
            <select value={hour} onChange={e => setHour(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...input, colorScheme: "dark" }}>
              <option value="">–</option>
              {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </div>
        </div>

        {/* Dauer */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>dauer</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[30, 60, 90, 120].map(d => <button key={d} onClick={() => setDuration(d)} style={chip(duration === d)}>{d}min</button>)}
          </div>
        </div>

        {/* Plätze */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>plätze insgesamt (inkl. dir)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[2, 3, 4].map(n => <button key={n} onClick={() => setMaxPlayers(n)} style={chip(maxPlayers === n)}>{n} spieler</button>)}
          </div>
        </div>

        {/* Preis */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>preis pro spieler (chf) — tischkosten geteilt</label>
          <input type="number" min="0" max="999" value={price} onChange={e => setPrice(e.target.value)} style={input} />
        </div>

        {/* Notiz */}
        <div style={{ marginBottom: 24 }}>
          <label style={label}>nachricht (optional)</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="z.b. locker spielen, best-of-5..." rows={3} style={{ ...input, resize: "none" }} />
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button onClick={submit} disabled={loading || !level || !city} style={{
          width: "100%", padding: "16px", borderRadius: 12, fontSize: 15, fontWeight: 600,
          background: !level || !city ? B : "#fff", color: !level || !city ? M : "#0E1014",
          border: "none", cursor: !level || !city ? "default" : "pointer", textTransform: "lowercase",
        }}>
          {loading ? "wird erstellt..." : "open game veröffentlichen →"}
        </button>
      </div>
    </main>
  )
}
