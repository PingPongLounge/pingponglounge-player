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
        background:inSeason?"#F4F1EB":"#8C3DFF",
        color:inSeason?"#080808":"#fff",
        borderRadius:999,padding:"10px 13px",
        fontSize:10,fontWeight:900,letterSpacing:".08em",
        textDecoration:"none",boxShadow:"0 8px 24px rgba(0,0,0,.35)"
      }}
    >
      {inSeason ? "RANGLISTE" : "3-MONATS-SEASON"}
    </Link>
  </>
}
