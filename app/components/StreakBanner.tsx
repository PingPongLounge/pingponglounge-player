"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { streakLine, type StreakInfo } from "@/lib/streak"

// Ansporn-Zeile: On-Fire bei Siegesserie, ab 4 Niederlagen aufmunternd +
// Training-Verweis. Kein grünes Schimmern: graues Kästchen, bei Feier eine
// grüne Umrandung. Icon einfarbig (nur Kontur), kein Farbverlauf.
export default function StreakBanner() {
  const [info, setInfo] = useState<StreakInfo>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/liga/streak")
        if (!r.ok) return
        const j = await r.json()
        if (alive) setInfo(streakLine(!!j.won, j.streak || 0))
      } catch { /* still */ }
    })()
    return () => { alive = false }
  }, [])

  if (!info) return null
  const GRAD = "linear-gradient(135deg,#FF00C8,#FF5CDC)"

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "#171A20",
      borderRadius: 16, padding: "13px 15px",
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {info.fire
          ? <path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.3.5-2.3 1.2-3.2C9 9 9 7.5 8.5 6.5c2 .5 3.5 2 3.5 3.5 1-1 1.2-2.5 0-4.5 0 0 .5-2-0-3.5Z" />
          : <><path d="M3 17l5-5 4 4 8-8" /><path d="M15 8h5v5" /></>}
      </svg>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.35 }}>{info.text}</span>
      {info.cta && (
        <Link href={info.cta.href} style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", color: "#FFFFFF", background: GRAD, borderRadius: 9, padding: "9px 13px", textDecoration: "none" }}>
          {info.cta.label}
        </Link>
      )}
    </div>
  )
}
