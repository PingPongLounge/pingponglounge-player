"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1"
const levelColor=(l:string):string=>({Locker:"#4ADE80",Hobby:"#FACC15",Fortgeschritten:"#FB923C",Competitive:"#FF00C8"}[l]||G)

type Season={id:string,name:string,city:string,skill_class:string,status:string,max_players:number,start_date:string,description:string,_count?:number}
const CITIES=["Zürich","Basel","Luzern","St. Gallen"]

export default function LigaPage(){
  const [seasons,setSeasons]=useState<Season[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data}=await sb.from("league_seasons").select("*,league_registrations(count)").in("status",["open","running"]).order("start_date",{ascending:true})
      const mapped=(data||[]).map((s:Season&{league_registrations?:{count:number}[]})=>({...s,_count:s.league_registrations?.[0]?.count||0}))
      setSeasons(mapped);setLoading(false)
    }
    load()
  },[])

  const byCityy=(city:string)=>seasons.filter(s=>s.city===city)

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 20px 80px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/dashboard" style={{color:M,textDecoration:"none",fontSize:13}}>← Dashboard</Link>
        <div style={{textAlign:"center",margin:"28px 0 32px"}}>
          <p style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:8}}>Player Liga</p>
          <h1 style={{fontSize:42,fontWeight:900,color:W,textTransform:"uppercase",lineHeight:.95,marginBottom:8}}>LIGA</h1>
          <p style={{fontSize:14,color:M}}>Stadtweise Saisons · Round Robin · Live-Tabelle</p>
        </div>

        {loading?<p style={{textAlign:"center",color:M}}>Lädt...</p>:
        seasons.length===0?(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"32px 20px",textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:12}}>🏓</p>
            <p style={{fontSize:16,fontWeight:700,color:W,marginBottom:8}}>Bald startet die erste Saison</p>
            <p style={{fontSize:13,color:M}}>Trag dich auf die Warteliste ein – du wirst benachrichtigt.</p>
          </div>
        ):(
          CITIES.map(city=>{
            const cs=byCityy(city)
            if(!cs.length) return null
            return(
              <div key={city} style={{marginBottom:28}}>
                <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>{city}</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {cs.map(s=>(
                    <div key={s.id} style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"16px 18px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span style={{fontSize:15,fontWeight:700,color:W}}>{s.name}</span>
                            <span style={{fontSize:10,fontWeight:700,color:levelColor(s.skill_class),background:`${levelColor(s.skill_class)}18`,border:`1px solid ${levelColor(s.skill_class)}40`,borderRadius:999,padding:"2px 8px"}}>{s.skill_class}</span>
                          </div>
                          {s.start_date&&<p style={{fontSize:12,color:M}}>Start: {new Date(s.start_date).toLocaleDateString("de-CH",{day:"numeric",month:"long",year:"numeric"})}</p>}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:11,fontWeight:700,color:s.status==="running"?G:M,background:s.status==="running"?`${G}18`:B,borderRadius:999,padding:"2px 10px",marginBottom:4}}>{s.status==="running"?"LÄUFT":"OFFEN"}</div>
                          <p style={{fontSize:11,color:M}}>{s._count||0}/{s.max_players} Spieler</p>
                        </div>
                      </div>
                      {s.description&&<p style={{fontSize:12,color:M,marginBottom:10}}>{s.description}</p>}
                      <div style={{display:"flex",gap:8}}>
                        <Link href={`/liga/${s.id}`} style={{flex:1,background:B,color:W,textDecoration:"none",borderRadius:8,padding:"10px",textAlign:"center",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tabelle →</Link>
                        {s.status==="open"&&<Link href={`/liga/${s.id}/anmelden`} style={{flex:1,background:G,color:"#0A0A0C",textDecoration:"none",borderRadius:8,padding:"10px",textAlign:"center",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Anmelden</Link>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}