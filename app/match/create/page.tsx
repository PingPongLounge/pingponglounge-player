"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BG, CARD, CELL, W, MUT, DANGER, btn, chipBtn, h1, body, label as themeLabel, input as themeInput, backLink } from "@/app/theme"

const M=MUT, C=CARD, B=CELL

const LEVELS = ["1", "2", "3", "4", "5", "6", "7"]
const LEVEL_LABEL = (l: string) => `Level ${l}`
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

  const label = themeLabel
  const input = themeInput
  const chip = (active: boolean): React.CSSProperties => ({ ...chipBtn(active), borderRadius: 10, padding: "10px 8px", fontSize: 13, textAlign: "center" })

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/match" style={backLink}>← Open Game</Link>

        <div style={{ margin: "20px 0 24px" }}>
          <h1 style={h1}>Open Game</h1>
          <p style={{ ...body, marginTop: 8 }}>Tisch + Zeit eintragen, Plätze freigeben — andere spielen mit</p>
        </div>

        {/* Level */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Level</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={chip(level === l)}>{LEVEL_LABEL(l)}</button>)}
          </div>
        </div>

        {/* Standort */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Standort</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CITIES.map(c => <button key={c} onClick={() => setCity(c)} style={chip(city === c)}>{c}</button>)}
          </div>
        </div>

        {/* Datum + Zeit */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Datum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...input, colorScheme: "dark" }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={label}>Uhrzeit</label>
            <select value={hour} onChange={e => setHour(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...input, colorScheme: "dark" }}>
              <option value="">–</option>
              {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </div>
        </div>

        {/* Dauer */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Dauer</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[30, 60, 90, 120].map(d => <button key={d} onClick={() => setDuration(d)} style={chip(duration === d)}>{d} Min</button>)}
          </div>
        </div>

        {/* Plätze */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Plätze insgesamt (inkl. dir)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[2, 3, 4].map(n => <button key={n} onClick={() => setMaxPlayers(n)} style={chip(maxPlayers === n)}>{n} Spieler</button>)}
          </div>
        </div>

        {/* Preis */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Preis pro Spieler (CHF) — Tischkosten geteilt</label>
          <input type="number" min="0" max="999" value={price} onChange={e => setPrice(e.target.value)} style={input} />
        </div>

        {/* Notiz */}
        <div style={{ marginBottom: 24 }}>
          <label style={label}>Nachricht (optional)</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="z. B. locker spielen, Best-of-5 …" rows={3} style={{ ...input, resize: "none" }} />
        </div>

        {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button onClick={submit} disabled={loading || !level || !city} style={{ ...btn, width: "100%", padding: 16, fontSize: 15, opacity: !level || !city ? 0.5 : 1, cursor: !level || !city ? "default" : "pointer" }}>
          {loading ? "Wird erstellt …" : "Open Game veröffentlichen →"}
        </button>
      </div>
    </main>
  )
}
