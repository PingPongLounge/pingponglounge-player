"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import StartMenu from "./StartMenu"

// Auf diesen Seiten KEIN globaler Kopf (eigener Kopf / ausgeloggt / Flow)
const HIDE = ["/", "/login", "/onboarding", "/spielen", "/join", "/auth", "/entdecken", "/staff"]

const BG = "#20242C"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

export default function AppHeader() {
  const path = usePathname() || "/"
  if (HIDE.some(h => h === path || (h !== "/" && path.startsWith(h)))) return null

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: BG, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/entdecken" aria-label="Startseite" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
            <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#39FF14" /><stop offset="100%" stopColor="#1FD1C4" /></linearGradient></defs>
            <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#hg)" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="63" cy="58" r="6" fill="url(#hg)" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".24em", ...gt }}>PLAYER</span>
        </Link>
        <StartMenu inline />
      </div>
    </header>
  )
}
