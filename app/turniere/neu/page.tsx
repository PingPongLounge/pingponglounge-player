"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, CARD, W, MUT, GREEN, DANGER, CITIES, cardPad, btn, chipBtn, h1, body, input as themeInput, backLink } from "@/app/theme"

const M=MUT, C=CARD, G=GREEN
const LEVELS=["alle","1","2","3","4","5","6","7"]
const LEVEL_LABEL=(l:string)=>l==="alle"?"Alle Level":`Level ${l}`

const inputStyle=themeInput

export default function NeuesTurnierPage(){
  const router=useRouter()
  const [name,setName]=useState("")
  const [city,setCity]=useState<string>(CITIES[0])
  const [date,setDate]=useState("")
  const [skill,setSkill]=useState("alle")
  const [format,setFormat]=useState<"ko"|"gruppen_ko">("ko")
  const [size,setSize]=useState(16)
  const [fee,setFee]=useState("0")
  const [counts,setCounts]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")

  async function create(){
    setError("")
    if(!name.trim()){setError("Bitte gib dem Turnier einen Namen");return}
    setSaving(true)
    const res=await fetch("/api/turniere",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name,city,date:date||null,skill_class:skill,format,max_players:size,entry_fee_chf:Number(fee)||0,counts_for_rank:counts})
    })
    const json=await res.json()
    if(!res.ok){setError(json.error||"Fehler beim Erstellen");setSaving(false);return}
    router.push(`/turniere/${json.id}`)
  }

  const Label=({children}:{children:React.ReactNode})=>(<p style={{...body,marginBottom:8}}>{children}</p>)
  const Section=({n,title,children}:{n:string,title:string,children:React.ReactNode})=>(
    <div style={{...cardPad,padding:"18px 16px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{width:22,height:22,borderRadius:7,background:G,color:"#06210a",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{n}</span>
        <span style={{fontSize:14,fontWeight:800,color:W,textTransform:"uppercase",letterSpacing:".04em"}}>{title}</span>
      </div>
      {children}
    </div>
  )
  const Chip=({active,onClick,children}:{active:boolean,onClick:()=>void,children:React.ReactNode})=>(
    <button onClick={onClick} style={chipBtn(active)}>{children}</button>
  )

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/turniere" style={backLink}>← Turniere</Link>

        <div style={{margin:"20px 0 20px"}}>
          <h1 style={{...h1,fontSize:26,letterSpacing:".08em"}}>Neues Turnier</h1>
          <p style={{...body,marginTop:8}}>Jeder kann ein Turnier erstellen · Setzliste automatisch nach Elo</p>
        </div>

        <Section n="1" title="Eckdaten">
          <Label>Name</Label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="z. B. Friday Night Cup" style={{...inputStyle,marginBottom:14}}/>
          <Label>Standort</Label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {CITIES.map(c=><Chip key={c} active={city===c} onClick={()=>setCity(c)}>{c}</Chip>)}
          </div>
          <Label>Datum (optional)</Label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/>
        </Section>

        <Section n="2" title="Format & Grösse">
          <Label>Modus</Label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <Chip active={format==="ko"} onClick={()=>setFormat("ko")}>⚔️ KO-Bracket</Chip>
            <Chip active={format==="gruppen_ko"} onClick={()=>setFormat("gruppen_ko")}>👥 Gruppen + KO</Chip>
          </div>
          <Label>Maximale Spieler</Label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[8,16,32].map(s=><Chip key={s} active={size===s} onClick={()=>setSize(s)}>{s}</Chip>)}
          </div>
          <Label>Level</Label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {LEVELS.map(l=><Chip key={l} active={skill===l} onClick={()=>setSkill(l)}>{LEVEL_LABEL(l)}</Chip>)}
          </div>
        </Section>

        <Section n="3" title="Startgeld & Rang">
          <Label>Startgeld pro Spieler (CHF)</Label>
          <input type="number" min="0" max="999" value={fee} onChange={e=>setFee(e.target.value)} style={{...inputStyle,marginBottom:14}}/>
          <div onClick={()=>setCounts(!counts)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"12px",background:"#20242C",borderRadius:10}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:W}}>Zählt für den Rang</p>
              <p style={{...body,marginTop:2}}>{counts?"Resultate beeinflussen Elo & Rangliste":"Nur zum Spass — kein Elo"}</p>
            </div>
            <span style={{width:44,height:26,borderRadius:999,background:counts?G:"#353B46",position:"relative",flexShrink:0,transition:"background .15s"}}>
              <span style={{position:"absolute",top:3,left:counts?21:3,width:20,height:20,borderRadius:999,background:"#fff",transition:"left .15s"}}/>
            </span>
          </div>
        </Section>

        {error&&<p style={{fontSize:13,color:DANGER,margin:"4px 0 12px",textAlign:"center"}}>{error}</p>}

        <button onClick={create} disabled={saving} style={{...btn,width:"100%",padding:15,fontSize:15,cursor:saving?"default":"pointer",opacity:saving?0.6:1}}>
          {saving?"Wird erstellt …":"Turnier erstellen →"}
        </button>
        <p style={{...body,textAlign:"center",marginTop:12,fontSize:11}}>Danach läuft die Anmeldung · du startest das Bracket, wenn genug Spieler da sind</p>
      </div>
      <BottomNav />
    </main>
  )
}
