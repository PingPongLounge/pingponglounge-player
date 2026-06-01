"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Prüfen ob Session vorhanden
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      } else {
        setError("Link ungültig oder abgelaufen. Bitte nochmals zurücksetzen.")
      }
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwörter stimmen nicht überein."); return }
    if (password.length < 6) { setError("Mindestens 6 Zeichen."); return }
    setLoading(true); setError("")
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => window.location.href = "/", 2000)
  }

  const G = "#39FF14"
  const inputStyle = {
    width: "100%", background: "#15161A", border: "1px solid #26282E",
    borderRadius: "10px", padding: "14px 16px", fontSize: "15px",
    color: "#E8E6E1", outline: "none", boxSizing: "border-box" as const,
    fontFamily: "'League Spartan', system-ui, sans-serif",
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111214", padding: "20px" }}>
      <div style={{ maxWidth: "360px", width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: G, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" }}>Player</p>
        <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#E8E6E1", textTransform: "uppercase", marginBottom: "28px" }}>Neues Passwort</h1>

        {done ? (
          <p style={{ color: G, fontSize: "14px" }}>Passwort geändert ✓ — weiterleitung...</p>
        ) : error && !ready ? (
          <div>
            <p style={{ fontSize: "13px", color: "#FF4444", marginBottom: "20px" }}>{error}</p>
            <a href="/login" style={{ color: G, fontSize: "13px" }}>Zurück zum Login</a>
          </div>
        ) : ready ? (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Neues Passwort" required minLength={6} style={inputStyle} />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Passwort bestätigen" required minLength={6} style={inputStyle} />
            {error && <p style={{ fontSize: "12px", color: "#FF4444", textAlign: "left" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              background: "transparent", border: `2px solid ${G}`, borderRadius: "10px",
              padding: "14px", fontSize: "14px", fontWeight: 700, cursor: "pointer",
              color: G, textTransform: "uppercase" as const, letterSpacing: "0.06em",
              opacity: loading ? 0.5 : 1,
            }}>
              {loading ? "..." : "Passwort speichern"}
            </button>
          </form>
        ) : (
          <p style={{ color: "#6B6E7A", fontSize: "13px" }}>Prüfe Link...</p>
        )}
      </div>
    </div>
  )
}
