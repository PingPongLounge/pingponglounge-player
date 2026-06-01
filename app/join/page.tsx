"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

const BG = "#111214"
const G  = "#39FF14"
const M  = "#6B6E7A"
const W  = "#E8E6E1"

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
        <p style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>Einladung</p>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1, marginBottom: 16 }}>
          GRATIS<br/>SPIELEN
        </h1>
        <div style={{ background: `${G}18`, border: `1px solid ${G}44`, borderRadius: 14, padding: "20px", marginBottom: 24 }}>
          {ref && <p style={{ fontSize: 13, color: M, marginBottom: 8 }}>{ref} hat dich eingeladen</p>}
          <p style={{ fontSize: 18, fontWeight: 700, color: W, margin: 0 }}>
            Melde dich an und bekomme <span style={{ color: G }}>2 Gratisstunden</span>
          </p>
        </div>
        <Link href="/login" style={{
          display: "block",
          background: G,
          color: "#0A0A0C",
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
          padding: "16px",
          borderRadius: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>Jetzt kostenlos anmelden →</Link>
        <p style={{ marginTop: 16, fontSize: 12, color: M }}>Kein Passwort nötig · Magic Link oder Google</p>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#111214",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6B6E7A"}}>Lädt...</p></div>}>
      <JoinContent />
    </Suspense>
  )
}
