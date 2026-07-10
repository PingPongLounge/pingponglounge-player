"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  BG, CELL, W, MUT, GREEN, DANGER,
  cardPad, cardActive, btn, btnGhost, input, label,
  body, meta, eyebrow, backLink,
} from "@/app/theme"

type SetScore={p1:string,p2:string}
type MatchData={id:string,season_id:string,round:number,p1_id:string,p1_name:string,p2_id:string,p2_name:string,sets:Array<{p1:number,p2:number}>|null,winner_id:string|null,status:string}

export default function MatchPage({params}:{params:{id:string}}){
  const [match,setMatch]=useState<MatchData|null>(null)
  const [userId,setUserId]=useState<string|null>(null)
  const [sets,setSets]=useState<SetScore[]>([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}])
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")
  const [loading,setLoading]=useState(true)
  const [submitted,setSubmitted]=useState(false)
  const [nextMatchId,setNextMatchId]=useState<string|null>(null)

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data:{user}}=await sb.auth.getUser()
      if(!user){window.location.href="/login";return}
      setUserId(user.id)
      const {data}=await sb.from("league_matches").select("id,season_id,round,p1_id,p2_id,sets,winner_id,status,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name)").eq("id",params.id).single()
      if(data) setMatch({...data,p1_name:((data.p1 as unknown as {name:string}[]|null)?.[0]?.name)||"?",p2_name:((data.p2 as unknown as {name:string}[]|null)?.[0]?.name)||"?"} as MatchData)
      setLoading(false)
    }
    load()
  },[params.id])

  function addSet(){setSets(s=>[...s,{p1:"",p2:""}])}
  function removeSet(i:number){setSets(s=>s.filter((_,j)=>j!==i))}
  function updateSet(i:number,side:"p1"|"p2",val:string){setSets(s=>s.map((x,j)=>j===i?{...x,[side]:val}:x))}

  function handleDispute(){
    if(!match) return
    const scoreStr = match.sets ? match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ") : "—"
    const subject = `Ergebnis anfechten · Liga-Match ${match.id}`
    const mailBody = `Ich möchte das eingetragene Ergebnis anfechten.\n\nMatch-ID: ${match.id}\nSpieler: ${match.p1_name} vs ${match.p2_name}\nEingetragenes Ergebnis: ${scoreStr}\n\nBegründung:\n`
    window.location.href = `mailto:info@pingponglounge.ch?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`
  }

  function validateSets():{valid:boolean,winner:string|null,parsedSets:Array<{p1:number,p2:number}>}{
    if(!match) return {valid:false,winner:null,parsedSets:[]}
    const parsed=sets.map(s=>({p1:parseInt(s.p1)||0,p2:parseInt(s.p2)||0})).filter(s=>s.p1>0||s.p2>0)
    if(parsed.length<3) return {valid:false,winner:null,parsedSets:parsed}
    const p1wins=parsed.filter(s=>s.p1>s.p2).length
    const p2wins=parsed.filter(s=>s.p2>s.p1).length
    const winner=p1wins>p2wins?match.p1_id:match.p2_id
    return {valid:p1wins>=3||p2wins>=3,winner,parsedSets:parsed}
  }

  async function handleSubmit(){
    const {valid,winner,parsedSets}=validateSets()
    if(!valid){setError("Ungültiges Ergebnis — mindestens 3 Sätze, einer muss 3 Sätze gewonnen haben");return}
    setSaving(true);setError("")
    const res=await fetch("/api/liga/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:params.id,sets:parsedSets,winner_id:winner})})
    if(res.ok){setSubmitted(true);setSaving(false)}
    else{const d=await res.json();setError(d.error||"Fehler");setSaving(false)}
  }

  async function handleNextMatch(){
    if(!match) return
    setSaving(true)
    const oppId=match.p1_id===userId?match.p2_id:match.p1_id
    const res=await fetch("/api/liga/direct-match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:match.season_id,opponent_id:oppId})})
    const d=await res.json().catch(()=>({}))
    if(res.ok&&d.id){setNextMatchId(d.id);window.location.href=`/liga/match/${d.id}`}
    else{setError(d.error||"Fehler");setSaving(false)}
  }

  async function handleConfirm(){
    setSaving(true)
    const res=await fetch("/api/liga/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:params.id})})
    if(res.ok){window.location.href=`/liga/${match?.season_id}`}
    else{const d=await res.json();setError(d.error||"Fehler");setSaving(false)}
  }

  if(loading||!match) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:MUT}}>Lädt …</p></main>

  const isP1=match.p1_id===userId
  const isP2=match.p2_id===userId
  const sw=match.sets?{p1:match.sets.filter(s=>s.p1>s.p2).length,p2:match.sets.filter(s=>s.p2>s.p1).length}:{p1:0,p2:0}
  const matchUrl=typeof window!=="undefined"?`${window.location.origin}/liga/match/${match.id}`:""
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(matchUrl)}&color=39FF14&bgcolor=15161A&margin=8`

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:440,width:"100%"}}>
        <Link href={`/liga/${match.season_id}`} style={{...backLink,display:"block",marginBottom:24}}>← Liga</Link>

        <div style={{...eyebrow,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Runde {match.round}</div>

        {/* Players */}
        <div style={{...cardPad,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:900,color:match.winner_id===match.p1_id?GREEN:W}}>{match.p1_name}</span>
          {match.status==="confirmed"?(
            <span style={{fontSize:24,fontWeight:900,color:W,background:CELL,borderRadius:8,padding:"6px 14px"}}>{sw.p1}:{sw.p2}</span>
          ):<span style={{...meta}}>vs</span>}
          <span style={{fontSize:18,fontWeight:900,color:match.winner_id===match.p2_id?GREEN:W}}>{match.p2_name}</span>
        </div>

        {/* QR Code — nur wenn Match noch offen */}
        {match.status!=="confirmed"&&!isP1&&!isP2&&(
          <div style={{...cardPad,textAlign:"center",marginBottom:16}}>
            <div style={{...eyebrow,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:700,marginBottom:12}}>QR-Code für Spieler</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Match QR" style={{width:160,height:160,borderRadius:10,display:"block",margin:"0 auto 10px"}}/>
            <p style={{...body}}>Spieler scannen diesen Code, um das Resultat einzutragen.</p>
          </div>
        )}

        {/* Confirmed state */}
        {match.status==="confirmed"&&(
          <div style={{...cardActive,padding:20,textAlign:"center"}}>
            <p style={{fontSize:16,fontWeight:700,color:GREEN,marginBottom:8}}>✓ Bestätigt</p>
            {match.sets&&<p style={{...meta}}>{match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ")}</p>}
          </div>
        )}

        {/* Submitted success state */}
        {(isP1||isP2)&&submitted&&(
          <div style={{...cardActive,padding:24,textAlign:"center",marginTop:8}}>
            <p style={{fontSize:32,marginBottom:8}}>✅</p>
            <p style={{fontSize:16,fontWeight:700,color:GREEN,marginBottom:4}}>Ergebnis eingereicht!</p>
            <p style={{...meta,marginBottom:20}}>
              Warte auf Bestätigung von {isP1?match.p2_name:match.p1_name}.
            </p>
            <button onClick={handleNextMatch} disabled={saving} style={{...btn,marginBottom:10,opacity:saving?0.6:1,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"Erstelle Match …":"Weiteres Spiel eintragen"}
            </button>
            {error&&<p style={{color:DANGER,fontSize:13,marginBottom:8}}>{error}</p>}
            <Link href={`/liga/${match.season_id}`} style={{...btnGhost,display:"block",textAlign:"center",textDecoration:"none"}}>Zurück zur Liga</Link>
          </div>
        )}

        {/* P1: enter result */}
        {(isP1||isP2)&&match.status==="pending"&&!submitted&&(
          <div>
            <div style={{...label,marginBottom:12}}>Ergebnis eingeben (Sätze)</div>
            {sets.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{...meta,width:56,flexShrink:0}}>Satz {i+1}</span>
                <input value={s.p1} onChange={e=>updateSet(i,"p1",e.target.value)} placeholder="11" style={{...input,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" min="0" max="20"/>
                <span style={{color:MUT,fontSize:16}}>:</span>
                <input value={s.p2} onChange={e=>updateSet(i,"p2",e.target.value)} placeholder="8" style={{...input,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" min="0" max="20"/>
                {i>=3&&<button onClick={()=>removeSet(i)} style={{background:"none",border:"none",color:MUT,cursor:"pointer",fontSize:16}}>×</button>}
              </div>
            ))}
            {sets.length<5&&<button onClick={addSet} style={{width:"100%",background:"none",border:`1px dashed ${CELL}`,borderRadius:8,padding:"10px",color:MUT,cursor:"pointer",fontSize:13,marginBottom:12}}>+ Satz hinzufügen</button>}
            {error&&<p style={{color:DANGER,fontSize:13,marginBottom:8}}>{error}</p>}
            <button onClick={handleSubmit} disabled={saving} style={{...btn,width:"100%",opacity:saving?0.6:1,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"Wird gespeichert …":"Ergebnis einreichen"}
            </button>
          </div>
        )}

        {/* P2: confirm */}
        {isP2&&match.status==="p1_entered"&&(
          <div>
            <div style={{...cardPad,marginBottom:16}}>
              <p style={{fontSize:13,color:"#FACC15",fontWeight:700,marginBottom:4}}>⏳ Ergebnis eingereicht</p>
              <p style={{...meta}}>{match.p1_name} hat folgendes Ergebnis eingetragen:</p>
              {match.sets&&<p style={{fontSize:15,fontWeight:700,color:W,marginTop:8}}>{match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ")}</p>}
            </div>
            {error&&<p style={{color:DANGER,fontSize:13,marginBottom:8}}>{error}</p>}
            <button onClick={handleConfirm} disabled={saving} style={{...btn,width:"100%",marginBottom:8,opacity:saving?0.6:1,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"…":"✓ Ergebnis bestätigen"}
            </button>
            <button onClick={handleDispute} style={{...btnGhost,width:"100%"}}>Ergebnis anfechten</button>
          </div>
        )}

        {/* Waiting state for P1 */}
        {isP1&&match.status==="p1_entered"&&(
          <div style={{...cardPad,textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:8}}>⏳</p>
            <p style={{fontSize:15,fontWeight:700,color:W,marginBottom:4}}>Warten auf {match.p2_name}</p>
            <p style={{...meta}}>Automatisch bestätigt nach 24 h.</p>
          </div>
        )}
      </div>
    </main>
  )
}
