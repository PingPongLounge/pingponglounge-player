"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import {
  BG, CARD, CELL, W, SUB, MUT, GREEN, LINE,
  gt, GRAD, card, levelBadge,
} from "@/app/theme"

const C=CARD, B=CELL, M=SUB
const SHADOW="0 1px 4px rgba(0,0,0,.14)"
const HERO="#14171E"

type Season={id:string,name:string,city:string,skill_class:string,status:string,max_players:number}
type Row={user_id:string,name:string,elo:number,level:string,real?:string|null}
type OpenMatch={id:string,status:string,iAmP1:boolean}
type Reactions={heart:number,fire:number,laugh:number,myReacts:string[]}
type Msg={id:string,user_id:string|null,name:string,text:string,kind?:string,match_id?:string,reactions:Reactions}

export default function LigaPage(){
  const [userId,setUserId]=useState<string|null>(null)
  const [myLevel,setMyLevel]=useState<string|null>(null)
  const [seasons,setSeasons]=useState<Season[]>([])
  const [city,setCity]=useState<string>("")
  const [seasonId,setSeasonId]=useState<string>("")
  const [rows,setRows]=useState<Row[]>([])
  const [count,setCount]=useState(0)
  const [myReg,setMyReg]=useState(false)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [toast,setToast]=useState("")
  const [showCity,setShowCity]=useState(false)
  const [openMatches,setOpenMatches]=useState<Record<string,OpenMatch>>({})
  // chat
  const [chatOpen,setChatOpen]=useState(false)
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [msg,setMsg]=useState("")
  const meRef=useRef<HTMLDivElement|null>(null)
  // Fordern-Popup
  const [fTarget,setFTarget]=useState<{id:string,name:string}|null>(null)
  const [fTab,setFTab]=useState<"challenge"|"result">("challenge")
  const [fDate,setFDate]=useState("")
  const [fTime,setFTime]=useState("")
  const [fMy,setFMy]=useState(0)
  const [fOpp,setFOpp]=useState(0)
  const [fRDate,setFRDate]=useState("")        // Wann wurde gespielt?
  const [fDone,setFDone]=useState<string[]>([]) // in dieser Session eingetragene Ergebnisse

  const flash=(t:string)=>{setToast(t);setTimeout(()=>setToast(""),2500)}

  // Saisons laden — getUser + Seasons parallel
  useEffect(()=>{(async()=>{
    const sb=createClient()
    const [{data:{user}},{data}]=await Promise.all([
      sb.auth.getUser(),
      sb.from("league_seasons").select("id,name,city,skill_class,status,max_players").in("status",["open","running"]).order("city").order("skill_class"),
    ])
    const ss=(data||[]) as Season[]
    setUserId(user?.id||null)
    setSeasons(ss)
    let lvl:string|null=null
    if(user){ const {data:pf}=await sb.from("profiles").select("level").eq("id",user.id).maybeSingle(); lvl=pf?.level||null; setMyLevel(lvl) }
    const proLvl=(parseInt(lvl||"0")||0)>=4
    let defCity=ss[0]?.city||""
    let defSeason=(ss.find(s=>s.city===defCity&&/5|6|7|pro/i.test(s.skill_class)===proLvl)||ss[0])?.id||""
    if(user){
      const {data:myRegs}=await sb.from("league_registrations").select("season_id").eq("player_id",user.id)
      const mySeason=ss.find(s=>(myRegs||[]).some(r=>r.season_id===s.id))
      if(mySeason){defCity=mySeason.city;defSeason=mySeason.id}
    }
    setCity(defCity); setSeasonId(defSeason); setLoading(false)
  })()},[])

  const loadStandings=useCallback(async(sid:string)=>{
    if(!sid) return
    const sb=createClient()
    const {data:regs}=await sb.from("league_registrations").select("player_id").eq("season_id",sid)
    const ids=(regs||[]).map(r=>r.player_id)
    setCount(ids.length)
    const isReg=!!userId&&ids.includes(userId)
    setMyReg(isReg)
    if(ids.length===0){setRows([]);return}
    const {data:profs}=await sb.from("public_profiles").select("id,name,elo,level,real_short").in("id",ids)
    const list=(profs||[]).map(p=>({user_id:p.id,name:p.name,elo:p.elo??1000,level:p.level||"",real:(p as {real_short?:string|null}).real_short})).sort((a,b)=>b.elo-a.elo)
    setRows(list)
    // Offene Matches des eingeloggten Spielers laden
    if(userId&&isReg){
      const {data:myMs}=await sb.from("league_matches")
        .select("id,p1_id,p2_id,status")
        .eq("season_id",sid)
        .in("status",["challenge_sent","accepted","pending","p1_entered"])
        .or(`p1_id.eq.${userId},p2_id.eq.${userId}`)
      const map:Record<string,OpenMatch>={}
      for(const m of myMs||[]){
        const oppId=m.p1_id===userId?m.p2_id:m.p1_id
        map[oppId]={id:m.id,status:m.status,iAmP1:m.p1_id===userId}
      }
      setOpenMatches(map)
    } else {
      setOpenMatches({})
    }
  },[userId])

  useEffect(()=>{ if(seasonId) loadStandings(seasonId) },[seasonId,loadStandings])

  // Überfällige Ergebnisse (24h ohne Reaktion) bestätigen — der Hobby-Plan erlaubt
  // nur EINEN täglichen Cron, deshalb prüfen wir zusätzlich beim Öffnen der Liga.
  useEffect(()=>{
    if(!seasonId) return
    ;(async()=>{
      try{
        const r=await fetch("/api/liga/tick",{method:"POST"})
        const j=await r.json().catch(()=>({}))
        if(j?.confirmed>0) loadStandings(seasonId)
      }catch{ /* egal — nur eine Aufräum-Aktion */ }
    })()
  },[seasonId,loadStandings])
  // zu meinem Rang scrollen
  useEffect(()=>{ if(rows.length&&meRef.current){ meRef.current.scrollIntoView({block:"center",behavior:"smooth"}) } },[rows])

  // Chat laden + Poll
  const loadChat=useCallback(async(sid:string)=>{
    const r=await fetch(`/api/liga/chat?season_id=${sid}`); if(r.ok){const j=await r.json();setMsgs(j.messages||[])}
  },[])
  useEffect(()=>{
    if(!chatOpen||!seasonId) return
    loadChat(seasonId)
    const t=setInterval(()=>loadChat(seasonId),5000)
    return ()=>clearInterval(t)
  },[chatOpen,seasonId,loadChat])

  async function join(){
    setBusy(true)
    const r=await fetch("/api/liga/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId})})
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("✓ Du bist dabei!");loadStandings(seasonId)} else flash(j.error||"Fehler")
    setBusy(false)
  }
  async function challenge(pid:string){
    const r=await fetch("/api/liga/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,challenged_id:pid})})
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("⚔️ Herausforderung gesendet!");loadStandings(seasonId)}
    else flash(j.error||"Fehler")
  }
  function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
  function openForder(r:Row){ setFTarget({id:r.user_id,name:r.name}); setFTab("challenge"); setFDate(""); setFTime(""); setFMy(0); setFOpp(0); setFRDate(today()); setFDone([]) }
  async function sendChallenge(){
    if(!fTarget) return
    setBusy(true)
    const r=await fetch("/api/liga/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,challenged_id:fTarget.id})})
    const j=await r.json().catch(()=>({}))
    if(r.ok){
      if(fDate||fTime){
        const when=[fDate,fTime].filter(Boolean).join(" ")
        await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:`⚔️ Herausforderung an ${fTarget.name} — Vorschlag: ${when}`})})
      }
      flash("⚔️ Herausforderung gesendet!"); setFTarget(null); loadStandings(seasonId)
    } else flash(j.error||"Fehler")
    setBusy(false)
  }
  async function sendResult(){
    if(!fTarget||!userId) return
    if(fMy===fOpp){ flash("Kein Unentschieden möglich"); return }
    setBusy(true)
    const dm=await fetch("/api/liga/direct-match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,opponent_id:fTarget.id})})
    const dj=await dm.json().catch(()=>({}))
    const matchId=dm.ok?dj.id:dj.existing_id
    if(!matchId){ flash(dj.error||"Fehler beim Anlegen"); setBusy(false); return }
    const sets=[...Array(fMy)].map(()=>({p1:11,p2:7})).concat([...Array(fOpp)].map(()=>({p1:7,p2:11})))
    const winner_id=fMy>fOpp?userId:fTarget.id
    const played_at=fRDate?new Date(`${fRDate}T20:00:00`).toISOString():undefined
    const rr=await fetch("/api/liga/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId,sets,winner_id,played_at})})
    const rj=await rr.json().catch(()=>({}))
    if(rr.ok){
      // Popup bleibt offen → direkt das nächste Ergebnis eintragen
      setFDone(d=>[...d,`${fMy}:${fOpp}`])
      setFMy(0); setFOpp(0)
      flash("✓ Eingetragen — warte auf Bestätigung")
      loadStandings(seasonId)
    }
    else flash(rj.error||"Fehler")
    setBusy(false)
  }
  async function acceptChallenge(matchId:string){
    const r=await fetch("/api/liga/challenge/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})})
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("✓ Angenommen — jetzt Spiel eintragen");loadStandings(seasonId)}
    else flash(j.error||"Fehler")
  }
  async function react(messageId:string,type:string){
    await fetch("/api/liga/message-react",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message_id:messageId,type})})
    loadChat(seasonId)
  }
  async function send(){
    const t=msg.trim(); if(!t) return
    setMsg("")
    await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:t})})
    loadChat(seasonId)
  }

  const cities=[...new Set(seasons.map(s=>s.city))]
  const citySeasons=seasons.filter(s=>s.city===city)
  const sel=seasons.find(s=>s.id===seasonId)
  const isPro=(s:Season)=>/5|6|7|pro/i.test(s.skill_class)
  const myIndex=rows.findIndex(r=>r.user_id===userId)
  const myRow=myIndex>=0?rows[myIndex]:null

  return (
    <main style={{minHeight:"100vh",background:BG,paddingBottom:90}}>
      {/* Topbar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:GRAD,position:"sticky",top:0,zIndex:10}}>
        <Link href="/entdecken" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none"><path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="#06210F" strokeWidth="3.6" strokeLinejoin="round"/><circle cx="63" cy="58" r="6.5" fill="#06210F"/></svg>
          <span style={{fontSize:13,fontWeight:900,letterSpacing:".20em",color:"#06210F"}}>PLAYER <span style={{fontWeight:600,color:"rgba(6,33,15,.72)"}}>LIGA</span></span>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setShowCity(v=>!v)} style={{background:"rgba(6,33,15,.15)",border:"none",color:"#06210F",fontSize:12,fontWeight:800,cursor:"pointer",borderRadius:10,padding:"7px 11px"}}>{city||"Stadt"} ▾</button>
          <button onClick={()=>setChatOpen(true)} aria-label="Chat" style={{width:36,height:36,borderRadius:10,background:"rgba(6,33,15,.15)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06210F" strokeWidth="2"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
          </button>
        </div>
      </div>

      {/* Stadt-Dropdown */}
      {showCity&&(
        <div onClick={()=>setShowCity(false)} style={{position:"fixed",inset:0,zIndex:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:54,right:14,background:"#14171C",border:`1px solid ${B}`,borderRadius:14,padding:6,minWidth:160}}>
            {cities.map(ci=>(
              <div key={ci} onClick={()=>{const proLvl=(parseInt(myLevel||"0")||0)>=4;const fs=seasons.find(s=>s.city===ci&&isPro(s)===proLvl)||seasons.find(s=>s.city===ci);setCity(ci);if(fs)setSeasonId(fs.id);setShowCity(false)}} style={{padding:"11px 12px",borderRadius:9,fontSize:14,fontWeight:ci===city?600:400,color:ci===city?GREEN:W,cursor:"pointer"}}>{ci}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:480,margin:"0 auto"}}>
        {/* Foto-Hero (Glattbrugg-Tische, ohne Leute) */}
        <div style={{position:"relative",height:190,margin:"14px 14px 0",borderRadius:24,overflow:"hidden",boxShadow:SHADOW}}>
          <img src="/gl-tische.jpg" alt="" style={{width:"100%",height:190,objectFit:"cover",display:"block"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(20,23,30,.15) 0%,rgba(20,23,30,.55) 55%,rgba(20,23,30,.9) 100%)"}}/>
          <div style={{position:"absolute",left:22,right:22,bottom:18}}>
            <div style={{fontSize:42,fontWeight:900,lineHeight:.88,textTransform:"uppercase",letterSpacing:"-.02em",color:W}}>Liga</div>
            <div style={{fontSize:13,color:SUB,fontWeight:300,marginTop:7}}>Steig auf · gewinne Punkte · fordere heraus</div>
          </div>
        </div>

        {loading?(
          <p style={{textAlign:"center",color:M,padding:"40px 0"}}>Lädt …</p>
        ):seasons.length===0?(
          <p style={{textAlign:"center",color:M,padding:"40px 16px"}}>Noch keine Liga aktiv.</p>
        ):(<>

          {/* Neu hier? — Erklärung (nur Nicht-Mitglieder) */}
          {!myReg&&(
            <div style={{padding:"4px 14px 0"}}>
              <div style={{borderRadius:24,padding:22,boxShadow:SHADOW,border:"1.5px solid transparent",background:`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`}}>
                <div style={{fontSize:11,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",...gt}}>Neu hier?</div>
                <div style={{fontSize:22,fontWeight:900,color:W,margin:"6px 0 16px"}}>So funktioniert die Liga</div>
                {([
                  ["1","Beitreten","Wähle Einstieg (Level 1–3) oder Pro (Level 4–7) — passend zu deinem Niveau."],
                  ["2","Spielen & fordern","Fordere andere aus deiner Klasse — jedes Resultat zählt."],
                  ["3","Aufsteigen","Gewinnst du, steigst du in der Rangliste und kletterst in deiner Klasse."],
                ] as [string,string,string][]).map(([n,t,d])=>(
                  <div key={n} style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:14}}>
                    <span style={{width:27,height:27,borderRadius:"50%",background:GRAD,color:"#06210F",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</span>
                    <div><div style={{fontSize:14.5,fontWeight:800,color:W}}>{t}</div><div style={{fontSize:12.5,color:MUT,marginTop:2,lineHeight:1.4}}>{d}</div></div>
                  </div>
                ))}
                <button onClick={join} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:6,background:GRAD,color:"#06210F",borderRadius:14,padding:15,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",border:"none",cursor:busy?"not-allowed":"pointer",opacity:busy?.6:1}}>{busy?"…":"Liga beitreten"}</button>
              </div>
            </div>
          )}

          {/* Deine Position (nur Mitglieder) */}
          {myReg&&myRow&&(
            <div style={{padding:"4px 14px 0"}}>
              <div style={{background:HERO,borderRadius:22,padding:"20px 22px",boxShadow:SHADOW,display:"flex",alignItems:"center",gap:16}}>
                <div style={{fontSize:52,fontWeight:900,lineHeight:.85,letterSpacing:"-.03em",...gt}}>#{myIndex+1}</div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:MUT}}>Deine Position · {sel?isPro(sel)?"Pro":"Einstieg":""}</div>
                  <div style={{fontSize:14,color:SUB,fontWeight:300,marginTop:3}}>{myRow.level?`Level ${myRow.level}`:(sel?.skill_class?`Level ${sel.skill_class}`:'')} · ELO {myRow.elo}</div>
                </div>
              </div>
            </div>
          )}

          {/* Rangliste */}
          <div style={{padding:"16px 14px 0"}}>
            <div style={{...card,borderRadius:24,padding:"20px 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:6}}>
                <img src="/icons/liga.svg" alt="" style={{width:30,height:30}}/>
                <span style={{fontSize:19,fontWeight:800,letterSpacing:".01em",color:W}}>Rangliste · {count} Spieler</span>
              </div>
              <div style={{maxHeight:420,overflowY:"auto"}}>
                {Array.from({length:50}).map((_,i)=>{
                  const r=rows[i]
                  if(!r){
                    return(
                      <div key={`empty-${i}`} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 8px",borderTop:i===0?"none":`1px solid ${LINE}`,opacity:.38}}>
                        <span style={{width:26,textAlign:"center",fontSize:15,fontWeight:900,color:MUT}}>{i+1}</span>
                        <div style={{flex:1,minWidth:0}}><span style={{fontSize:14,fontWeight:500,color:MUT}}>frei</span></div>
                      </div>
                    )
                  }
                  const me=r.user_id===userId
                  return(
                    <div key={r.user_id} ref={me?meRef:null} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 8px",borderTop:i===0?"none":`1px solid ${LINE}`,...(me?{background:"rgba(57,255,20,.07)",borderRadius:12}:{})}}>
                      <span style={{width:26,textAlign:"center",fontSize:15,fontWeight:900,...(i<3?gt:{color:SUB})}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:15,fontWeight:800,color:W}}>{r.name}{me&&<span style={{fontSize:8,border:`1px solid ${MUT}`,borderRadius:999,padding:"1px 6px",marginLeft:7,color:SUB}}>Du</span>}</span>
                        {r.real&&<div style={{fontSize:11,color:MUT,fontWeight:500,marginTop:1}}>{r.real}</div>}
                      </div>
                      {r.level&&<span style={levelBadge(r.level)}>L{r.level}</span>}
                      <span style={{fontSize:14,fontWeight:800,...(me?gt:{color:SUB})}}>{r.elo}</span>
                      {!me&&myReg&&(()=>{
                        const om=openMatches[r.user_id]
                        const btnBase:React.CSSProperties={border:"1.4px solid transparent",borderRadius:10,padding:"7px 10px",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",color:W,background:`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}
                        if(!om) return <button onClick={()=>openForder(r)} style={btnBase}>Fordern</button>
                        if(om.status==="challenge_sent"&&!om.iAmP1) return <button onClick={()=>acceptChallenge(om.id)} style={{...btnBase,background:GRAD,color:"#06210F"}}>Annehmen ✓</button>
                        if(om.status==="challenge_sent"&&om.iAmP1) return <span style={{fontSize:10,fontWeight:700,color:MUT,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".04em"}}>Ausstehend</span>
                        if(om.status==="accepted"||om.status==="pending") return <Link href={`/liga/match/${om.id}`} style={{...btnBase,textDecoration:"none",display:"inline-block"}}>Spiel eintragen →</Link>
                        if(om.status==="p1_entered"&&!om.iAmP1) return <Link href={`/liga/match/${om.id}`} style={{...btnBase,background:GRAD,color:"#06210F",textDecoration:"none",display:"inline-block"}}>Bestätigen ✓</Link>
                        // Ergebnis wartet auf Bestätigung → weiteres Ergebnis trotzdem erlauben
                        return <button onClick={()=>openForder(r)} style={btnBase}>Fordern</button>
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>)}
      </div>

      {/* Fordern-Popup */}
      {fTarget&&(
        <div onClick={()=>setFTarget(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:CARD,borderRadius:24,padding:"24px 20px",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.6)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:20,fontWeight:900,color:W}}>vs {fTarget.name}</div>
              <button onClick={()=>setFTarget(null)} style={{background:"none",border:"none",color:MUT,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>

            <div style={{display:"flex",gap:8,margin:"16px 0 18px"}}>
              {(["challenge","result"] as const).map(t=>{
                const on=fTab===t
                return <button key={t} onClick={()=>setFTab(t)} style={{flex:1,borderRadius:12,padding:"11px 8px",fontSize:12.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit",color:W,border:"1.5px solid transparent",background:on?`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`:CELL}}>{t==="challenge"?"Herausfordern":"Ergebnis eintragen"}</button>
              })}
            </div>

            {fTab==="challenge"?(
              <>
                <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Schlag eine Zeit vor — {fTarget.name} bekommt die Anfrage.</div>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Datum</div>
                    <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={{width:"100%",background:"#20242C",border:`1px solid ${CELL}`,borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Zeit</div>
                    <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={{width:"100%",background:"#20242C",border:`1px solid ${CELL}`,borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                </div>
                <button onClick={sendChallenge} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:22,background:GRAD,color:"#06210F",borderRadius:14,padding:16,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",border:"none",cursor:busy?"wait":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"…":"Anfrage senden"}</button>
              </>
            ):(
              <>
                <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Schon gespielt? Trag die Sätze ein — {fTarget.name} bestätigt, dann zählt&apos;s für ELO &amp; Rangliste.</div>

                <div style={{marginBottom:18}}>
                  <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Wann gespielt?</div>
                  <input type="date" max={today()} value={fRDate} onChange={e=>setFRDate(e.target.value)} style={{width:"100%",background:"#20242C",border:`1px solid ${CELL}`,borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                </div>

                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:14}}>
                  {([["Du",fMy,setFMy],[fTarget.name,fOpp,setFOpp]] as [string,number,(n:number)=>void][]).map(([lab,val,set],idx)=>(
                    <>
                      {idx===1&&<span style={{fontSize:30,fontWeight:900,color:MUT,paddingBottom:4}}>:</span>}
                      <div key={idx} style={{textAlign:"center"}}>
                        <div style={{fontSize:11,color:MUT,fontWeight:700,textTransform:"uppercase",marginBottom:9,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lab}</div>
                        <div style={{display:"flex",alignItems:"center",gap:9}}>
                          <button onClick={()=>set(Math.max(0,val-1))} style={{width:34,height:34,borderRadius:"50%",background:CELL,border:"none",color:W,fontSize:20,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>−</button>
                          <span style={{fontSize:36,fontWeight:900,width:34,textAlign:"center",...gt}}>{val}</span>
                          <button onClick={()=>set(Math.min(7,val+1))} style={{width:34,height:34,borderRadius:"50%",background:CELL,border:"none",color:W,fontSize:20,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+</button>
                        </div>
                      </div>
                    </>
                  ))}
                </div>
                <button onClick={sendResult} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:24,background:GRAD,color:"#06210F",borderRadius:14,padding:16,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",border:"none",cursor:busy?"wait":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"…":fDone.length?"Weiteres Ergebnis absenden":"Ergebnis absenden"}</button>

                {fDone.length>0&&(
                  <div style={{marginTop:16,background:CELL,borderRadius:14,padding:"13px 14px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:8}}>Eingetragen ({fDone.length})</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {fDone.map((s,i)=>(
                        <span key={i} style={{fontSize:13,fontWeight:800,color:W,background:"#20242C",borderRadius:8,padding:"5px 10px"}}>{s}</span>
                      ))}
                    </div>
                    <div style={{fontSize:11.5,color:SUB,fontWeight:300,marginTop:9,lineHeight:1.5}}>{fTarget.name} bekommt eine E-Mail und hat 24 Std. Zeit zu bestätigen — danach zählt das Ergebnis automatisch. Du kannst gleich den nächsten Match eintragen.</div>
                    <button onClick={()=>setFTarget(null)} style={{display:"block",width:"100%",textAlign:"center",marginTop:11,background:"none",border:`1px solid ${MUT}`,borderRadius:12,padding:11,fontSize:13,fontWeight:800,color:W,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit"}}>Fertig</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat */}
      {chatOpen&&(
        <div onClick={()=>setChatOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:50,display:"flex",justifyContent:"flex-end"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG,borderLeft:`1px solid ${B}`,height:"100%",width:"83%",maxWidth:380,display:"flex",flexDirection:"column",boxShadow:"-22px 0 50px rgba(0,0,0,.55)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 16px",borderBottom:`1px solid ${B}`}}>
              <span style={{fontSize:15,fontWeight:600,color:W}}>Liga-Chat · {sel?isPro(sel)?"Pro":"Einstieg":""}</span>
              <button onClick={()=>setChatOpen(false)} style={{background:"none",border:"none",color:M,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
              {msgs.length===0?<p style={{textAlign:"center",color:MUT,fontSize:13,marginTop:20}}>Noch keine Nachrichten — schreib die erste 👋</p>:msgs.map(m=>{
                if(m.kind==="match"){
                  let d:{winner:string,loser:string,wSets:number,lSets:number,detail:string}|null=null
                  try{d=JSON.parse(m.text)}catch{/**/}
                  const r=m.reactions
                  return(
                    <div key={m.id} style={{alignSelf:"stretch"}}>
                      <div style={{background:"linear-gradient(135deg,rgba(57,255,20,.10),rgba(31,209,196,.07))",border:"1px solid rgba(57,255,20,.18)",borderRadius:14,padding:"11px 14px"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"rgba(57,255,20,.7)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:5}}>🏓 Match bestätigt</div>
                        {d&&<>
                          <div style={{fontSize:14,fontWeight:800,color:W,marginBottom:2}}>{d.winner} <span style={{color:"rgba(57,255,20,.9)"}}>schlägt</span> {d.loser}</div>
                          <div style={{fontSize:12,color:MUT,marginBottom:8}}>{d.wSets}:{d.lSets} Sätze{d.detail?` · ${d.detail}`:""}</div>
                        </>}
                        <div style={{display:"flex",gap:6}}>
                          {(["heart","fire","laugh"] as const).map(type=>{
                            const emoji=type==="heart"?"❤️":type==="fire"?"🔥":"😄"
                            const cnt=r[type]
                            const active=r.myReacts.includes(type)
                            return(
                              <button key={type} onClick={()=>react(m.id,type)} style={{display:"flex",alignItems:"center",gap:4,background:active?"rgba(57,255,20,.15)":"rgba(255,255,255,.06)",border:active?"1px solid rgba(57,255,20,.4)":"1px solid rgba(255,255,255,.08)",borderRadius:99,padding:"4px 10px",fontSize:13,cursor:"pointer",color:W,fontFamily:"inherit"}}>
                                <span>{emoji}</span>
                                {cnt>0&&<span style={{fontSize:11,fontWeight:700,color:active?"#39FF14":MUT}}>{cnt}</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                }
                const mine=m.user_id===userId
                return(
                  <div key={m.id} style={{maxWidth:"80%",alignSelf:mine?"flex-end":"flex-start"}}>
                    {!mine&&<div style={{fontSize:10,color:MUT,margin:"0 0 3px 4px"}}>{m.name}</div>}
                    <div style={{background:mine?"linear-gradient(135deg,rgba(57,255,20,.18),rgba(31,209,196,.10))":C,border:"none",borderRadius:14,padding:"9px 12px",fontSize:13,fontWeight:500,color:W}}>{m.text}</div>
                  </div>
                )
              })}
            </div>
            {myReg?(
              <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:`1px solid ${B}`}}>
                <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Nachricht an die Liga …" style={{flex:1,background:C,border:`1px solid ${B}`,borderRadius:999,padding:"11px 14px",color:W,fontSize:13,outline:"none"}}/>
                <button onClick={send} style={{width:42,borderRadius:999,border:"1.5px solid transparent",background:`linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box`,color:W,fontWeight:800,cursor:"pointer"}}>→</button>
              </div>
            ):(
              <p style={{padding:"14px",textAlign:"center",color:M,fontSize:12}}>Tritt der Liga bei, um mitzuschreiben.</p>
            )}
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:84,left:0,right:0,display:"flex",justifyContent:"center",zIndex:120}}><div style={{background:CARD,border:"none",color:W,borderRadius:999,padding:"10px 18px",fontSize:13}}>{toast}</div></div>}
      <BottomNav />
    </main>
  )
}
