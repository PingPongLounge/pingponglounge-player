"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const G = "#39FF14"
const M = "#6B6E7A"
const BG = "#0D0E10"
const B = "#1E1F24"

const tabs = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?G:M} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/liga",
    label: "Liga",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?G:M} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    ),
  },
  {
    href: "/match",
    label: "Match",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?G:M} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
      </svg>
    ),
  },
  {
    href: "/rangliste",
    label: "Rangliste",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?G:M} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?G:M} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:100,
      background:BG, borderTop:`1px solid ${B}`,
      display:"flex", justifyContent:"space-around", alignItems:"center",
      padding:"8px 0 max(8px, env(safe-area-inset-bottom))",
    }}>
      {tabs.map(tab => {
        const active = path === tab.href || (tab.href !== "/dashboard" && path.startsWith(tab.href))
        return (
          <Link key={tab.href} href={tab.href} style={{
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            textDecoration:"none", padding:"4px 12px", minWidth:52,
          }}>
            {tab.icon(active)}
            <span style={{fontSize:9,fontWeight:700,color:active?G:M,letterSpacing:"0.05em",textTransform:"uppercase"}}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}