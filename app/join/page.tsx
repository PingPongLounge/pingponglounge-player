"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

const BG = "#14161A"
const G  = "#39FF14"
const M  = "rgba(255,255,255,0.66)"
const W  = "#FFFFFF"
const GRAD = "linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"

function JoinContent() {
  const params = useSearchParams()
  const ref = params.get("ref") || ""

  useEffect(() => {
    if (ref) {
      document.cookie = `ppl_ref=${ref};path=/;max-age=2592000`
    }
  }, [ref])

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>einladung</p>
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: "'League Spartan', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, marginBottom: 16, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          GRATIS<br/>SPIELEN
        </h1>
        <div style={{ background: "#1B1E25", border: "1px solid #1E2230", borderRadius: 14, padding: "20px", marginBottom: 24 }}>
          {ref && <p style={{ fontSize: 13, color: M, marginBottom: 8 }}>{ref} hat dich eingeladen</p>}
          <p style={{ fontSize: 18, fontWeight: 700, color: W, margin: 0 }}>
            melde dich an und bekomme <span style={{ color: G }}>2 gratisstunden</span>
          </p>
        </div>
        <Link href="/login" style={{
          display: "block",
          background: "#fff",
          color: "#14161A",
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
          padding: "16px",
          borderRadius: 10,
          textTransform: "lowercase",
          letterSpacing: "0.02em",
        }}>jetzt kostenlos anmelden →</Link>
        <p style={{ marginTop: 16, fontSize: 12, color: M }}>kein passwort nötig · magic link oder google</p>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#14161A",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"rgba(255,255,255,0.66)"}}>lädt...</p></div>}>
      <JoinContent />
    </Suspense>
  )
}
