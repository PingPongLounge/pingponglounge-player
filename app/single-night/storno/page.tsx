"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { BG, CARD, W, SUB, MUT, LINE, GREEN, DANGER, btn, btnOutline } from "@/app/theme"

// Storno-Seite für Single-Night-Tickets — geöffnet über den Link in der Mail.
export default function SingleNightStornoPage() {
  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  useEffect(() => {
    try { setToken(new URLSearchParams(window.location.search).get("token")) } catch { /* ignore */ }
  }, [])

  async function storno() {
    if (!token) return
    setState("busy"); setMsg("")
    try {
      const r = await fetch("/api/single-night/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) setState("done")
      else { setState("error"); setMsg(j.error || "Storno nicht möglich.") }
    } catch { setState("error"); setMsg("Verbindung fehlgeschlagen.") }
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: W, letterSpacing: "-.4px", margin: "8px 0 16px" }}>Single-Night-Ticket stornieren</h1>
        {!token ? (
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, padding: 18 }}>
            <p style={{ color: SUB, fontSize: 14, lineHeight: 1.5 }}>Kein gültiger Storno-Link. Bitte nutze den Link aus deiner Bestätigungsmail.</p>
          </div>
        ) : state === "done" ? (
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, padding: 18 }}>
            <p style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Storniert ✓</p>
            <p style={{ color: SUB, fontSize: 14, lineHeight: 1.5 }}>Dein Ticket ist storniert. Die Rückerstattung wird manuell bearbeitet.</p>
            <Link href="/single-night" style={{ ...btnOutline, marginTop: 16 }}>Zurück</Link>
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, padding: 18 }}>
            <p style={{ color: SUB, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
              Möchtest du dein Single-Night-Ticket wirklich stornieren? Gratis-Storno gilt bis 24 h vor dem Event.
            </p>
            {state === "error" && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
            <button onClick={storno} disabled={state === "busy"} style={{ ...btn, opacity: state === "busy" ? .6 : 1 }}>
              {state === "busy" ? "Wird storniert …" : "Ticket stornieren"}
            </button>
            <Link href="/single-night" style={{ ...btnOutline, marginTop: 10 }}>Doch behalten</Link>
          </div>
        )}
      </div>
    </main>
  )
}
