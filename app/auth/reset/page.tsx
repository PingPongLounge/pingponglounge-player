"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPage() {
  const [password, setPassword] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => window.location.href = "/", 2000)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111214", padding: "20px" }}>
      <div style={{ maxWidth: "360px", width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#39FF14", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" }}>Player</p>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#E8E6E1", textTransform: "uppercase", marginBottom: "28px" }}>Neues Passwort</h1>
        {done ? (
          <p style={{ color: "#39FF14", fontSize: "14px" }}>Passwort geändert ✓ — weiterleitung...</p>
        ) : (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Neues Passwort" required minLength={6}
              style={{ width: "100%", background: "#15161A", border: "1px solid #26282E", borderRadius: "10px", padding: "14px 16px", fontSize: "15px", color: "#E8E6E1", outline: "none", boxSizing: "border-box" as const }} />
            {error && <p style={{ fontSize: "12px", color: "#FF4444" }}>{error}</p>}
            <button type="submit" style={{ background: "transparent", border: "2px solid #39FF14", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", color: "#39FF14", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              Passwort speichern
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
