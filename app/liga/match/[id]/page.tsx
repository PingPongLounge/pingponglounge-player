"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#0E1014",C="#1A1D24",B="#1A1D24",M="rgba(255,255,255,0.66)",G="#39FF14",W="#FFFFFF"

type SetScore={p1:string,p2:string}
type MatchData={id:string,season_id:string,round:number,p1_id:string,p1_name:string,p2_id:string,p2_name:string,sets:Array<{p1:number,p2:number}>|null,winner_id:string|null,status:string}

export default function MatchPage({params}:{params:{id:string}}){
  const [match,setMatch]=useState<MatchData|null>(null)
  const [userId,setUserId]=useState<string|null>(null)
  const [sets,setSets]=useState<SetScore[]>([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}])
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")
  const [loading,setLoading]=useState(true)

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
    const body = `Ich möchte das eingetragene Ergebnis anfechten.\n\nMatch-ID: ${match.id}\nSpieler: ${match.p1_name} vs ${match.p2_name}\nEingetragenes Ergebnis: ${scoreStr}\n\nBegründung:\n`
    window.location.href = `mailto:info@pingponglounge.ch?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
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
    if(res.ok){window.location.href=`/liga/${match?.season_id}`}
    else{const d=await res.json();setError(d.error||"Fehler");setSaving(false)}
  }

  async function handleConfirm(){
    setSaving(true)
    const res=await fetch("/api/liga/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:params.id})})
    if(res.ok){window.location.href=`/liga/${match?.season_id}`}
    else{const d=await res.json();setError(d.error||"Fehler");setSaving(false)}
  }

  if(loading||!match) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:M}}>lädt...</p></main>

  const isP1=match.p1_id===userId
  const isP2=match.p2_id===userId
  const sw=match.sets?{p1:match.sets.filter(s=>s.p1>s.p2).length,p2:match.sets.filter(s=>s.p2>s.p1).length}:{p1:0,p2:0}
  const matchUrl=typeof window!=="undefined"?`${window.location.origin}/liga/match/${match.id}`:""
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(matchUrl)}&color=39FF14&bgcolor=15161A&margin=8`

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:440,width:"100%"}}>
        <Link href={`/liga/${match.season_id}`} style={{color:M,textDecoration:"none",fontSize:13,display:"block",marginBottom:24}}>← liga</Link>

        <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:8}}>runde {match.round}</p>

        {/* Players */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C,border:`1px solid ${B}`,borderRadius:14,padding:"16px",marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:900,color:match.winner_id===match.p1_id?G:W}}>{match.p1_name}</span>
          {match.status==="confirmed"?(
            <span style={{fontSize:24,fontWeight:900,color:W,background:B,borderRadius:8,padding:"6px 14px"}}>{sw.p1}:{sw.p2}</span>
          ):<span style={{fontSize:14,color:M}}>vs</span>}
          <span style={{fontSize:18,fontWeight:900,color:match.winner_id===match.p2_id?G:W}}>{match.p2_name}</span>
        </div>

        {/* QR Code — nur wenn Match noch offen */}
        {match.status!=="confirmed"&&!isP1&&!isP2&&(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"20px",textAlign:"center",marginBottom:16}}>
            <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:12}}>qr-code für spieler</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Match QR" style={{width:160,height:160,borderRadius:10,display:"block",margin:"0 auto 10px"}}/>
            <p style={{fontSize:12,color:M}}>spieler scannen diesen code um das resultat einzutragen</p>
          </div>
        )}

        {/* Confirmed state */}
        {match.status==="confirmed"&&(
          <div style={{background:`${G}15`,border:`1px solid ${G}40`,borderRadius:12,padding:"20px",textAlign:"center"}}>
            <p style={{fontSize:"16px",fontWeight:700,color:G,marginBottom:8}}>✓ bestätigt</p>
            {match.sets&&<p style={{fontSize:13,color:M}}>{match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ")}</p>}
          </div>
        )}

        {/* P1: enter result */}
        {(isP1||isP2)&&match.status==="pending"&&(
          <div>
            <p style={{fontSize:13,fontWeight:700,color:W,marginBottom:12}}>ergebnis eingeben (sätze)</p>
            {sets.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:12,color:M,width:56,flexShrink:0}}>satz {i+1}</span>
                <input value={s.p1} onChange={e=>updateSet(i,"p1",e.target.value)} placeholder="11" style={{flex:1,background:C,border:`1px solid ${B}`,borderRadius:8,padding:"10px",fontSize:18,fontWeight:700,color:W,outline:"none",textAlign:"center"}} type="number" min="0" max="20"/>
                <span style={{color:M,fontSize:16}}>:</span>
                <input value={s.p2} onChange={e=>updateSet(i,"p2",e.target.value)} placeholder="8" style={{flex:1,background:C,border:`1px solid ${B}`,borderRadius:8,padding:"10px",fontSize:18,fontWeight:700,color:W,outline:"none",textAlign:"center"}} type="number" min="0" max="20"/>
                {i>=3&&<button onClick={()=>removeSet(i)} style={{background:"none",border:"none",color:M,cursor:"pointer",fontSize:16}}>×</button>}
              </div>
            ))}
            {sets.length<5&&<button onClick={addSet} style={{width:"100%",background:"none",border:`1px dashed ${B}`,borderRadius:8,padding:"10px",color:M,cursor:"pointer",fontSize:13,marginBottom:12}}>+ satz hinzufügen</button>}
            {error&&<p style={{color:"#FF6666",fontSize:13,marginBottom:8}}>{error}</p>}
            <button onClick={handleSubmit} disabled={saving} style={{width:"100%",background:saving?B:"#fff",color:saving?M:"#0E1014",border:"none",borderRadius:10,padding:"16px",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",textTransform:"lowercase",letterSpacing:"0.02em"}}>
              {saving?"wird gespeichert...":"ergebnis einreichen"}
            </button>
          </div>
        )}

        {/* P2: confirm */}
        {isP2&&match.status==="p1_entered"&&(
          <div>
            <div style={{background:C,border:`1px solid #FACC1540`,borderRadius:12,padding:"16px",marginBottom:16}}>
              <p style={{fontSize:13,color:"#FACC15",fontWeight:700,marginBottom:4}}>⏳ ergebnis eingereicht</p>
              <p style={{fontSize:13,color:M}}>{match.p1_name} hat folgendes ergebnis eingetragen:</p>
              {match.sets&&<p style={{fontSize:15,fontWeight:700,color:W,marginTop:8}}>{match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ")}</p>}
            </div>
            {error&&<p style={{color:"#FF6666",fontSize:13,marginBottom:8}}>{error}</p>}
            <button onClick={handleConfirm} disabled={saving} style={{width:"100%",background:saving?B:"#fff",color:saving?M:"#0E1014",border:"none",borderRadius:10,padding:"16px",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",textTransform:"lowercase",letterSpacing:"0.02em",marginBottom:8}}>
              {saving?"...":"✓ ergebnis bestätigen"}
            </button>
            <button onClick={handleDispute} style={{width:"100%",background:"transparent",border:`1px solid #23272F`,color:W,borderRadius:10,padding:"14px",fontSize:13,cursor:"pointer",textTransform:"lowercase"}}>ergebnis anfechten</button>
          </div>
        )}

        {/* Waiting state for P1 */}
        {isP1&&match.status==="p1_entered"&&(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"20px",textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:8}}>⏳</p>
            <p style={{fontSize:15,fontWeight:700,color:W,marginBottom:4}}>warten auf {match.p2_name}</p>
            <p style={{fontSize:13,color:M}}>automatisch bestätigt nach 24h</p>
          </div>
        )}
      </div>
    </main>
  )
}