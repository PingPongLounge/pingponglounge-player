"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#0E1014",C="#1A1D24",B="#23272F",M="rgba(255,255,255,0.85)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"} as const
const CITIES=["Glattbrugg","Oerlikon","Zürich","Winterthur","Baden","Tessin"]
const LEVELS=["alle","Rookie","Challenger","Advanced","Elite"]

const inputStyle={width:"100%",background:"#0E1014",border:`1px solid ${B}`,borderRadius:10,padding:"12px",fontSize:14,color:W,outline:"none",fontFamily:"inherit"} as const

export default function NeuesTurnierPage(){
  const router=useRouter()
  const [name,setName]=useState("")
  const [city,setCity]=useState(CITIES[0])
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

  const Label=({children}:{children:React.ReactNode})=>(<p style={{fontSize:12,color:M,marginBottom:8,textTransform:"lowercase"}}>{children}</p>)
  const Section=({n,title,children}:{n:string,title:string,children:React.ReactNode})=>(
    <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"18px 16px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{width:22,height:22,borderRadius:7,background:G,color:"#06210a",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{n}</span>
        <span style={{fontSize:14,fontWeight:700,color:W,textTransform:"lowercase"}}>{title}</span>
      </div>
      {children}
    </div>
  )
  const Chip=({active,onClick,children}:{active:boolean,onClick:()=>void,children:React.ReactNode})=>(
    <button onClick={onClick} style={{padding:"9px 14px",borderRadius:999,fontSize:13,fontWeight:active?700:400,cursor:"pointer",background:active?"#fff":"#0E1014",color:active?"#0E1014":M,border:`1px solid ${active?"#fff":B}`,textTransform:"lowercase"}}>{children}</button>
  )

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/turniere" style={{color:M,textDecoration:"none",fontSize:13}}>← turniere</Link>

        <div style={{margin:"20px 0 20px"}}>
          <h1 style={{fontSize:26,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",lineHeight:1,...GRAD}}>neues turnier</h1>
          <p style={{fontSize:13,color:M,marginTop:8,fontWeight:500,textTransform:"lowercase"}}>jeder kann ein turnier erstellen · setzliste automatisch nach elo</p>
        </div>

        <Section n="1" title="eckdaten">
          <Label>name</Label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="z.b. friday night cup" style={{...inputStyle,marginBottom:14}}/>
          <Label>standort</Label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {CITIES.map(c=><Chip key={c} active={city===c} onClick={()=>setCity(c)}>{c}</Chip>)}
          </div>
          <Label>datum (optional)</Label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/>
        </Section>

        <Section n="2" title="format & grösse">
          <Label>modus</Label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <Chip active={format==="ko"} onClick={()=>setFormat("ko")}>⚔️ ko-bracket</Chip>
            <Chip active={format==="gruppen_ko"} onClick={()=>setFormat("gruppen_ko")}>👥 gruppen + ko</Chip>
          </div>
          <Label>maximale spieler</Label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[8,16,32].map(s=><Chip key={s} active={size===s} onClick={()=>setSize(s)}>{s}</Chip>)}
          </div>
          <Label>level</Label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {LEVELS.map(l=><Chip key={l} active={skill===l} onClick={()=>setSkill(l)}>{l}</Chip>)}
          </div>
        </Section>

        <Section n="3" title="startgeld & rang">
          <Label>startgeld pro spieler (chf)</Label>
          <input type="number" min="0" max="999" value={fee} onChange={e=>setFee(e.target.value)} style={{...inputStyle,marginBottom:14}}/>
          <div onClick={()=>setCounts(!counts)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"12px",background:"#0E1014",border:`1px solid ${counts?G+"40":B}`,borderRadius:10}}>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:W,textTransform:"lowercase"}}>zählt für den rang</p>
              <p style={{fontSize:11,color:M,marginTop:2,fontWeight:500,textTransform:"lowercase"}}>{counts?"resultate beeinflussen elo & rangliste":"nur zum spass — kein elo"}</p>
            </div>
            <span style={{width:44,height:26,borderRadius:999,background:counts?G:"#23272F",position:"relative",flexShrink:0,transition:"background .15s"}}>
              <span style={{position:"absolute",top:3,left:counts?21:3,width:20,height:20,borderRadius:999,background:"#fff",transition:"left .15s"}}/>
            </span>
          </div>
        </Section>

        {error&&<p style={{fontSize:13,color:"#f87171",margin:"4px 0 12px",textAlign:"center"}}>{error}</p>}

        <button onClick={create} disabled={saving} style={{width:"100%",background:"#fff",color:"#0E1014",border:"none",borderRadius:12,padding:"15px",fontSize:15,fontWeight:700,cursor:saving?"default":"pointer",textTransform:"lowercase",opacity:saving?0.6:1}}>
          {saving?"wird erstellt...":"turnier erstellen →"}
        </button>
        <p style={{fontSize:11,color:M,textAlign:"center",marginTop:12,fontWeight:500,textTransform:"lowercase"}}>danach läuft die anmeldung · du startest das bracket, wenn genug spieler da sind</p>
      </div>
      <BottomNav />
    </main>
  )
}
