"use client"
import { useEffect, useState , use} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#0E1014",C="#1A1D24",B="#1A1D24",M="rgba(255,255,255,0.66)",G="#39FF14",W="#FFFFFF"
const GRAD="linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"

export default function AnmeldenPage({params}:{params:Promise<{id:string}>}){
  const {id:seasonId}=use(params)
  const [season,setSeason]=useState<Record<string,unknown>|null>(null)
  const [count,setCount]=useState(0)
  const [registered,setRegistered]=useState(false)
  const [loading,setLoading]=useState(true)
  const router = useRouter()
  const [saving,setSaving]=useState(false)

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data:{user}}=await sb.auth.getUser()
      if(!user){router.push("/login");return}
      const {data:s}=await sb.from("league_seasons").select("*").eq("id",seasonId).single()
      setSeason(s)
      const {count:c}=await sb.from("league_registrations").select("*",{count:"exact",head:true}).eq("season_id",seasonId)
      setCount(c||0)
      const {data:r}=await sb.from("league_registrations").select("id").eq("season_id",seasonId).eq("player_id",user.id).single()
      setRegistered(!!r)
      setLoading(false)
    }
    load()
  },[seasonId])

  async function handleRegister(){
    setSaving(true)
    const sb=createClient()
    const {data:{user}}=await sb.auth.getUser()
    if(!user){router.push("/login");return}
    const res=await fetch("/api/liga/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId})})
    if(res.ok){setRegistered(true);setCount(c=>c+1)}
    setSaving(false)
  }

  if(loading||!season) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:M}}>lädt...</p></main>

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <Link href={`/liga/${seasonId}`} style={{color:M,textDecoration:"none",fontSize:13,display:"block",marginBottom:24}}>← zurück</Link>

        {registered?(
          <div style={{background:C,border:`1px solid ${G}40`,borderRadius:16,padding:"32px 24px",textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:12}}>✓</p>
            <p style={{fontSize:20,fontWeight:900,color:G,textTransform:"uppercase",marginBottom:8}}>angemeldet!</p>
            <p style={{fontSize:14,color:M,marginBottom:24}}>du bist für <strong style={{color:W}}>{season.name as string}</strong> registriert. du wirst benachrichtigt sobald die saison startet.</p>
            <Link href={`/liga/${seasonId}`} style={{display:"block",background:"#fff",color:"#0E1014",textDecoration:"none",borderRadius:10,padding:"14px",fontSize:13,fontWeight:700,textTransform:"lowercase",letterSpacing:"0.02em"}}>zur liga →</Link>
          </div>
        ):(
          <div>
            <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:8}}>anmeldung</p>
            <h1 style={{fontSize:28,fontWeight:900,fontFamily:"'League Spartan', system-ui, sans-serif",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4,background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{season.name as string}</h1>
            <p style={{fontSize:13,color:M,marginBottom:24}}>{season.city as string} · {count}/{season.max_players as number} spieler</p>

            <div style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"16px",marginBottom:16}}>
              {[["📅","kostenlos","keine anmeldegebühr"],["🏓","round robin","jeder spielt gegen jeden"],["📊","live-tabelle","punkte & elo in echtzeit"],["⬆️","auf-/abstieg","top 2 steigen auf, bottom 2 ab"]].map(([icon,title,desc])=>(
                <div key={title} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                  <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                  <div>
                    <p style={{fontSize:14,fontWeight:700,color:W,margin:"0 0 2px"}}>{title}</p>
                    <p style={{fontSize:12,color:M,margin:0}}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {(count as number)>=(season.max_players as number)?(
              <div style={{background:`#FF444420`,border:"1px solid #FF444440",borderRadius:10,padding:"14px",textAlign:"center",color:"#FF6666",fontWeight:700}}>liga ist voll</div>
            ):(
              <button onClick={handleRegister} disabled={saving} style={{width:"100%",background:saving?B:"#fff",color:saving?M:"#0E1014",border:"none",borderRadius:10,padding:"16px",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",textTransform:"lowercase",letterSpacing:"0.02em"}}>
                {saving?"anmeldung läuft...":"jetzt kostenlos anmelden"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}