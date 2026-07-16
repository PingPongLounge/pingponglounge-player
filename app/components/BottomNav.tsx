"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const BG = "#1A1E25"
const LINE = "rgba(255,255,255,.09)"
const MUT = "rgba(255,255,255,.82)"
const W = "#FFFFFF"

const tabs = [
  { href: "/match", label: "open game", icon: "open-game" },
  { href: "/liga", label: "liga", icon: "liga" },
  { href: "/turniere", label: "turnier", icon: "turnier" },
  { href: "/training", label: "training", icon: "paddles" },
]

export default function BottomNav() {
  const path = usePathname() || "/"
  const isActive = (href: string) => path === href || path.startsWith(href + "/")

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
              <img src={`/icons/${t.icon}.svg`} alt="" style={{ width: 31, height: 31, opacity: active ? 1 : .5, filter: active ? "none" : "grayscale(.4)" }} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: active ? W : MUT, letterSpacing: ".05em", textTransform: "uppercase" }}>{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
