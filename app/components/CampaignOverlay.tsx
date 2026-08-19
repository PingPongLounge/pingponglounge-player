"use client"
import { useEffect, useState } from "react"

// Vollbild-Kampagne: holt die aktive Kampagne für die App und zeigt sie EINMAL
// pro Kampagne (localStorage-Merker). Bild-Hintergrund + dunkler Verlauf + CTA.
type Campaign = {
  id: string; title: string; kicker: string | null; body: string | null
  cta_label: string | null; cta_url: string | null; image_url: string | null
}

const GREEN = "#FF00C8"
const INK = "#05130B"

export default function CampaignOverlay() {
  const [c, setC] = useState<Campaign | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/campaigns?surface=app")
        if (!r.ok) return
        const j = await r.json()
        const camp: Campaign | null = j.campaign || null
        if (!camp || !alive) return
        if (localStorage.getItem(`campaign_seen_${camp.id}`)) return
        setC(camp)
      } catch { /* still */ }
    })()
    return () => { alive = false }
  }, [])

  if (!c) return null
  function close() {
    try { if (c) localStorage.setItem(`campaign_seen_${c.id}`, "1") } catch { /* ignore */ }
    setC(null)
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#050607" }}>
      {c.image_url && <img src={c.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,6,7,.15) 0%,rgba(5,6,7,.4) 45%,rgba(5,6,7,.96) 100%)" }} />
      <button onClick={close} aria-label="Schliessen" style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 16px)", right: 18, width: 36, height: 36, borderRadius: "50%", background: "rgba(5,6,7,.5)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div style={{ position: "absolute", left: 22, right: 22, bottom: "calc(env(safe-area-inset-bottom) + 36px)", zIndex: 5 }}>
        {c.kicker && <div style={{ color: GREEN, fontSize: 12, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase" }}>{c.kicker}</div>}
        <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.02, margin: "10px 0 10px" }}>{c.title}</div>
        {c.body && <p style={{ color: "#d6dade", fontSize: 15, lineHeight: 1.45, marginBottom: 20 }}>{c.body}</p>}
        {c.cta_url
          ? <a href={c.cta_url} onClick={close} style={{ display: "block", textAlign: "center", background: GREEN, color: INK, fontWeight: 800, fontSize: 16, padding: "15px", borderRadius: 14, textDecoration: "none" }}>{c.cta_label || "Mehr erfahren"}</a>
          : <button onClick={close} style={{ display: "block", width: "100%", textAlign: "center", background: GREEN, color: INK, fontWeight: 800, fontSize: 16, padding: "15px", borderRadius: 14, border: "none", cursor: "pointer" }}>{c.cta_label || "Los geht's"}</button>}
      </div>
    </div>
  )
}
