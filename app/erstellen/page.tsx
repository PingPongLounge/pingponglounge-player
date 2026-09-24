"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import BottomNav from "@/app/components/BottomNav"
import { BG, CARD, W, SUB, MUT, LINE, GREEN, CYAN } from "@/app/theme"
import { IconOpenGames, IconTurniere, IconTraining, IconCommunity, IconChevron } from "@/app/components/Icons"

/* Vier Kacheln, vier Abstufungen EINER Farbe. Die Namen stammten noch aus
   der Pink/Violett-Zeit und einer davon stand als letzter Rest auf Blau
   (#3B6FE0) — das war die einzige Stelle im Frontend, an der noch ein
   blauer PLAYER-Akzent uebrig war (23.09.2026). Jetzt Gruen, wie ueberall.
   Es sind Icon-Striche auf Schwarz, alle vier ueber 7:1. */
const GRUEN_TURNIER  = "#0FC24E"
const GRUEN_SINGLE   = "#39FF14"
const GRUEN_TRAINING = "#12D45C"

type IkName = "opengames" | "turniere" | "training" | "community"
type Opt = { href: string; title: string; sub: string; color: string; icon: IkName }

const OPTIONS: Opt[] = [
  {
    href: "/match/create", title: "Open Game", sub: "Selbst erstellen & mitspielen", color: GREEN,
    icon: "opengames",
  },
  {
    href: "/turniere", title: "Turnier", sub: "Ansehen & anmelden", color: GRUEN_TURNIER,
    icon: "turniere",
  },
  {
    href: "/training", title: "Training", sub: "Ansehen & buchen", color: GRUEN_TRAINING,
    icon: "training",
  },
  {
    href: "/single-night", title: "Single Night", sub: "Ticket sichern", color: GRUEN_SINGLE,
    icon: "community",
  },
]

export default function ErstellenPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "16px 16px 110px" }}>
      <div className="ppl-huelle">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 18 }}>
          <Link href="/entdecken" aria-label="Zurück" style={{ display: "inline-flex" }}>
            <IconChevron size={22} style={{ color: W, transform: "rotate(180deg)" }} />
          </Link>
          <span style={{ fontSize: 15, fontWeight: 700, color: W }}>Events</span>
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
              {/* 24.09.2026: die vier Kacheln zeichneten eigene Strichsymbole.
                  Jetzt kommen sie aus dem PLAYER-Satz. */}
              <span style={{ color: o.color, display: "inline-flex" }}>
                {o.icon === "opengames" ? <IconOpenGames size={26} />
                  : o.icon === "turniere" ? <IconTurniere size={26} />
                  : o.icon === "training" ? <IconTraining size={26} />
                  : <IconCommunity size={26} />}
              </span>
            </span>
            <span style={{ flex: 1 }}>
              <b style={{ display: "block", fontSize: 16, fontWeight: 700, color: W }}>{o.title}</b>
              <small style={{ color: MUT, fontSize: 13 }}>{o.sub}</small>
            </span>
            <IconChevron size={18} style={{ color: GREEN }} />
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
