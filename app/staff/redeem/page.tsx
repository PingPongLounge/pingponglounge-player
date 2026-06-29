"use client"
import { useState } from "react"

const BG = "#0E1014"
const C  = "#1A1D24"
const B  = "#1A1D24"
const M  = "rgba(255,255,255,0.66)"
const G  = "#39FF14"
const W  = "#FFFFFF"
const GRAD = "linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"

export default function StaffRedeemPage() {
  const [code, setCode]       = useState("")
  const [result, setResult] = useState<{
    ok: boolean
    player?: string
    hours?: number
    type?: string
  } | null>(null)
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setResult(null); setLoading(true)
    const res = await fetch("/api/credits/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setResult(data)
    setCode("")
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>staff tool</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'League Spartan', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>code einlösen</h1>
        <p style={{ fontSize: 13, color: M, marginBottom: 28 }}>gutscheincode des kunden eintippen oder per kamera scannen.</p>

        <form onSubmit={handleCheck}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="X7K2QP"
            maxLength={6}
            required
            autoFocus
            style={{
              width: "100%",
              background: C,
              border: `2px solid ${code.length === 6 ? G : B}`,
              borderRadius: 12,
              padding: "18px 20px",
              fontSize: 28,
              fontWeight: 900,
              color: W,
              letterSpacing: "0.18em",
              outline: "none",
              textAlign: "center",
              textTransform: "uppercase",
              boxSizing: "border-box",
              marginBottom: 12,
              fontFamily: "monospace",
              transition: "border-color 0.2s",
            }}
          />
          <button
            type="submit"
            disabled={loading || code.length < 6}
            style={{
              width: "100%",
              background: code.length === 6 ? "#fff" : B,
              color: code.length === 6 ? "#0E1014" : M,
              border: "none",
              borderRadius: 10,
              padding: "16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: code.length === 6 ? "pointer" : "not-allowed",
              textTransform: "lowercase",
              letterSpacing: "0.02em",
              transition: "all 0.2s",
            }}
          >
            {loading ? "prüfen..." : "code prüfen & einlösen"}
          </button>
        </form>

        {error && (
          <div style={{
            background: "#FF444420",
            border: "1px solid #FF444444",
            borderRadius: 12,
            padding: "16px",
            marginTop: 16,
            textAlign: "center",
          }}>
            <p style={{ color: "#FF6666", fontWeight: 700, fontSize: 15, margin: 0 }}>✗ {error}</p>
          </div>
        )}

        {result && (
          <div style={{
            background: `${G}15`,
            border: `1px solid ${G}44`,
            borderRadius: 12,
            padding: "20px",
            marginTop: 16,
          }}>
            <p style={{ color: G, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>✓ CODE GÜLTIG</p>
            {result.player && (
              <p style={{ fontSize: 24, fontWeight: 900, color: W, margin: "0 0 4px" }}>{result.player as string}</p>
            )}
            <p style={{ fontSize: 13, color: M, margin: "0 0 16px" }}>
              {result.type === "signup" ? "Willkommensbonus" : "Freund geworben"} · {result.hours as number}h
            </p>
            <div style={{
              background: G,
              color: "#0E1014",
              borderRadius: 8,
              padding: "12px",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              {result.hours as number} Stunde{(Number(result.hours)) > 1 ? "n" : ""} gewähren ✓
            </div>
          </div>
        )}

        <p style={{ marginTop: 32, fontSize: 11, color: M, textAlign: "center" }}>
          nur für ppl mitarbeiter · playerapp.ch/staff/redeem
        </p>
      </div>
    </main>
  )
}
