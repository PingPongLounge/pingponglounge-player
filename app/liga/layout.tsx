"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function LigaLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const inSeason = path.startsWith("/liga/season")
  return <>
    {children}
    <Link
      href={inSeason ? "/liga" : "/liga/season"}
      className="p-schweber"
      style={{
        /* 23.09.2026 (A.1): war eine neongruene Pille mit Radius 999 und
           Schlagschatten, die ueber dem Inhalt schwebte. Jetzt ein ruhiger
           schwarzer Wechsler ohne Radius — Gruen ist Signal, nicht die
           Farbe eines Navigationsknopfs.
           24.09.2026: Die Position kommt aus .p-schweber, damit er auf dem
           Desktop am Canvas haengt und nicht am Fensterrand. */
        background:"#080B0D",color:"#FFFFFF",
        border:"1px solid rgba(255,255,255,.18)",
        padding:"13px 18px",minHeight:46,display:"inline-flex",alignItems:"center",
        fontSize:11,fontWeight:600,letterSpacing:".12em",
        textDecoration:"none"
      }}
    >
      {inSeason ? "RANGLISTE" : "SAISON"}
    </Link>
  </>
}
