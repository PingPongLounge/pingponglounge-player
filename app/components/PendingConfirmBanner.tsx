"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Item = { id: string; opponent: string; scoreLine: string; iWon: boolean }

// Hinweis oben: "Ein Ergebnis wartet auf deine Bestätigung." Kein grünes
// Schimmern — graues Kästchen mit grüner Umrandung, einfarbiges Icon, der
// Bestätigen-Button als grüner Umriss (kein Farbverlauf).
export default function PendingConfirmBanner() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/liga/pending")
        if (!r.ok) return
        const j = await r.json()
        if (alive) setItems(j.items || [])
      } catch { /* still */ }
    })()
    return () => { alive = false }
  }, [])

  if (items.length === 0) return null
  const G = "#39FF14"

  const one = items.length === 1 ? items[0] : null
  const href = one ? `/liga/match/${one.id}` : "/liga"
  const title = one ? `${one.opponent} hat ein Ergebnis eingetragen` : `${items.length} Ergebnisse warten auf dich`
  const sub = one ? `${one.scoreLine} für dich · bitte bestätigen` : "Bitte bestätige deine Spiele"

  return (
    <button
      onClick={() => router.push(href)}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        background: "#171A20", border: `1px solid ${G}`,
        borderRadius: 16, padding: "13px 15px", margin: "0 0 14px",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.72)", marginTop: 1 }}>{sub}</span>
      </span>
      <span style={{
        flexShrink: 0, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em",
        color: G, background: "none", border: `1px solid ${G}`, borderRadius: 9, padding: "8px 13px",
      }}>Bestätigen</span>
    </button>
  )
}
