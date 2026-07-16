"use client"
import { useEffect, useState, use } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  BG, CARD, CELL, W, SUB, MUT, GREEN, DANGER, GRAD,
  cardPad, cardActive, btn, btnGhost, input, label,
  body, meta, eyebrow, backLink,
} from "@/app/theme"
import { MATCH_SPRUECHE } from "@/lib/rewards"

type SetScore={p1:string,p2:string}
type MatchData={id:string,season_id:string,round:number,p1_id:string,p1_name:string,p2_id:string,p2_name:string,sets:Array<{p1:number,p2:number}>|null,winner_id:string|null,status:string,entered_by:string|null}

// Next 16: params ist in Client Components IMMER ein Promise. Der synchrone
// Zugriff (matchId) lieferte undefined — die Seite hing ewig auf "Lädt …".
export default function MatchPage({params}:{params:Promise<{id:string}>}){
  const {id:matchId}=use(params)
  const [match,setMatch]=useState<MatchData|null>(null)
  const [userId,setUserId]=useState<string|null>(null)
  const [sets,setSets]=useState<SetScore[]>([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}])
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")
  const [loading,setLoading]=useState(true)
  const [submitted,setSubmitted]=useState(false)
  const [nextMatchId,setNextMatchId]=useState<string|null>(null)
  const [askComment,setAskComment]=useState(false)   // "Spiel kommentieren?"
  const [comment,setComment]=useState("")

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data:{user}}=await sb.auth.getUser()
      if(!user){window.location.href="/login";return}
      setUserId(user.id)
      const {data}=await sb.from("league_matches")
        .select("id,season_id,round,p1_id,p2_id,sets,winner_id,status,entered_by")
        .eq("id",matchId).maybeSingle()
      if(data){
        // Namen über public_profiles — RLS auf profiles gibt jedem nur die EIGENE
        // Zeile heraus, der Gegner hiess deshalb immer "?".
        const {data:names}=await sb.from("public_profiles").select("id,name").in("id",[data.p1_id,data.p2_id])
        const nameOf=(id:string)=>(names||[]).find(n=>n.id===id)?.name||"Spieler"
        setMatch({...data,p1_name:nameOf(data.p1_id),p2_name:nameOf(data.p2_id)} as MatchData)
      }
      setLoading(false)
    }
    load()
  },[matchId])

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
    const res=await fetch("/api/liga/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId,sets:parsedSets,winner_id:winner})})
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

  // Nach dem Bestätigen NICHT stumm zurückspringen: das Spiel steht jetzt im
  // Liga-Chat und will einen Spruch. Ein Tipp genügt.
  async function handleConfirm(){
    setSaving(true)
    const res=await fetch("/api/liga/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})})
    if(res.ok){setSaving(false);setAskComment(true)}
    else{const d=await res.json();setError(d.error||"Fehler");setSaving(false)}
  }

  async function postComment(text:string){
    const t=text.trim()
    if(!t||!match) return
    setSaving(true)
    await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({season_id:match.season_id,match_id:match.id,text:t})}).catch(()=>{})
    window.location.href=`/liga?chat=1`
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
        <Link href="/liga" style={{...backLink,display:"block",marginBottom:24}}>← Liga</Link>

        {/* EINE Karte: Namen, Satzstand und die einzelnen Sätze zusammen. Vorher
            stand das Ergebnis zweimal — oben "3:1" und darunter nochmal die
            Sätze in einer eigenen "Bestätigt"-Box. */}
        <div style={{...cardPad,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:18,fontWeight:900,color:match.winner_id===match.p1_id?GREEN:W}}>{match.p1_name}</span>
            {match.status==="confirmed"||match.status==="p1_entered"?(
              <span style={{fontSize:24,fontWeight:900,color:W,background:CELL,borderRadius:8,padding:"6px 14px"}}>{sw.p1}:{sw.p2}</span>
            ):<span style={{...meta}}>vs</span>}
            <span style={{fontSize:18,fontWeight:900,color:match.winner_id===match.p2_id?GREEN:W}}>{match.p2_name}</span>
          </div>
          {match.sets&&(match.status==="confirmed"||match.status==="p1_entered")&&(
            <div style={{textAlign:"center",fontSize:13,color:MUT,marginTop:10}}>{match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ")}</div>
          )}
          {match.status==="confirmed"&&(
            <div style={{textAlign:"center",fontSize:14,fontWeight:800,color:GREEN,marginTop:12}}>✓ Bestätigt</div>
          )}
        </div>

        {/* QR-Code — nur für einen Aussenstehenden, der ein offenes Match einträgt */}
        {match.status!=="confirmed"&&match.status!=="p1_entered"&&!isP1&&!isP2&&(
          <div style={{...cardPad,textAlign:"center",marginBottom:16}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR-Code" style={{width:160,height:160,borderRadius:10,display:"block",margin:"0 auto 10px"}}/>
            <p style={{...body}}>Zum Eintragen scannen.</p>
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
              {saving?"…":"Noch ein Spiel eintragen"}
            </button>
            {error&&<p style={{color:DANGER,fontSize:13,marginBottom:8}}>{error}</p>}
            <Link href="/liga" style={{...btnGhost,display:"block",textAlign:"center",textDecoration:"none"}}>Zurück zur Liga</Link>
          </div>
        )}

        {/* Ergebnis eintragen — auch bei "accepted". direct-match legt Matches in
            genau diesem Status an; das Formular hing nur an "pending", weshalb
            "Weiteres Spiel eintragen" auf einer leeren Seite endete. */}
        {(isP1||isP2)&&(match.status==="pending"||match.status==="accepted")&&!submitted&&(
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

        {/* Bestätigen darf, wer NICHT eingetragen hat — nicht "p2". Eintragen
            dürfen beide, also war der Button vorher regelmässig beim Falschen. */}
        {(isP1||isP2)&&match.status==="p1_entered"&&match.entered_by!==userId&&(
          <div>
            <div style={{...cardPad,marginBottom:16}}>
              <p style={{fontSize:13,color:"#FACC15",fontWeight:700,marginBottom:4}}>⏳ Ergebnis eingereicht</p>
              <p style={{...meta}}>{match.entered_by===match.p1_id?match.p1_name:match.p2_name} hat folgendes Ergebnis eingetragen:</p>
              {match.sets&&<p style={{fontSize:15,fontWeight:700,color:W,marginTop:8}}>{match.sets.map(s=>`${s.p1}:${s.p2}`).join(" · ")}</p>}
            </div>
            {error&&<p style={{color:DANGER,fontSize:13,marginBottom:8}}>{error}</p>}
            <button onClick={handleConfirm} disabled={saving} style={{...btn,width:"100%",marginBottom:8,opacity:saving?0.6:1,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"…":"✓ Ergebnis bestätigen"}
            </button>
            <button onClick={handleDispute} style={{...btnGhost,width:"100%"}}>Ergebnis anfechten</button>
          </div>
        )}

        {/* Wer eingetragen hat, wartet */}
        {(isP1||isP2)&&match.status==="p1_entered"&&match.entered_by===userId&&(
          <div style={{...cardPad,textAlign:"center"}}>
            <p style={{fontSize:32,marginBottom:8}}>⏳</p>
            <p style={{fontSize:15,fontWeight:700,color:W,marginBottom:4}}>Warten auf {isP1?match.p2_name:match.p1_name}</p>
            <p style={{...meta}}>Automatisch bestätigt nach 24 h.</p>
          </div>
        )}
      </div>

      {/* Spiel bestätigt → Spruch dazu. Das Spiel steht jetzt im Liga-Chat,
          und ein Match ohne Kommentar ist nur eine Zahl. */}
      {askComment&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:140,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{width:"100%",maxWidth:400,background:CARD,borderRadius:24,padding:"24px 20px",boxShadow:"0 30px 80px rgba(0,0,0,.6)"}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:GREEN,marginBottom:6}}>✓ Bestätigt</div>
            <div style={{fontSize:21,fontWeight:900,color:W,marginBottom:5}}>Spiel kommentieren?</div>
            <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16,lineHeight:1.5}}>
              Das Spiel steht im Liga-Chat — alle sehen es. Sag was dazu.
            </div>

            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
              {MATCH_SPRUECHE.map(s=>(
                <button key={s} onClick={()=>postComment(s)} disabled={saving}
                  style={{border:"1.4px solid transparent",borderRadius:999,padding:"9px 13px",fontSize:12.5,fontWeight:700,color:W,background:`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`,cursor:saving?"wait":"pointer",fontFamily:"inherit"}}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{display:"flex",gap:7}}>
              <input value={comment} onChange={e=>setComment(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")postComment(comment)}}
                placeholder="Oder schreib selbst …"
                style={{flex:1,minWidth:0,background:BG,border:`1px solid ${CELL}`,borderRadius:999,padding:"11px 14px",color:W,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={()=>postComment(comment)} disabled={saving||!comment.trim()}
                style={{width:44,flexShrink:0,borderRadius:999,border:"none",background:GRAD,color:"#06210F",fontSize:16,fontWeight:900,cursor:(saving||!comment.trim())?"not-allowed":"pointer",opacity:(saving||!comment.trim())?.4:1,fontFamily:"inherit"}}>→</button>
            </div>

            <button onClick={()=>{window.location.href=`/liga`}}
              style={{display:"block",width:"100%",marginTop:14,background:"none",border:"none",color:MUT,fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:6}}>
              Ohne Kommentar zurück
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
