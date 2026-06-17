"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { STAFF_EMAILS } from "@/lib/staff"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1"
const CITIES=["Oerlikon","Langstrasse","Glattbrugg","Basel","Luzern","St. Gallen","Bern","Zürich"]
const LEVELS=["Rookie","Challenger","Advanced","Elite"]


export default function AdminLigaPage(){
  const [seasons,setSeasons]=useState<Record<string,unknown>[]>([])
  const [form,setForm]=useState({name:"",city:"Zürich",skill_class:"Challenger",max_players:10,start_date:"",description:""})
  const [saving,setSaving]=useState(false)
  const [generating,setGenerating]=useState<string|null>(null)
  const [msg,setMsg]=useState("")
  const [authed,setAuthed]=useState(false)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data:{user}}=await sb.auth.getUser()
      if(!user||!STAFF_EMAILS.includes(user.email||"")){window.location.href="/entdecken";return}
      setAuthed(true)
      const {data}=await sb.from("league_seasons").select("*,league_registrations(count)").order("created_at",{ascending:false})
      setSeasons(data||[])
      setLoading(false)
    }
    load()
  },[])

  async function createSeason(){
    if(!form.name||!form.city){setMsg("Name und Stadt sind Pflicht");return}
    setSaving(true);setMsg("")
    const res=await fetch("/api/liga/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})
    if(res.ok){
      const {id}=await res.json()
      setMsg(`✓ Saison erstellt: ${id}`)
      const sb=createClient()
      const {data}=await sb.from("league_seasons").select("*,league_registrations(count)").order("created_at",{ascending:false})
      setSeasons(data||[])
    }else{const d=await res.json();setMsg(`Fehler: ${d.error}`)}
    setSaving(false)
  }

  async function generateMatches(seasonId:string){
    setGenerating(seasonId)
    const res=await fetch("/api/liga/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId})})
    const d=await res.json()
    setMsg(res.ok?`✓ ${d.count} Matches generiert`:`Fehler: ${d.error}`)
    setGenerating(null)
  }

  async function updateStatus(seasonId:string,status:string){
    const sb=createClient()
    await sb.from("league_seasons").update({status}).eq("id",seasonId)
    setSeasons(s=>s.map(x=>x.id===seasonId?{...x,status}:x))
  }

  if(loading||!authed) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:M}}>Lädt...</p></main>

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 20px 80px"}}>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <Link href="/dashboard" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",color:M,textDecoration:"none",fontSize:13}}>← Dashboard</Link>
        <h1 style={{fontSize:28,fontWeight:900,color:W,textTransform:"uppercase",margin:"16px 0 24px"}}>Liga Admin</h1>

        {/* Create form */}
        <div style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"20px",marginBottom:24}}>
          <p style={{fontSize:12,fontWeight:700,color:G,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Neue Saison erstellen</p>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Name (z.B. PPL Zürich Frühling 2026)" style={{width:"100%",background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"12px",fontSize:14,color:W,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <select value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} style={{background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"12px",fontSize:14,color:W,outline:"none"}}>
              {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.skill_class} onChange={e=>setForm(f=>({...f,skill_class:e.target.value}))} style={{background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"12px",fontSize:14,color:W,outline:"none"}}>
              {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <input type="number" value={form.max_players} onChange={e=>setForm(f=>({...f,max_players:+e.target.value}))} placeholder="Max Spieler" style={{background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"12px",fontSize:14,color:W,outline:"none"}}/>
            <input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} style={{background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"12px",fontSize:14,color:W,outline:"none"}}/>
          </div>
          <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Beschreibung (optional)" style={{width:"100%",background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"12px",fontSize:14,color:W,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
          {msg&&<p style={{fontSize:13,color:msg.startsWith("✓")?G:"#FF6666",marginBottom:8}}>{msg}</p>}
          <button onClick={createSeason} disabled={saving} style={{width:"100%",background:saving?B:G,color:saving?M:"#14161A",border:"none",borderRadius:8,padding:"14px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",textTransform:"uppercase",letterSpacing:"0.06em"}}>
            {saving?"Erstellen...":"Saison erstellen"}
          </button>
        </div>

        {/* Season list */}
        <p style={{fontSize:12,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Alle Saisons</p>
        {seasons.map(s=>{
          const count=(s.league_registrations as {count:number}[])?.[0]?.count||0
          return(
            <div key={s.id as string} style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <p style={{fontSize:14,fontWeight:700,color:W,margin:"0 0 2px"}}>{s.name as string}</p>
                  <p style={{fontSize:12,color:M}}>{s.city as string} · {s.skill_class as string} · {count}/{s.max_players as number} Spieler</p>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:G,background:`${G}18`,borderRadius:999,padding:"2px 8px",textTransform:"uppercase"}}>{s.status as string}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <Link href={`/liga/${s.id as string}`} style={{fontSize:11,color:M,background:BG,border:`1px solid ${B}`,borderRadius:6,padding:"6px 10px",textDecoration:"none",fontWeight:700}}>Ansehen</Link>
                {s.status==="open"&&<button onClick={()=>generateMatches(s.id as string)} disabled={generating===s.id} style={{fontSize:11,color:"#14161A",background:G,border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>{generating===s.id?"...":"Matches generieren"}</button>}
                {s.status==="open"&&<button onClick={()=>updateStatus(s.id as string,"running")} style={{fontSize:11,color:W,background:B,border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>→ Running</button>}
                {s.status==="running"&&<button onClick={()=>updateStatus(s.id as string,"finished")} style={{fontSize:11,color:W,background:B,border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>→ Finished</button>}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}