"use client"
import { useState } from "react"

const BG = "#111214"
const C  = "#15161A"
const B  = "#26282E"
const M  = "#6B6E7A"
const G  = "#39FF14"
const W  = "#E8E6E1"

export default function StaffRedeemPage() {
  const [code, setCode]       = useState("")
  const [result, setResult]   = useState<Record<string,unknown> | null>(null)
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
        <p style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>Staff Tool</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: W, textTransform: "uppercase", marginBottom: 4 }}>Code Einlösen</h1>
        <p style={{ fontSize: 13, color: M, marginBottom: 28 }}>Gutscheincode des Kunden eintippen oder per Kamera scannen.</p>

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
              background: code.length === 6 ? G : B,
              color: code.length === 6 ? "#0A0A0C" : M,
              border: "none",
              borderRadius: 10,
              padding: "16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: code.length === 6 ? "pointer" : "not-allowed",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Prüfen..." : "Code prüfen & einlösen"}
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
              color: "#0A0A0C",
              borderRadius: 8,
              padding: "12px",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              {result.hours as number} Stunde{(result.hours as number) > 1 ? "n" : ""} gewähren ✓
            </div>
          </div>
        )}

        <p style={{ marginTop: 32, fontSize: 11, color: M, textAlign: "center" }}>
          Nur für PPL Mitarbeiter · playerapp.ch/staff/redeem
        </p>
      </div>
    </main>
  )
}
