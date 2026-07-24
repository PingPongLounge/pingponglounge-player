"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import StartMenu from "./StartMenu"
import NotificationBell from "./NotificationBell"

// Nur bei Auth/Onboarding-Flows verstecken
// Sektionsseiten haben ihren eigenen "PLAYER LIGA/TURNIER/…"-Header → globalen ausblenden
const HIDE = ["/", "/login", "/onboarding", "/spielen", "/join", "/auth", "/liga", "/match", "/turniere", "/training", "/shop"]

const BG = "#20242C"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

export default function AppHeader() {
  const path = usePathname() || "/"
  const [initialen, setInitialen] = useState("")

  useEffect(() => {
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb.from("profiles").select("name").eq("id", user.id).maybeSingle()
      const n = (p?.name || "").trim()
      if (n) setInitialen(n.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase())
    })()
  }, [])

  if (HIDE.some(h => h === path || (h !== "/" && path.startsWith(h)))) return null

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: BG, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo, Wortmarke, Beta — der Chip beschreibt die App, nicht den Spieler */}
        <Link href="/entdecken" aria-label="Startseite" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden>
            <defs><linearGradient id="hdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14" /><stop offset="1" stopColor="#1FD1C4" /></linearGradient></defs>
            <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#hdg)" strokeWidth="3.6" strokeLinejoin="round" />
            <circle cx="63" cy="58" r="6.5" fill="url(#hdg)" />
          </svg>
          <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: ".18em", ...gt }}>PLAYER</span>
          <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "#06210F", background: GRAD, borderRadius: 999, padding: "2px 6px" }}>Beta</span>
        </Link>

        {/* Avatar direkt neben dem Menü. Vorher stand er in einer ZWEITEN Kopfzeile
            darunter — mit Warenkorb und "Hi, …". Zwei Kopfzeilen sind eine zu viel. */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {initialen && <NotificationBell />}
          {initialen && (
            <Link href="/profil" aria-label="Profil" style={{ width: 38, height: 38, borderRadius: "50%", background: GRAD, color: "#06210F", fontSize: 13.5, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flexShrink: 0 }}>
              {initialen}
            </Link>
          )}
          <StartMenu inline />
        </div>
      </div>
    </header>
  )
}
