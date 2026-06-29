"use client"
import { useSearchParams } from "next/navigation"
import { updatePassword } from "./actions"
import { Suspense } from "react"

const G = "#39FF14"
const BG = "#111214"

const input: React.CSSProperties = {
  background: "#1A1C1F", border: "1px solid #26282E", borderRadius: 10,
  padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none",
  width: "100%", fontFamily: "'League Spartan', system-ui, sans-serif",
  boxSizing: "border-box" as const,
}

const btn: React.CSSProperties = {
  border: "2px solid transparent",
  background: "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #39FF14 0%, #1FD1C4 100%) border-box",
  borderRadius: 10, padding: "14px", fontSize: "14px", fontWeight: 700,
  cursor: "pointer", color: G, textTransform: "uppercase" as const,
  letterSpacing: "0.06em", width: "100%",
  fontFamily: "'League Spartan', system-ui, sans-serif",
}

function FormContent() {
  const searchParams = useSearchParams()
  const msg = searchParams.get("msg")

  return (
    <form action={updatePassword}
      style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
      <input name="password" type="password" placeholder="Neues Passwort"
        required minLength={6} style={input} />
      <input name="confirm" type="password" placeholder="Passwort bestätigen"
        required style={input} />
      {msg && (
        <p style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{msg}</p>
      )}
      <button type="submit" style={btn}>Passwort speichern</button>
    </form>
  )
}

export default function ResetForm() {
  return (
    <Suspense fallback={null}>
      <FormContent />
    </Suspense>
  )
}
