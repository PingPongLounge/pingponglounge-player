"use client"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

const G = "#39FF14"
const BG = "#111214"

const inputStyle: React.CSSProperties = {
  background: "#1A1C1F", border: "1px solid #26282E", borderRadius: 10,
  padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none",
  width: "100%", fontFamily: "'League Spartan', system-ui, sans-serif",
  boxSizing: "border-box" as const,
}

export default function ResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">("loading")
  const [msg, setMsg] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function init() {
      // ── Hash-Tokens (vom Callback) ─────────────────────────────────────────
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const hashAccessToken = hashParams.get("access_token")
      const hashRefreshToken = hashParams.get("refresh_token")

      if (hashAccessToken && hashRefreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        })
        if (!error) { setStatus("ready"); return }
      }

      // ── Code aus URL → API-Route tauscht server-seitig ───────────────────
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      const authError = urlParams.get("auth_error")

      if (authError) {
        setMsg(authError)
        setStatus("error")
        return
      }

      if (code) {
        const res = await fetch(`/api/reset-exchange?code=${code}`)
        const json = await res.json()
        if (json.error) {
          setMsg("Link ungültig oder abgelaufen.")
          setStatus("error")
          return
        }
        const { error } = await supabase.auth.setSession({
          access_token: json.access_token,
          refresh_token: json.refresh_token,
        })
        if (!error) { setStatus("ready"); return }
        setMsg("Session konnte nicht gesetzt werden.")
        setStatus("error")
        return
      }

      // ── Bestehende Session ────────────────────────────────────────────────
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setStatus("ready"); return }

      setMsg("Kein Reset-Token. Bitte neuen Link anfordern.")
      setStatus("error")
    }

    init()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setMsg("Passwörter stimmen nicht überein."); return }
    if (password.length < 6) { setMsg("Mindestens 6 Zeichen."); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setStatus("done")
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  const btn = (disabled: boolean): React.CSSProperties => ({
    border: "2px solid transparent",
    background: disabled
      ? "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #26282E 0%, #26282E 100%) border-box"
      : "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #39FF14 0%, #00E5FF 100%) border-box",
    borderRadius: 10, padding: "14px", fontSize: "14px", fontWeight: 700,
    cursor: disabled ? "default" : "pointer", color: disabled ? "#6B6E7A" : G,
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    width: "100%", fontFamily: "'League Spartan', system-ui, sans-serif",
  })

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'League Spartan', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ color: G, fontSize: 28, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "0.08em",
          textAlign: "center", marginBottom: 8 }}>
          Neues Passwort
        </h1>

        {status === "loading" && (
          <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Lädt…</p>
        )}

        {status === "ready" && (
          <form onSubmit={handleReset}
            style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
            <input type="password" placeholder="Neues Passwort"
              value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Passwort bestätigen"
              value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} />
            {msg && <p style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{msg}</p>}
            <button type="submit" disabled={loading} style={btn(loading)}>
              {loading ? "Speichern…" : "Passwort speichern"}
            </button>
          </form>
        )}

        {status === "done" && (
          <p style={{ color: G, textAlign: "center", marginTop: 40, fontSize: 16 }}>
            ✓ Passwort geändert — wird weitergeleitet…
          </p>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ color: "#FF6B6B", marginBottom: 20, fontSize: 14 }}>{msg}</p>
            <a href="/login" style={{
              border: "2px solid transparent",
              background: "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #39FF14 0%, #00E5FF 100%) border-box",
              borderRadius: 10, padding: "14px 24px", color: G, fontWeight: 700,
              textTransform: "uppercase" as const, letterSpacing: "0.06em",
              textDecoration: "none", fontSize: "14px",
              fontFamily: "'League Spartan', system-ui, sans-serif",
            }}>Zurück zum Login</a>
          </div>
        )}
      </div>
    </div>
  )
}
