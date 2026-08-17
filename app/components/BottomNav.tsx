"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

// Briefing-Look 08/2026: Start · Events · + · Ranking · Profil
// Zentrales grünes Plus = Erstellen. Aktiv = Neon-Grün.
const BG = "#08090B"
const LINE = "rgba(255,255,255,.09)"
const MUT = "rgba(255,255,255,.55)"
const GREEN = "#24E07C"
const INK = "#05130B"

type Tab = { href: string; label: string; icon: ReactNode }

const ICON = {
  start: <path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" />,
  events: <g><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></g>,
  ranking: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3" />,
  profil: <g><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></g>,
}

const left: Tab[] = [
  { href: "/entdecken", label: "Start", icon: ICON.start },
  { href: "/match", label: "Events", icon: ICON.events },
]
const right: Tab[] = [
  // "Ranking" führt zur Player League (Saison, Stufen, Fordern). Die reine
  // Gesamt-Rangliste (/rangliste) bleibt von dort und der Startseite erreichbar.
  { href: "/liga", label: "Ranking", icon: ICON.ranking },
  { href: "/profil", label: "Profil", icon: ICON.profil },
]

export default function BottomNav() {
  const path = usePathname() || "/"
  const isActive = (href: string) => path === href || path.startsWith(href + "/")

  const Item = (t: Tab) => {
    const active = isActive(t.href)
    return (
      <Link key={t.href} href={t.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none" }}>
        <svg viewBox="0 0 24 24" width={23} height={23} fill="none" stroke={active ? GREEN : MUT} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? GREEN : MUT, letterSpacing: ".02em" }}>{t.label}</span>
      </Link>
    )
  }

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: BG, borderTop: `1px solid ${LINE}`,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", height: 76, display: "flex", alignItems: "center", padding: "0 8px" }}>
        {left.map(Item)}
        {/* Zentrales Plus = Erstellen */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Link href="/erstellen" aria-label="Erstellen" style={{
            width: 54, height: 54, borderRadius: "50%", background: GREEN,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: -18, boxShadow: "0 8px 20px rgba(36,224,124,.35)", textDecoration: "none",
          }}>
            <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </Link>
        </div>
        {right.map(Item)}
      </div>
    </nav>
  )
}
