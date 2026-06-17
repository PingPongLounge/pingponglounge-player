"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ACTIVE = "#FFFFFF"
const INACTIVE = "rgba(255,255,255,0.28)"
const BG = "#14161A"
const BORDER = "#1E2230"

const tabs = [
  {
    href: "/entdecken",
    label: "home",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACTIVE : INACTIVE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: "/buchen",
    label: "book",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACTIVE : INACTIVE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: "/match",
    label: "open game",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACTIVE : INACTIVE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
      </svg>
    ),
  },
  {
    href: "/profil",
    label: "profil",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACTIVE : INACTIVE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: BG, borderTop: `1px solid ${BORDER}`,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "10px 0 max(12px, env(safe-area-inset-bottom))",
    }}>
      {tabs.map(tab => {
        const active = path === tab.href || (tab.href !== "/entdecken" && path.startsWith(tab.href))
        return (
          <Link key={tab.href} href={tab.href} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            textDecoration: "none", padding: "2px 14px",
          }}>
            {tab.icon(active)}
            <span style={{
              fontSize: 9, fontWeight: 400,
              color: active ? ACTIVE : INACTIVE,
              letterSpacing: "0.02em",
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
