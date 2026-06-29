"use client"
import { useEffect, useState , use} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  BG, W, MUT, GREEN, DANGER,
  cardPad, cardActive, btn, h1, body, meta, eyebrow, backLink,
} from "@/app/theme"

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

  if(loading||!season) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:MUT}}>Lädt …</p></main>

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <Link href={`/liga/${seasonId}`} style={{...backLink,display:"block",marginBottom:24}}>← Zurück</Link>

        {registered?(
          <div style={{...cardActive,padding:"32px 24px",textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:12}}>✓</p>
            <h1 style={{...h1,fontSize:22,color:GREEN,marginBottom:8}}>Angemeldet!</h1>
            <p style={{...body,marginBottom:24}}>Du bist für <strong style={{color:W}}>{season.name as string}</strong> registriert. Du wirst benachrichtigt, sobald die Saison startet.</p>
            <Link href={`/liga/${seasonId}`} style={{...btn}}>Zur Liga →</Link>
          </div>
        ):(
          <div>
            <div style={{...eyebrow,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Anmeldung</div>
            <h1 style={{...h1,marginBottom:4}}>{season.name as string}</h1>
            <p style={{...meta,marginBottom:24}}>{season.city as string} · {count}/{season.max_players as number} Spieler</p>

            <div style={{...cardPad,marginBottom:16}}>
              {[["📅","Kostenlos","keine Anmeldegebühr"],["🏓","Round Robin","jeder spielt gegen jeden"],["📊","Live-Tabelle","Punkte & ELO in Echtzeit"],["⬆️","Auf-/Abstieg","Top 2 steigen auf, Bottom 2 ab"]].map(([icon,title,desc])=>(
                <div key={title} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                  <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                  <div>
                    <p style={{fontSize:14,fontWeight:700,color:W,margin:"0 0 2px"}}>{title}</p>
                    <p style={{...body,margin:0}}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {(count as number)>=(season.max_players as number)?(
              <div style={{background:`${DANGER}20`,border:`1px solid ${DANGER}40`,borderRadius:10,padding:"14px",textAlign:"center",color:DANGER,fontWeight:700}}>Liga ist voll</div>
            ):(
              <button onClick={handleRegister} disabled={saving} style={{...btn,width:"100%",opacity:saving?0.6:1,cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Anmeldung läuft …":"Jetzt kostenlos anmelden"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
