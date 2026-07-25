"use client"
import { useEffect, useState, use } from "react"
import { createClient } from "@/lib/supabase/client"

const BG = "#1C212B", CARD = "#2A2F39", W = "#fff", MUT = "rgba(255,255,255,.7)"
const GRAD = "linear-gradient(135deg,#57CF79,#38BEB2)"

export default function JoinLeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [state, setState] = useState<"check" | "ready" | "joining" | "done" | "error">("check")
  const [msg, setMsg] = useState("")
  const [org, setOrg] = useState("")

  useEffect(() => {
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        // Nach dem Login zurück auf diese Einladung
        window.location.href = `/login?next=${encodeURIComponent(`/liga/join/${code}`)}`
        return
      }
      setState("ready")
    })()
  }, [code])

  async function join() {
    setState("joining"); setMsg("")
    try {
      const r = await fetch("/api/liga/join-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      const j = await r.json().catch(() => ({}))
      if (j.needsOnboarding) { window.location.href = "/onboarding"; return }
      if (!r.ok) { setMsg(j.error || "Beitritt fehlgeschlagen"); setState("error"); return }
      setOrg(j.org || j.name || "")
      setState("done")
      setTimeout(() => { window.location.href = "/liga" }, 1200)
    } catch { setMsg("Beitritt fehlgeschlagen"); setState("error") }
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, background: CARD, borderRadius: 22, padding: "28px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: MUT, marginBottom: 8 }}>Einladung</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: W, marginBottom: 6 }}>Firmen-Liga beitreten</div>
        <div style={{ fontSize: 14, color: MUT, marginBottom: 22, lineHeight: 1.5 }}>
          Code <span style={{ color: W, fontWeight: 800 }}>{code}</span> — nur eingeladene Spieler sind hier drin.
        </div>

        {state === "check" && <div style={{ color: MUT, fontSize: 14 }}>Lädt …</div>}

        {state === "ready" && (
          <button onClick={join} style={{ width: "100%", background: GRAD, color: "#06210F", borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", cursor: "pointer", fontFamily: "inherit" }}>
            Jetzt beitreten
          </button>
        )}

        {state === "joining" && <div style={{ color: MUT, fontSize: 14 }}>Tritt bei …</div>}

        {state === "done" && (
          <div style={{ color: "#57CF79", fontSize: 15, fontWeight: 800 }}>✓ Drin{org ? ` — ${org}` : ""}! Weiter zur Liga …</div>
        )}

        {state === "error" && (
          <>
            <div style={{ color: "#FF7A7A", fontSize: 14, marginBottom: 14 }}>{msg}</div>
            <button onClick={() => setState("ready")} style={{ width: "100%", background: "#353B46", color: W, borderRadius: 14, padding: 13, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              Nochmal versuchen
            </button>
          </>
        )}
      </div>
    </main>
  )
}
