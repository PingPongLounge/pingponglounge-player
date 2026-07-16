"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { streakLine, type StreakInfo } from "@/lib/streak"

// Ansporn-Zeile: On-Fire bei Siegesserie, aufmunternd + Training-Verweis bei
// Niederlagen. Holt die aktuelle Serie und rendert nur, wenn es was zu sagen gibt.
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

  const fire = info.fire
  const bg = fire ? "rgba(57,255,20,.10)" : "#171A20"
  const border = fire ? "1px solid rgba(57,255,20,.4)" : "1px solid rgba(255,255,255,.1)"

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: bg, border, borderRadius: 16, padding: "13px 15px" }}>
      <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{fire ? "🔥" : "💪"}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.35 }}>{info.text}</span>
      {info.cta && (
        <Link href={info.cta.href} style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", color: "#06210F", background: "linear-gradient(135deg,#39FF14,#1FD1C4)", borderRadius: 9, padding: "9px 13px", textDecoration: "none" }}>
          {info.cta.label}
        </Link>
      )}
    </div>
  )
}
