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
      style={{
        position:"fixed",right:14,bottom:78,zIndex:95,
        background:inSeason?"#F4F1EB":"#5B9CFF",
        /* Dunkle Schrift auf hellblauem Grund: weiss waere 2,4:1. */
        color:"#06132E",
        borderRadius:999,padding:"13px 16px",minHeight:44,display:"inline-flex",alignItems:"center",
        fontSize:11.5,fontWeight:900,letterSpacing:".08em",
        textDecoration:"none",boxShadow:"0 8px 24px rgba(0,0,0,.35)"
      }}
    >
      {inSeason ? "RANGLISTE" : "SAISON"}
    </Link>
  </>
}
