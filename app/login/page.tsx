"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" }
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0C", padding: "20px" }}>
      <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#FF00C8", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "12px" }}>Ping Pong Lounge</p>
        <h1 style={{ fontSize: "48px", fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, marginBottom: "16px", color: "#FFF9F3" }}>PLAYER</h1>
        <p style={{ fontSize: "15px", color: "#6B6E7A", marginBottom: "40px" }}>Liga, Turniere, dein ELO-Ranking.</p>
        {sent ? (
          <div style={{ background: "#0D0E12", border: "1px solid #26282E", borderRadius: "16px", padding: "32px" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>📬</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#FFF9F3", marginBottom: "8px" }}>Check deine Emails</p>
            <p style={{ fontSize: "13px", color: "#6B6E7A" }}>Wir haben einen Login-Link an <strong style={{ color: "#FF00C8" }}>{email}</strong> geschickt.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              required
              style={{ width: "100%", background: "#0D0E12", border: "1px solid #26282E", borderRadius: "12px", padding: "16px", fontSize: "15px", color: "#FFF9F3", outline: "none" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "#FF00C8", color: "#0A0A0C", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {loading ? "Wird gesendet..." : "Login Link senden"}
            </button>
          </form>
        )}
        <p style={{ marginTop: "20px", fontSize: "12px", color: "#6B6E7A" }}>Kein Passwort nötig — wir schicken dir einen Link.</p>
      </div>
    </div>
  )
}
