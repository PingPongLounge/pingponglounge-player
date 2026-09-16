"use client"
/* Die schmale Kopfzeile ueber dem Hero-Foto (07.09.2026, Referenzbild):
   links das Wortzeichen, rechts die Glocke. Mehr nicht — die Navigation
   sitzt unten, der Kopf soll das Bild nicht zerschneiden.

   Warum ein eigenes Client-Bauteil: die Glocke laedt Benachrichtigungen und
   braucht deshalb den Browser. FotoHero selbst bleibt dadurch serverfaehig
   und kann in jeder Seite verwendet werden. */
import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import NotificationBell from "./NotificationBell"
import { CREME, VIOLETT, INTER } from "@/app/theme"

export default function HeroKopf({ ziel = "/entdecken", rechts }: { ziel?: string; rechts?: React.ReactNode }) {
  const [angemeldet, setAngemeldet] = useState(false)
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => setAngemeldet(!!user))
  }, [])

  return (
    <div className="ppl-breit" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, paddingTop: 16, paddingBottom: 16,
    }}>
      {/* 16.09.2026 (Oliver): "PPL." ist weg. Es gibt nur noch die Bildmarke
          und PLAYER — ueberall gleich. */}
      <Link href={ziel} aria-label="PLAYER Startseite" style={{
        display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
        color: CREME, textShadow: "0 1px 14px rgba(0,0,0,.6)",
      }}>
        <svg viewBox="0 0 88 96" aria-hidden focusable="false" style={{ height: 22, width: "auto", display: "block" }}>
          <g transform="translate(0,8)">
            <path d="M12 70 L12 10 L40 10 C55 10 64 19 64 34 C64 49 55 58 40 58 L30 58 L30 70 Z"
              fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
            <circle cx="72" cy="66" r="8" fill={VIOLETT} />
          </g>
        </svg>
        <span style={{ fontFamily: INTER, fontWeight: 900, fontSize: 19, letterSpacing: "-.02em", textTransform: "uppercase" }}>Player</span>
      </Link>
      {/* Nur die Glocke. Das Menü sitzt unten in der Navigation
          (Vorgabe Oliver 07.09.: "menu immer unten"). */}
      {rechts ?? (angemeldet && <NotificationBell />)}
    </div>
  )
}
