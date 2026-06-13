"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8"
const levelColor=(l:string)=>({Locker:"#4ADE80",Hobby:"#FACC15",Fortgeschritten:"#FB923C",Competitive:PK}[l]||G)
const statusLabel=(s:string)=>({open:"OFFEN",running:"LÄUFT",finished:"ABGESCHLOSSEN"}[s]||s)
const statusColor=(s:string)=>({open:G,running:"#FACC15",finished:M}[s]||M)

type Tournament={id:string,name:string,date:string,city:string,skill_class:string,max_players:number,status:string,format:string,tournament_registrations:{count:number}[]}

export default function TurnierePage(){
  const [tournaments,setTournaments]=useState<Tournament[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    fetch("/api/turniere").then(r=>r.json()).then(d=>{
      setTournaments(d.tournaments||[])
      setLoading(false)
    })
  },[])

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/dashboard" style={{position:"absolute",left:0,right:0,display:"flex",justifyContent:"center",color:M,textDecoration:"none",fontSize:13}}>← Dashboard</Link>

        <div style={{margin:"20px 0 24px"}}>
          <h1 style={{fontSize:28,fontWeight:900,color:W,textTransform:"uppercase",lineHeight:1}}>TURNIERE</h1>
          <p style={{fontSize:13,color:M,marginTop:6}}>Community Turniere · KO-Bracket · ELO</p>
        </div>

        {loading?(
          <div style={{textAlign:"center",padding:"60px 0",color:M}}>
            <div style={{fontSize:32,marginBottom:12}}>🏆</div>
            <p>Lädt...</p>
          </div>
        ):tournaments.length===0?(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"40px 20px",textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:12}}>🏆</p>
            <p style={{fontSize:16,fontWeight:700,color:W,marginBottom:8}}>Noch keine Turniere</p>
            <p style={{fontSize:13,color:M}}>Bald startet das erste Turnier — bleib dran!</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {tournaments.map(t=>{
              const lc=levelColor(t.skill_class)
              const sc=statusColor(t.status)
              const regCount=t.tournament_registrations?.[0]?.count??0
              const dateStr=t.date?new Date(t.date).toLocaleDateString("de-CH",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):""
              return(
                <Link key={t.id} href={`/turniere/${t.id}`} style={{textDecoration:"none"}}>
                  <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <p style={{fontSize:16,fontWeight:800,color:W,marginBottom:4}}>{t.name}</p>
                        <p style={{fontSize:12,color:M}}>📍 {t.city} · 📅 {dateStr}</p>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:sc,background:`${sc}18`,border:`1px solid ${sc}30`,borderRadius:999,padding:"2px 10px",flexShrink:0}}>{statusLabel(t.status)}</span>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,color:lc,background:`${lc}15`,border:`1px solid ${lc}30`,borderRadius:999,padding:"2px 8px"}}>{t.skill_class}</span>
                      <span style={{fontSize:11,color:M,background:B,borderRadius:999,padding:"2px 8px"}}>⚔️ {t.format==="ko"?"KO-Bracket":"Gruppen"}</span>
                      <span style={{fontSize:11,color:M,background:B,borderRadius:999,padding:"2px 8px"}}>{regCount}/{t.max_players} Spieler</span>
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