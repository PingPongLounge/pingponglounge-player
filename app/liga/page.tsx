"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8"

const levelColor=(l:string):string=>({
  Rookie:"#4ADE80",
  Challenger:"#FACC15",
  Advanced:"#FB923C",
  Elite:PK
}[l]||G)

const LEVEL_DESC:{[k:string]:string}={
  Rookie:    "Für Einsteiger. Keine Turniererfahrung nötig — einfach spielen und dazulernen.",
  Challenger:"Für regelmässige Spieler mit Grundtechniken. Du kannst Rallys spielen und kennst die Regeln.",
  Advanced:  "Für erfahrene Spieler mit Taktik und Konstanz. Vereins- oder Turniererfahrung von Vorteil.",
  Elite:     "Für ambitionierte Wettkämpfer. Die härteste Liga — ELO zählt, jedes Match.",
}

const LEVELS=["Rookie","Challenger","Advanced","Elite"] as const
const CITIES=["Zürich","Basel","Luzern","St. Gallen"]

type Season={
  id:string,name:string,city:string,skill_class:string,
  status:string,max_players:number,start_date:string,
  description:string,_count?:number
}

export default function LigaPage(){
  const [seasons,setSeasons]=useState<Season[]>([])
  const [loading,setLoading]=useState(true)
  const [filter,setFilter]=useState<string>("Alle")
  const [showLigaForm,setShowLigaForm]=useState(false)
  const [ligaForm,setLigaForm]=useState({name:"",email:"",firma:"",standort:"",liga_art:"Rookie",start_datum:"",end_datum:""})
  const [ligaSending,setLigaSending]=useState(false)
  const [ligaMsg,setLigaMsg]=useState("")

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data}=await sb
        .from("league_seasons")
        .select("*,league_registrations(count)")
        .in("status",["open","running"])
        .order("start_date",{ascending:true})
      const mapped=(data||[]).map((s:Season&{league_registrations?:{count:number}[]})=>({
        ...s,_count:s.league_registrations?.[0]?.count||0
      }))
      setSeasons(mapped)
      setLoading(false)
    }
    load()
  },[])

  const filtered=filter==="Alle"
    ? seasons
    : seasons.filter(s=>s.skill_class===filter)

  const byCity=(city:string)=>filtered.filter(s=>s.city===city)


  async function submitLigaRequest(){
    if(!ligaForm.name||!ligaForm.email||!ligaForm.firma){setLigaMsg("Name, Email und Firma sind Pflicht");return}
    setLigaSending(true);setLigaMsg("")
    const res=await fetch("/api/liga/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ligaForm)})
    if(res.ok){setLigaMsg("✓ Anfrage gesendet — wir melden uns!");setLigaForm({name:"",email:"",firma:"",standort:"",liga_art:"Rookie",start_datum:"",end_datum:""})}
    else{const d=await res.json();setLigaMsg(d.error||"Fehler")}
    setLigaSending(false)
  }

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 20px 80px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/dashboard" style={{position:"absolute",left:0,right:0,display:"flex",justifyContent:"center",color:M,textDecoration:"none",fontSize:13}}>← Dashboard</Link>

        {/* Header */}
        <div style={{textAlign:"center",margin:"28px 0 24px"}}>
          <p style={{fontSize:11,fontWeight:700,color:G,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:8}}>Player Liga</p>
          <h1 style={{fontSize:42,fontWeight:900,color:W,textTransform:"uppercase",lineHeight:.95,marginBottom:8}}>LIGA</h1>
          <p style={{fontSize:14,color:M}}>Stadtweise Saisons · Live-Tabelle · Open Match</p>
        </div>

        {/* Level-Filter */}
        <div style={{display:"flex",gap:6,marginBottom:24,flexWrap:"wrap"}}>
          {["Alle",...LEVELS].map(l=>{
            const active=filter===l
            const lc=l==="Alle"?G:levelColor(l)
            return(
              <button
                key={l}
                onClick={()=>setFilter(l)}
                style={{
                  background:active?`${lc}20`:"none",
                  border:`1px solid ${active?lc:B}`,
                  borderRadius:999,
                  padding:"7px 14px",
                  fontSize:12,
                  fontWeight:700,
                  color:active?lc:M,
                  cursor:"pointer",
                  transition:"all 0.15s",
                  letterSpacing:"0.04em",
                }}
              >
                {l}
              </button>
            )
          })}
        </div>

        {/* Level-Beschreibung (wenn Filter aktiv) */}
        {filter!=="Alle"&&LEVEL_DESC[filter]&&(
          <div style={{
            background:C,
            border:`1px solid ${levelColor(filter)}30`,
            borderRadius:12,
            padding:"12px 16px",
            marginBottom:20,
          }}>
            <span style={{fontSize:11,fontWeight:700,color:levelColor(filter),marginRight:8,textTransform:"uppercase"}}>{filter}</span>
            <span style={{fontSize:13,color:M}}>{LEVEL_DESC[filter]}</span>
          </div>
        )}

        {loading
          ?<p style={{textAlign:"center",color:M}}>Lädt...</p>
          :filtered.length===0?(
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"32px 20px",textAlign:"center"}}>
              <p style={{fontSize:32,marginBottom:12}}>🏓</p>
              <p style={{fontSize:16,fontWeight:700,color:W,marginBottom:8}}>
                {filter==="Alle"?"Bald startet die erste Saison":`Keine ${filter}-Saison aktiv`}
              </p>
              <p style={{fontSize:13,color:M}}>Schau bald wieder rein — neue Saisons kommen laufend.</p>
            </div>
          ):(
            CITIES.map(city=>{
              const cs=byCity(city)
              if(!cs.length) return null
              return(
                <div key={city} style={{marginBottom:28}}>
                  <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>{city}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {cs.map(s=>{
                      const lc=levelColor(s.skill_class)
                      return(
                        <div key={s.id} style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"16px 18px"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                                <span style={{fontSize:15,fontWeight:700,color:W}}>{s.name}</span>
                                <span style={{fontSize:10,fontWeight:700,color:lc,background:`${lc}18`,border:`1px solid ${lc}40`,borderRadius:999,padding:"2px 8px",flexShrink:0}}>{s.skill_class}</span>
                              </div>
                              {/* Standardisierte Level-Beschreibung */}
                              <p style={{fontSize:12,color:M,marginBottom:s.description?4:0,lineHeight:1.4}}>
                                {LEVEL_DESC[s.skill_class]||""}
                              </p>
                              {/* Custom Admin-Beschreibung (falls vorhanden) */}
                              {s.description&&(
                                <p style={{fontSize:12,color:M,fontStyle:"italic"}}>{s.description}</p>
                              )}
                              {s.start_date&&(
                                <p style={{fontSize:11,color:M,marginTop:4}}>
                                  Start: {new Date(s.start_date).toLocaleDateString("de-CH",{day:"numeric",month:"long",year:"numeric"})}
                                </p>
                              )}
                            </div>
                            <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                              <div style={{fontSize:11,fontWeight:700,color:s.status==="running"?G:M,background:s.status==="running"?`${G}18`:B,borderRadius:999,padding:"2px 10px",marginBottom:4}}>
                                {s.status==="running"?"LÄUFT":"OFFEN"}
                              </div>
                              <p style={{fontSize:11,color:M}}>{s._count||0}/{s.max_players}</p>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <Link href={`/liga/${s.id}`} style={{flex:1,background:B,color:W,textDecoration:"none",borderRadius:8,padding:"10px",textAlign:"center",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tabelle →</Link>
                            {s.status==="open"&&(
                              <Link href={`/liga/${s.id}/anmelden`} style={{flex:1,background:G,color:"#0A0A0C",textDecoration:"none",borderRadius:8,padding:"10px",textAlign:"center",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Anmelden</Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )
        }
      </div>

      {/* Eigene Liga CTA */}
      <div style={{textAlign:"center",marginTop:36,paddingTop:24,borderTop:`1px solid ${B}`}}>
        <p style={{fontSize:13,color:M,marginBottom:4}}>Liga für dein Team oder deine Firma?</p>
        <button onClick={()=>{setShowLigaForm(true);setLigaMsg("")}} style={{background:"none",border:"none",color:G,cursor:"pointer",fontSize:13,fontWeight:700,textDecoration:"underline",letterSpacing:"0.04em"}}>
          Eigene Liga anfragen →
        </button>
      </div>

      {/* Popup */}
      {showLigaForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)setShowLigaForm(false)}}>
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:G,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Eigene Liga</p>
                <h2 style={{fontSize:20,fontWeight:900,color:W,textTransform:"uppercase",margin:0}}>Anfrage stellen</h2>
              </div>
              <button onClick={()=>setShowLigaForm(false)} style={{background:"none",border:"none",color:M,cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
            </div>

            {[
              ["Name","text","name","Dein Name"],
              ["Email","email","email","deine@email.ch"],
              ["Firma / Team","text","firma","Firma oder Team-Name"],
              ["Standort","text","standort","z.B. Zürich"],
            ].map(([label,type,key,ph])=>(
              <div key={key} style={{marginBottom:10}}>
                <label style={{fontSize:11,color:M,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4}}>{label}</label>
                <input
                  type={type}
                  value={ligaForm[key as keyof typeof ligaForm]}
                  onChange={e=>setLigaForm(f=>({...f,[key]:e.target.value}))}
                  placeholder={ph}
                  style={{width:"100%",background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"11px 14px",fontSize:14,color:W,outline:"none",boxSizing:"border-box"}}
                />
              </div>
            ))}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div>
                <label style={{fontSize:11,color:M,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4}}>Liga-Level</label>
                <select value={ligaForm.liga_art} onChange={e=>setLigaForm(f=>({...f,liga_art:e.target.value}))} style={{width:"100%",background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"11px 14px",fontSize:14,color:W,outline:"none"}}>
                  {["Rookie","Challenger","Advanced","Elite","Gemischt"].map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:M,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4}}>Startdatum</label>
                <input type="date" value={ligaForm.start_datum} onChange={e=>setLigaForm(f=>({...f,start_datum:e.target.value}))} style={{width:"100%",background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"11px 14px",fontSize:14,color:W,outline:"none"}}/>
              </div>
            </div>

            {ligaMsg&&<p style={{fontSize:13,color:ligaMsg.startsWith("✓")?G:"#FF6666",marginBottom:10}}>{ligaMsg}</p>}

            {ligaMsg.startsWith("✓")?(
              <button onClick={()=>setShowLigaForm(false)} style={{width:"100%",background:G,color:"#0A0A0C",border:"none",borderRadius:10,padding:"14px",fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.06em"}}>Schliessen</button>
            ):(
              <button onClick={submitLigaRequest} disabled={ligaSending} style={{width:"100%",background:ligaSending?B:G,color:ligaSending?M:"#0A0A0C",border:"none",borderRadius:10,padding:"14px",fontSize:13,fontWeight:700,cursor:ligaSending?"not-allowed":"pointer",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                {ligaSending?"Sende...":"Anfrage senden"}
              </button>
            )}
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  )
}