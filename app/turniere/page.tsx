"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, CARD, CELL, W, MUT, GREEN, cardPad, chip, btn, levelBadge, statusPill, h1, body, backLink } from "@/app/theme"
import { SectionHero, SectionIntro } from "@/app/components/SectionUI"

const M=MUT, C=CARD, B=CELL, G=GREEN
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
        <p style={{fontSize:14,fontWeight:700,color:W,marginBottom:6}}>Verbindungsfehler</p>
        <p style={{...body,marginBottom:20}}>{error}</p>
        <button onClick={load} style={{...btn,display:"inline-block",padding:"10px 24px"}}>Nochmals versuchen</button>
      </div>
      <BottomNav />
    </main>
  )

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/entdecken" style={{color:M,textDecoration:"none",fontSize:13,fontWeight:500}}>← Start</Link>

        <SectionHero eyebrow="Player · Turnier" title="Turniere" subtitle="Community-Turniere · KO-Bracket · zählt für deinen Rang." />
        <SectionIntro storageKey="intro_turniere" title="So funktioniert ein Turnier" steps={[["1","Turnier finden","Sieh dir offene Turniere in deiner Stadt an."],["2","Anmelden","Sichere dir deinen Platz, solang welche frei sind."],["3","KO-Bracket spielen","Gewinne dich nach oben — die Resultate zählen für ELO & Rang."]]} />

        <Link href="/turniere/neu" style={{...btn,margin:"18px 0 20px"}}>
          + Eigenes Turnier erstellen
        </Link>

        {loading?(
          <div style={{textAlign:"center",padding:"60px 0",color:M}}>
            <div style={{fontSize:32,marginBottom:12}}>🏆</div>
            <p style={body}>Lädt …</p>
          </div>
        ):tournaments.length===0?(
          <div style={{...cardPad,padding:"40px 20px",textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:12}}>🏆</p>
            <p style={{fontSize:16,fontWeight:700,color:W,marginBottom:8}}>Noch keine Turniere</p>
            <p style={body}>Bald startet das erste Turnier — bleib dran!</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {tournaments.map(t=>{
              const regCount=t.tournament_registrations?.[0]?.count??0
              const dateStr=t.date?new Date(t.date).toLocaleDateString("de-CH",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):""
              return(
                <Link key={t.id} href={`/turniere/${t.id}`} style={{textDecoration:"none"}}>
                  <div style={{...cardPad,padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <p style={{fontSize:16,fontWeight:700,color:W,marginBottom:4}}>{t.name}</p>
                        <p style={body}>📍 {t.city} · 📅 {dateStr}</p>
                      </div>
                      <span style={{...statusPill,flexShrink:0}}>{statusLabel(t.status)}</span>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span style={levelBadge(t.skill_class)}>{t.skill_class==="alle"?"Alle Level":`Level ${t.skill_class}`}</span>
                      <span style={chip}>⚔️ {t.format==="ko"?"KO-Bracket":"Gruppen"}</span>
                      <span style={chip}>{regCount}/{t.max_players} Spieler</span>
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