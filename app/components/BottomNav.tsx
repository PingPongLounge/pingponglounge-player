"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const BG = "#1A1E25"
const LINE = "rgba(255,255,255,.09)"
const MUT = "rgba(255,255,255,.82)"
const W = "#FFFFFF"

const tabs = [
  { href: "/entdecken", label: "home", icon: "home" },
  { href: "/match", label: "open game", icon: "open-game" },
  { href: "/liga", label: "liga", icon: "liga" },
  { href: "/turniere", label: "turnier", icon: "turnier" },
  { href: "/training", label: "training", icon: "paddles" },
]

export default function BottomNav() {
  const path = usePathname() || "/"
  const isActive = (href: string) => path === href || path.startsWith(href + "/")

  // Offene Liga-Bestätigungen → kleiner Punkt auf dem Liga-Tab, damit man's sieht.
  const [pending, setPending] = useState(0)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/liga/pending")
        if (!r.ok) return
        const j = await r.json()
        if (alive) setPending(j.count || 0)
      } catch { /* still */ }
    })()
    return () => { alive = false }
  }, [path])

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: BG, borderTop: `1px solid ${LINE}`,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", height: 76, display: "flex", alignItems: "center" }}>
        {tabs.map(t => {
          const active = isActive(t.href)
          return (
            <Link key={t.href} href={t.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, textDecoration: "none" }}>
              <span style={{ position: "relative", display: "inline-flex" }}>
                {t.icon === "home" ? (
                  <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke={active ? "#39FF14" : MUT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : .6 }}>
                    <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
                  </svg>
                ) : (
                  <img src={`/icons/${t.icon}.svg`} alt="" style={{ width: 31, height: 31, opacity: active ? 1 : .5, filter: active ? "none" : "grayscale(.4)" }} />
                )}
                {t.href === "/liga" && pending > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -7, minWidth: 17, height: 17, borderRadius: 999, background: "linear-gradient(135deg,#39FF14,#1FD1C4)", color: "#06210F", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxShadow: "0 0 0 2px #1A1E25" }}>{pending > 9 ? "9+" : pending}</span>
                )}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: active ? W : MUT, letterSpacing: ".05em", textTransform: "uppercase" }}>{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
