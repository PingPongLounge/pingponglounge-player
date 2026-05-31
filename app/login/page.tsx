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
        
    <button
      type="button"
      onClick={signInWithGoogle}
      style={{ width: '100%', background: '#fff', color: '#0A0A0C', border: 'none', borderRadius: '10px', padding: '15px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Mit Google einloggen
    </button>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{ flex: 1, height: '1px', background: '#26282E' }} />
      <span style={{ fontSize: '12px', color: '#6B6E7A' }}>oder</span>
      <div style={{ flex: 1, height: '1px', background: '#26282E' }} />
    </div>{sent ? (
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
