"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const G = "#39FF14"
const G_DIM = "rgba(57,255,20,0.12)"
const DARK = "#0A0A0C"
const SURFACE = "#111214"
const CARD = "#15161A"
const BORDER = "#26282E"
const TEXT = "#E8E6E1"
const MUTED = "#6B6E7A"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" }
    })
  }

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: DARK, padding: "20px" }}>

      {/* Logo wordmark */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          {/* Paddle icon */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="11" fill={G_DIM} stroke={G} strokeWidth="1.5"/>
            <circle cx="14" cy="14" r="5" fill={G} fillOpacity="0.2"/>
            <circle cx="14" cy="14" r="2" fill={G}/>
            <rect x="22" y="20" width="7" height="3" rx="1.5" fill={G} transform="rotate(-40 22 20)"/>
          </svg>
          <h1 style={{ fontSize: "38px", fontWeight: 900, color: TEXT, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1 }}>
            PLAYER
          </h1>
        </div>
        <p style={{ fontSize: "11px", fontWeight: 600, color: MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          by Ping Pong Lounge
        </p>
      </div>

      <div style={{ maxWidth: "360px", width: "100%" }}>

        {/* Google */}
        <button onClick={signInWithGoogle} style={{ width: "100%", background: "#fff", color: "#111", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px", letterSpacing: "0.01em" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Mit Google einloggen
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: BORDER }} />
          <span style={{ fontSize: "11px", color: MUTED, letterSpacing: "0.08em" }}>ODER</span>
          <div style={{ flex: 1, height: "1px", background: BORDER }} />
        </div>

        {sent ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "28px", textAlign: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 12px" }}>
              <path d="M4 4h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z"/>
              <polyline points="4,4 12,13 20,4"/>
            </svg>
            <p style={{ fontSize: "16px", fontWeight: 700, color: TEXT, marginBottom: "6px" }}>Link gesendet</p>
            <p style={{ fontSize: "13px", color: MUTED }}>Check deine Emails — <span style={{ color: G }}>{email}</span></p>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              required
              style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", fontSize: "15px", color: TEXT, outline: "none", boxSizing: "border-box" as const }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: G, color: DARK, border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase" as const, letterSpacing: "0.08em", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Wird gesendet..." : "Login Link senden"}
            </button>
          </form>
        )}

        <p style={{ marginTop: "24px", fontSize: "11px", color: MUTED, textAlign: "center", lineHeight: 1.6 }}>
          Kein Konto nötig — wird beim ersten Login automatisch erstellt.
        </p>
      </div>
    </div>
  )
}
