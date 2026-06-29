"use client"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { BG, W, MUT, GREEN, gt, cardPad, h1, body, eyebrow, meta, btn } from "@/app/theme"

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
        <p style={{ ...eyebrow, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>Einladung</p>
        <h1 style={{ ...h1, fontSize: 36, letterSpacing: ".1em", marginBottom: 16, ...gt }}>
          Gratis<br/>spielen
        </h1>
        <div style={{ ...cardPad, padding: "20px", marginBottom: 24 }}>
          {ref && <p style={{ ...meta, marginBottom: 8 }}>{ref} hat dich eingeladen</p>}
          <p style={{ ...body, fontSize: 18, fontWeight: 700, color: W, margin: 0 }}>
            Melde dich an und bekomme <span style={{ color: GREEN }}>2 Gratisstunden</span>
          </p>
        </div>
        <Link href="/login" style={{ ...btn }}>Jetzt kostenlos anmelden →</Link>
        <p style={{ ...meta, marginTop: 16, fontSize: 12 }}>Kein Passwort nötig · Magic Link oder Google</p>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:MUT}}>Lädt …</p></div>}>
      <JoinContent />
    </Suspense>
  )
}
