"use client"
/* PLAYER · KOPF — die EINE Kopfzeile der App (24.09.2026).

   Vorher gab es zwei: den Kopf der Startseite (Zeichen + Anton-Wortmarke,
   ab 1100px die Navigation ausgeschrieben) und HeroKopf auf den sechs
   V2-Seiten (eigenes Inline-SVG + Inter 900 als Wortmarke). Zwei Logos,
   zwei Schriften, zwei Hoehen — auf Seiten derselben App.

   Die Startseite ist die Referenz. Dieser Kopf ist ihr Kopf; HeroKopf
   rendert ihn nur noch weiter, damit die acht Aufrufstellen unberuehrt
   bleiben.

   eigeneSpalte=false nutzt die Startseite: dort sitzt der Kopf bereits in
   der p-spalte, die auch den Hero-Block traegt. Ein zweiter Container
   darin wuerde den Rand verdoppeln. */
import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import NotificationBell from "./NotificationBell"
import { PlayerZeichen } from "./PlayerLogo"
import { ANTON, TEXT } from "@/app/design"

/* Ab 1100px steht die Navigation ausgeschrieben im Kopf — dieselben fuenf
   Ziele wie im Hamburger darunter. Klasse .ent-nav blendet sie unter
   1100px aus (globals.css). */
const ZIELE: [string, string][] = [
  ["Spielen", "/match"], ["Liga", "/liga"], ["Turniere", "/turniere"],
  ["Rangliste", "/rangliste"], ["Profil", "/profil"],
]

export default function PlayerKopf({
  ziel = "/entdecken",
  aufHell = false,
  navigation = true,
  rechts,
  eigeneSpalte = true,
  oben = 16,
  unten = 16,
}: {
  ziel?: string
  /** true, wenn der Kopf auf Off-White statt auf dunklem Grund sitzt. */
  aufHell?: boolean
  /** Desktop-Navigation ab 1100px zeigen. */
  navigation?: boolean
  /** Ersetzt die Glocke rechts (z.B. ein Login-Knopf). */
  rechts?: React.ReactNode
  eigeneSpalte?: boolean
  oben?: number
  unten?: number
}) {
  const [angemeldet, setAngemeldet] = useState(false)
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => setAngemeldet(!!user))
  }, [])

  const farbe = aufHell ? TEXT : "#FFFFFF"

  const zeile = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18,
      minHeight: 40,
    }}>
      <Link href={ziel} aria-label="PLAYER Startseite" style={{
        display: "flex", alignItems: "center", gap: 10,
        textDecoration: "none", color: farbe,
      }}>
        <PlayerZeichen aufHell={aufHell} />
        <span style={{
          fontFamily: ANTON, fontSize: 17, letterSpacing: ".05em",
          textTransform: "uppercase", lineHeight: 1,
        }}>Player</span>
      </Link>

      <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {navigation && (
          <nav className="ent-nav" style={{ display: "none", gap: 30 }}>
            {ZIELE.map(([t, h]) => (
              <Link key={h} href={h} style={{
                fontSize: 11, fontWeight: 600, letterSpacing: ".13em",
                textTransform: "uppercase", textDecoration: "none",
                color: aufHell ? "#686868" : "rgba(255,255,255,.82)",
              }}>{t}</Link>
            ))}
          </nav>
        )}
        {rechts ?? (angemeldet && <NotificationBell />)}
      </span>
    </div>
  )

  if (!eigeneSpalte) return zeile
  return (
    <div className="p-spalte" style={{ position: "relative", zIndex: 2, paddingTop: oben, paddingBottom: unten }}>
      {zeile}
    </div>
  )
}
