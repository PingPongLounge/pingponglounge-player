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
import StartMenu from "./StartMenu"
import { CREME, VIOLETT, INTER } from "@/app/theme"

export default function HeroKopf({ ziel = "/entdecken" }: { ziel?: string }) {
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
      <Link href={ziel} aria-label="PPL Player" style={{
        display: "inline-flex", alignItems: "baseline", textDecoration: "none",
        fontFamily: INTER, fontWeight: 900, fontSize: 20, letterSpacing: "-.03em",
        color: CREME, textShadow: "0 1px 14px rgba(0,0,0,.6)",
      }}>
        PPL<span style={{ color: VIOLETT }}>.</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {angemeldet && <NotificationBell />}
        <StartMenu inline />
      </div>
    </div>
  )
}
