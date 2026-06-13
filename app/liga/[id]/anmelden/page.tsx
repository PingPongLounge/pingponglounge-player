"use client"
import { useEffect, useState , use} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1"

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

  if(loading||!season) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:M}}>Lädt...</p></main>

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <Link href={`/liga/${seasonId}`} style={{color:M,textDecoration:"none",fontSize:13,display:"block",marginBottom:24}}>← Zurück</Link>

        {registered?(
          <div style={{background:C,border:`1px solid ${G}40`,borderRadius:16,padding:"32px 24px",textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:12}}>✓</p>
            <p style={{fontSize:20,fontWeight:900,color:G,textTransform:"uppercase",marginBottom:8}}>Angemeldet!</p>
            <p style={{fontSize:14,color:M,marginBottom:24}}>Du bist für <strong style={{color:W}}>{season.name as string}</strong> registriert. Du wirst benachrichtigt sobald die Saison startet.</p>
            <Link href={`/liga/${seasonId}`} style={{display:"block",background:G,color:"#0A0A0C",textDecoration:"none",borderRadius:10,padding:"14px",fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Zur Liga →</Link>
          </div>
        ):(
          <div>
            <p style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:8}}>Anmeldung</p>
            <h1 style={{fontSize:28,fontWeight:900,color:W,textTransform:"uppercase",marginBottom:4}}>{season.name as string}</h1>
            <p style={{fontSize:13,color:M,marginBottom:24}}>{season.city as string} · {count}/{season.max_players as number} Spieler</p>

            <div style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"16px",marginBottom:16}}>
              {[["📅","Kostenlos","Keine Anmeldegebühr"],["🏓","Round Robin","Jeder spielt gegen jeden"],["📊","Live-Tabelle","Punkte & ELO in Echtzeit"],["⬆️","Auf-/Abstieg","Top 2 steigen auf, Bottom 2 ab"]].map(([icon,title,desc])=>(
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
              <div style={{background:`#FF444420`,border:"1px solid #FF444440",borderRadius:10,padding:"14px",textAlign:"center",color:"#FF6666",fontWeight:700}}>Liga ist voll</div>
            ):(
              <button onClick={handleRegister} disabled={saving} style={{width:"100%",background:saving?B:G,color:saving?M:"#0A0A0C",border:"none",borderRadius:10,padding:"16px",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                {saving?"Anmeldung läuft...":"Jetzt kostenlos anmelden"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}