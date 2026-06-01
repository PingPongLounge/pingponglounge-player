"use client"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const G = "#39FF14"
const BG = "#111214"

const inputStyle: React.CSSProperties = {
  background: "#1A1C1F", border: "1px solid #26282E", borderRadius: 10,
  padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none",
  width: "100%", fontFamily: "'League Spartan', system-ui, sans-serif",
  boxSizing: "border-box",
}

const btnStyle = (loading: boolean): React.CSSProperties => ({
  border: "2px solid transparent",
  background: loading
    ? "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #26282E 0%, #26282E 100%) border-box"
    : "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #39FF14 0%, #00E5FF 100%) border-box",
  borderRadius: 10, padding: "14px", fontSize: "14px", fontWeight: 700,
  cursor: loading ? "default" : "pointer", color: loading ? "#6B6E7A" : G,
  textTransform: "uppercase" as const, letterSpacing: "0.06em",
  width: "100%", fontFamily: "'League Spartan', system-ui, sans-serif",
})

function ResetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get("auth_error")

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
    if (authError) {
      setMsg(authError)
      setStatus("error")
      return
    }

    // Hash lesen (kommt vom Callback: #access_token=...&refresh_token=...&type=recovery)
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get("access_token")
    const refresh_token = params.get("refresh_token")

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setMsg("Link ungültig oder abgelaufen.")
          setStatus("error")
        } else {
          setStatus("ready")
        }
      })
      return
    }

    // Fallback: bestehende Session prüfen
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("ready")
      } else {
        setMsg("Kein Reset-Token gefunden. Bitte neuen Link anfordern.")
        setStatus("error")
      }
    })
  }, [authError])

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

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'League Spartan', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ color: G, fontSize: 28, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center",
          marginBottom: 8 }}>
          Neues Passwort
        </h1>

        {status === "loading" && (
          <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Lädt…</p>
        )}

        {status === "ready" && (
          <form onSubmit={handleReset}
            style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
            <input type="password" placeholder="Neues Passwort" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Passwort bestätigen" value={confirm}
              onChange={e => setConfirm(e.target.value)} style={inputStyle} />
            {msg && <p style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{msg}</p>}
            <button type="submit" disabled={loading} style={btnStyle(loading)}>
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
              textDecoration: "none", fontFamily: "'League Spartan', system-ui, sans-serif",
            }}>Zurück zum Login</a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div style={{ background: "#111214", minHeight: "100vh" }} />}>
      <ResetContent />
    </Suspense>
  )
}
