"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const BG = "#1A1E25"
const SHEETBG = "#2A2F39"
const CELL = "#353B46"
const LINE = "rgba(255,255,255,.09)"
const MUT = "rgba(255,255,255,.55)"
const W = "#FFFFFF"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"

const tabs = [
  { href: "/match", label: "open game", icon: "open-game" },
  { href: "/liga", label: "liga", icon: "liga" },
  { href: "/turniere", label: "turnier", icon: "turnier" },
  { href: "/training", label: "training", icon: "paddles" },
]

const bookOptions = [
  { href: "/buchen", icon: "tisch", title: "Tisch", sub: "Spontan einen Tisch reservieren" },
  { href: "/match", icon: "open-game", title: "Open Game", sub: "Offenem Spiel beitreten oder erstellen" },
  { href: "/training", icon: "paddles", title: "Training", sub: "Coaching, Drills & Kurse" },
]

export default function BottomNav() {
  const path = usePathname() || "/"
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => path === href || path.startsWith(href + "/")

  return (
    <>
      {/* Buchen-Sheet */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 190, background: "rgba(0,0,0,.55)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s",
        }}
      />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 200,
        transform: open ? "none" : "translateY(110%)", transition: "transform .3s cubic-bezier(.2,.7,.2,1)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: SHEETBG, borderRadius: "24px 24px 0 0", padding: "22px 20px calc(26px + env(safe-area-inset-bottom))" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: MUT, textAlign: "center", marginBottom: 16 }}>Was möchtest du buchen?</div>
          {bookOptions.map(o => (
            <Link key={o.title} href={o.href} onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 15, background: CELL, borderRadius: 16, padding: "15px 18px", marginBottom: 11, textDecoration: "none" }}>
              <img src={`/icons/${o.icon}.svg`} alt="" style={{ width: 30, height: 30, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 17, fontWeight: 800, color: W }}>{o.title}</span>
                <span style={{ display: "block", fontSize: 12, color: MUT, marginTop: 2 }}>{o.sub}</span>
              </span>
              <span style={{ color: MUT, fontSize: 20, fontWeight: 700 }}>›</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Nav-Leiste */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: BG, borderTop: `1px solid ${LINE}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", height: 70, display: "flex", alignItems: "center" }}>
          {tabs.slice(0, 2).map(t => <Tab key={t.href} t={t} active={isActive(t.href)} />)}

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button onClick={() => setOpen(true)} aria-label="Buchen" style={{
              position: "relative", top: -18, width: 62, height: 62, borderRadius: "50%",
              background: GRAD, border: `4px solid ${"#20242C"}`, color: "#06210F", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
              boxShadow: "0 6px 16px rgba(57,255,20,.25)",
            }}>
              <span style={{ fontSize: 23, fontWeight: 900, lineHeight: .8 }}>+</span>
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>Buchen</span>
            </button>
          </div>

          {tabs.slice(2).map(t => <Tab key={t.href} t={t} active={isActive(t.href)} />)}
        </div>
      </nav>
    </>
  )
}

function Tab({ t, active }: { t: { href: string; label: string; icon: string }; active: boolean }) {
  return (
    <Link href={t.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none" }}>
      <img src={`/icons/${t.icon}.svg`} alt="" style={{ width: 25, height: 25, opacity: active ? 1 : .45, filter: active ? "none" : "grayscale(.5)" }} />
      <span style={{ fontSize: 9.5, fontWeight: 700, color: active ? W : MUT, letterSpacing: ".02em" }}>{t.label}</span>
    </Link>
  )
}
