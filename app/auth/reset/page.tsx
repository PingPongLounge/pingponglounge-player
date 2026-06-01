"use client"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

const G = "#39FF14"
const BG = "#111214"

export default function ResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"waiting" | "ready" | "done" | "error">("waiting")
  const [msg, setMsg] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Implicit flow: Supabase liest Hash automatisch + feuert PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setStatus("ready")
        } else if (event === "SIGNED_IN" && session) {
          // PKCE / OTP flow: Session bereits gesetzt durch Callback
          setStatus("ready")
        }
      }
    )

    // Fallback: aktuelle Session prüfen (OTP/PKCE via Callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus("ready")
    })

    // Fallback: token_hash direkt in URL (falls Callback nicht genutzt)
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get("token_hash")
    const type = params.get("type")
    if (token_hash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash, type: "recovery" }).then(({ error }) => {
        if (!error) setStatus("ready")
        else setMsg("Link ungültig oder abgelaufen.")
      })
    }

    return () => subscription.unsubscribe()
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

  const btn: React.CSSProperties = {
    border: "2px solid transparent",
    background: loading
      ? "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #26282E 0%, #26282E 100%) border-box"
      : "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #39FF14 0%, #00E5FF 100%) border-box",
    borderRadius: 10,
    padding: "14px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    color: loading ? "#6B6E7A" : G,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    width: "100%",
    fontFamily: "'League Spartan', system-ui, sans-serif",
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, fontFamily: "'League Spartan', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ color: G, fontSize: 28, fontWeight: 800, marginBottom: 8,
          textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>
          Neues Passwort
        </h1>

        {status === "waiting" && (
          <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            Link wird geprüft…
          </p>
        )}

        {status === "ready" && (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
            <input
              type="password"
              placeholder="Neues Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ background: "#1A1C1F", border: "1px solid #26282E", borderRadius: 10,
                padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none",
                fontFamily: "'League Spartan', system-ui, sans-serif" }}
            />
            <input
              type="password"
              placeholder="Passwort bestätigen"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ background: "#1A1C1F", border: "1px solid #26282E", borderRadius: 10,
                padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none",
                fontFamily: "'League Spartan', system-ui, sans-serif" }}
            />
            {msg && <p style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{msg}</p>}
            <button type="submit" disabled={loading} style={btn}>
              {loading ? "Speichern…" : "Passwort speichern"}
            </button>
          </form>
        )}

        {status === "done" && (
          <p style={{ color: G, textAlign: "center", marginTop: 40, fontSize: 16 }}>
            ✓ Passwort geändert — weiterleitung…
          </p>
        )}

        {msg && status === "waiting" && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ color: "#FF6B6B", marginBottom: 16 }}>{msg}</p>
            <button onClick={() => router.push("/login")} style={btn}>
              Zurück zum Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
