"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import BottomNav from "@/app/components/BottomNav"
import { BG, CARD, W, SUB, MUT, LINE, GREEN, CYAN } from "@/app/theme"

const VIOLET = "#7A3CFF"
const PINK = "#FF00C8"
const TEAL = "#2BD4C4"

type Opt = { href: string; title: string; sub: string; color: string; icon: ReactNode }

const OPTIONS: Opt[] = [
  {
    href: "/match/create", title: "Open Game", sub: "Mit anderen spielen", color: GREEN,
    icon: <g><ellipse cx="10" cy="10" rx="7" ry="7" /><path d="M15 15l5 5" /><circle cx="18.5" cy="6.5" r="1.6" /></g>,
  },
  {
    href: "/turniere", title: "Turnier", sub: "Um Punkte spielen", color: VIOLET,
    icon: <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3M8 21h8M12 17v4" />,
  },
  {
    href: "/training", title: "Training", sub: "Coaching, Drills & Camps", color: TEAL,
    icon: <g><path d="M4 19V7a2 2 0 0 1 2-2h9l5 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 12h6M8 16h4" /></g>,
  },
  {
    href: "/match", title: "Single Night", sub: "Spielen & kennenlernen", color: PINK,
    icon: <g><circle cx="8.5" cy="8" r="3" /><circle cx="16" cy="9" r="2.6" /><path d="M3 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 20c0-2.4 1.6-4 4-4s4 1.6 4 4" /></g>,
  },
]

export default function ErstellenPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "16px 16px 110px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 18 }}>
          <Link href="/entdecken" aria-label="Zurück" style={{ display: "inline-flex" }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={W} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </Link>
          <span style={{ fontSize: 15, fontWeight: 700, color: W }}>Erstellen</span>
          <span style={{ width: 22 }} />
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.5px", color: W, margin: "6px 0 18px" }}>Was möchtest du?</h1>

        {OPTIONS.map(o => (
          <Link key={o.title} href={o.href} style={{
            display: "flex", alignItems: "center", gap: 14, background: CARD, border: `1px solid ${LINE}`,
            borderRadius: 18, padding: "15px 16px", marginBottom: 12, textDecoration: "none",
          }}>
            <span style={{
              width: 46, height: 46, borderRadius: "50%", flex: "0 0 46px",
              display: "flex", alignItems: "center", justifyContent: "center", border: `1.6px solid ${o.color}`,
            }}>
              <svg viewBox="0 0 24 24" width={25} height={25} fill="none" stroke={o.color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{o.icon}</svg>
            </span>
            <span style={{ flex: 1 }}>
              <b style={{ display: "block", fontSize: 16, fontWeight: 700, color: W }}>{o.title}</b>
              <small style={{ color: MUT, fontSize: 13 }}>{o.sub}</small>
            </span>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        ))}

        <Link href="/match" style={{ display: "block", textAlign: "center", color: GREEN, fontWeight: 700, fontSize: 15, marginTop: 12, textDecoration: "none" }}>
          Alle Termine ansehen
        </Link>
      </div>
      <BottomNav />
    </main>
  )
}
