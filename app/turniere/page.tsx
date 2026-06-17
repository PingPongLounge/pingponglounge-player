"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#14161A",C="#1B1E25",B="#1E2230",M="rgba(255,255,255,0.62)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const
const statusLabel=(s:string)=>({open:"offen",running:"läuft",finished:"beendet"}[s]||s)

type Tournament={id:string,name:string,date:string,city:string,skill_class:string,max_players:number,status:string,format:string,tournament_registrations:{count:number}[]}

export default function TurnierePage(){
  const [tournaments,setTournaments]=useState<Tournament[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState("")

  async function load(){
    setError("")
    try {
      const r = await fetch("/api/turniere")
      const d = await r.json()
      setTournaments(d.tournaments||[])
    } catch {
      setError("Turniere konnten nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ load() },[])

  if(error) return(
    <main style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{textAlign:"center"}}>
        <p style={{fontSize:36,marginBottom:12}}>⚠️</p>
        <p style={{fontSize:14,fontWeight:600,color:W,marginBottom:6}}>verbindungsfehler</p>
        <p style={{fontSize:13,color:M,marginBottom:20,fontWeight:400}}>{error}</p>
        <button onClick={load} style={{background:"#fff",color:"#14161A",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"lowercase"}}>nochmals versuchen</button>
      </div>
      <BottomNav />
    </main>
  )

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",color:M,textDecoration:"none",fontSize:13}}>← dashboard</Link>

        <div style={{margin:"20px 0 24px"}}>
          <h1 style={{fontSize:28,fontWeight:900,textTransform:"uppercase",letterSpacing:".1em",lineHeight:1,...GRAD}}>turniere</h1>
          <p style={{fontSize:13,color:M,marginTop:8,fontWeight:400}}>community turniere · ko-bracket · elo</p>
        </div>

        {loading?(
          <div style={{textAlign:"center",padding:"60px 0",color:M}}>
            <div style={{fontSize:32,marginBottom:12}}>🏆</div>
            <p style={{fontWeight:400,textTransform:"lowercase"}}>lädt...</p>
          </div>
        ):tournaments.length===0?(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"40px 20px",textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:12}}>🏆</p>
            <p style={{fontSize:16,fontWeight:600,color:W,marginBottom:8}}>noch keine turniere</p>
            <p style={{fontSize:13,color:M,fontWeight:400}}>bald startet das erste turnier — bleib dran!</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {tournaments.map(t=>{
              const regCount=t.tournament_registrations?.[0]?.count??0
              const dateStr=t.date?new Date(t.date).toLocaleDateString("de-CH",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):""
              return(
                <Link key={t.id} href={`/turniere/${t.id}`} style={{textDecoration:"none"}}>
                  <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <p style={{fontSize:16,fontWeight:600,color:W,marginBottom:4}}>{t.name}</p>
                        <p style={{fontSize:12,color:M,fontWeight:400,textTransform:"lowercase"}}>📍 {t.city} · 📅 {dateStr}</p>
                      </div>
                      <span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,0.85)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"3px 10px",flexShrink:0,textTransform:"lowercase"}}>{statusLabel(t.status)}</span>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:500,color:"rgba(255,255,255,0.85)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"2px 9px",textTransform:"lowercase"}}>{t.skill_class}</span>
                      <span style={{fontSize:11,color:M,background:"#1A1D24",borderRadius:999,padding:"2px 8px",fontWeight:400,textTransform:"lowercase"}}>⚔️ {t.format==="ko"?"ko-bracket":"gruppen"}</span>
                      <span style={{fontSize:11,color:M,background:"#1A1D24",borderRadius:999,padding:"2px 8px",fontWeight:400,textTransform:"lowercase"}}>{regCount}/{t.max_players} spieler</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}