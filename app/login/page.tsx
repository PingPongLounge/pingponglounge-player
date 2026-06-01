"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import PlayerLogo from "@/app/components/PlayerLogo"

type Mode = "login" | "register" | "magic"

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" }
    })
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else window.location.href = "/"
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" }
    })
    if (err) { setError(err.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" }
    })
    setSent(true); setLoading(false)
  }

  const S = {
    input: {
      width: "100%", background: "#0D0E12", border: "1px solid #26282E",
      borderRadius: "10px", padding: "14px 16px", fontSize: "15px",
      color: "#E8E6E1", outline: "none", boxSizing: "border-box" as const,
      fontFamily: "inherit"
    },
    btn: (primary = true) => ({
      width: "100%", border: "none", borderRadius: "10px", padding: "15px",
      fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
      textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "inherit",
      background: primary ? (loading ? "#26282E" : "#39FF14") : "#1A1B1F",
      color: primary ? (loading ? "#6B6E7A" : "#0A0A0C") : "#A8AAB2",
    }),
    link: {
      background: "none", border: "none", color: "#39FF14", fontSize: "13px",
      cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111214", padding: "20px" }}>
      <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: "32px" }}>
          <PlayerLogo />
        </div>

        {sent ? (
          <div style={{ background: "#0D0E12", border: "1px solid #26282E", borderRadius: "16px", padding: "32px" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>📬</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#E8E6E1", marginBottom: "8px" }}>
              {mode === "register" ? "Bestätige deine Email" : "Check deine Emails"}
            </p>
            <p style={{ fontSize: "13px", color: "#6B6E7A" }}>
              {mode === "register"
                ? `Wir haben eine Bestätigungsmail an ${email} geschickt.`
                : `Login-Link wurde an ${email} geschickt.`}
            </p>
          </div>
        ) : (
          <>
            {/* Google */}
            <button onClick={signInWithGoogle} style={{ width: "100%", background: "#fff", color: "#0A0A0C", border: "none", borderRadius: "10px", padding: "15px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px", fontFamily: "inherit" }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Mit Google einloggen
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ flex: 1, height: "1px", background: "#26282E" }} />
              <span style={{ fontSize: "12px", color: "#6B6E7A" }}>oder</span>
              <div style={{ flex: 1, height: "1px", background: "#26282E" }} />
            </div>

            {/* Mode tabs */}
            <div style={{ display: "flex", background: "#0D0E12", borderRadius: "10px", padding: "3px", marginBottom: "20px", border: "1px solid #26282E" }}>
              {([["login", "Einloggen"], ["register", "Registrieren"], ["magic", "Magic Link"]] as [Mode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); setError("") }} style={{ flex: 1, background: mode === m ? "#1A1B1F" : "none", border: "none", borderRadius: "8px", padding: "8px 4px", fontSize: "12px", fontWeight: mode === m ? 700 : 400, color: mode === m ? "#E8E6E1" : "#6B6E7A", cursor: "pointer", fontFamily: "inherit" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Login form */}
            {mode === "login" && (
              <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input style={S.input} type="password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} required />
                {error && <p style={{ fontSize: "13px", color: "#FF6666", textAlign: "left" }}>{error}</p>}
                <button type="submit" disabled={loading} style={S.btn()}>
                  {loading ? "..." : "Einloggen"}
                </button>
                <button type="button" onClick={() => setMode("register")} style={S.link}>
                  Noch kein Konto? Registrieren →
                </button>
              </form>
            )}

            {/* Register form */}
            {mode === "register" && (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input style={S.input} type="password" placeholder="Passwort (min. 6 Zeichen)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                {error && <p style={{ fontSize: "13px", color: "#FF6666", textAlign: "left" }}>{error}</p>}
                <button type="submit" disabled={loading} style={S.btn()}>
                  {loading ? "..." : "Konto erstellen"}
                </button>
                <button type="button" onClick={() => setMode("login")} style={S.link}>
                  Bereits Konto? Einloggen →
                </button>
              </form>
            )}

            {/* Magic Link form */}
            {mode === "magic" && (
              <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                {error && <p style={{ fontSize: "13px", color: "#FF6666", textAlign: "left" }}>{error}</p>}
                <button type="submit" disabled={loading} style={S.btn()}>
                  {loading ? "Wird gesendet..." : "Login Link senden"}
                </button>
                <p style={{ fontSize: "12px", color: "#6B6E7A" }}>Kein Passwort nötig — wir schicken dir einen Link.</p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
