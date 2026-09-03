"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS = [
  ["HOME", "/entdecken"],
  ["SPIELEN", "/match"],
  ["RANGLISTE", "/rangliste"],
  ["EVENTS", "/turniere"],
  ["PROFIL", "/profil"],
] as const

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav aria-label="Player Navigation" style={{position:"fixed",left:"50%",bottom:0,transform:"translateX(-50%)",width:"100%",maxWidth:520,zIndex:100,background:"rgba(8,8,8,.96)",borderTop:"1px solid rgba(244,241,235,.16)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",padding:"0 8px max(8px,env(safe-area-inset-bottom))"}}>
      <div style={{height:62,display:"grid",gridTemplateColumns:"repeat(5,1fr)",alignItems:"stretch"}}>
        {ITEMS.map(([label,href])=>{
          const active = path===href || (href!=="/entdecken" && path.startsWith(href+"/"))
          return <Link key={href} href={href} style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",color:active?"#F4F1EB":"#77736f",fontSize:9,fontWeight:900,letterSpacing:".055em",textDecoration:"none"}}>
            {active && <span style={{position:"absolute",top:0,left:"25%",right:"25%",height:3,background:"#8C3DFF"}}/>}
            {label}
          </Link>
        })}
      </div>
    </nav>
  )
}
