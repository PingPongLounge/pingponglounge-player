"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import StartMenu from "./StartMenu"

// Nur bei Auth/Onboarding-Flows verstecken
const HIDE = ["/", "/login", "/onboarding", "/spielen", "/join", "/auth"]

const BG = "#20242C"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

export default function AppHeader() {
  const path = usePathname() || "/"
  if (HIDE.some(h => h === path || (h !== "/" && path.startsWith(h)))) return null

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: BG, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/entdecken" aria-label="Startseite" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: ".22em", ...gt }}>PLAYER</span>
        </Link>
        <StartMenu inline />
      </div>
    </header>
  )
}
