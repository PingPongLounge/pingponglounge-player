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
type Row={user_id:string,name:string,elo:number,level:string}
type OpenMatch={id:string,status:string,iAmP1:boolean}
type Reactions={heart:number,fire:number,laugh:number,myReacts:string[]}
type Msg={id:string,user_id:string|null,name:string,text:string,kind?:string,match_id?:string,reactions:Reactions}

export default function LigaPage(){
  const [userId,setUserId]=useState<string|null>(null)
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
    let defCity=ss[0]?.city||""
    let defSeason=ss[0]?.id||""
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
    const {data:profs}=await sb.from("public_profiles").select("id,name,elo,level").in("id",ids)
    const list=(profs||[]).map(p=>({user_id:p.id,name:p.name,elo:p.elo??1000,level:p.level||""})).sort((a,b)=>b.elo-a.elo)
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
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`1px solid ${B}`,background:"#0B0D10",position:"sticky",top:0,zIndex:10}}>
        <Link href="/entdecken" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14"/><stop offset="1" stopColor="#1FD1C4"/></linearGradient></defs><path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#lg)" strokeWidth="3.4" strokeLinejoin="round"/><circle cx="63" cy="58" r="6.5" fill="url(#lg)"/></svg>
          <span style={{fontSize:13,fontWeight:800,letterSpacing:".20em",...gt}}>PLAYER <span style={{fontWeight:500,color:SUB}}>LIGA</span></span>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setShowCity(v=>!v)} style={{background:"none",border:"none",color:M,fontSize:12,cursor:"pointer"}}>📍 {city||"Stadt"} ▾</button>
          <button onClick={()=>setChatOpen(true)} aria-label="Chat" style={{width:36,height:36,borderRadius:10,background:C,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="1.8"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
          </button>
        </div>
      </div>

      {/* Stadt-Dropdown */}
      {showCity&&(
        <div onClick={()=>setShowCity(false)} style={{position:"fixed",inset:0,zIndex:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:54,right:14,background:"#14171C",border:`1px solid ${B}`,borderRadius:14,padding:6,minWidth:160}}>
            {cities.map(ci=>(
              <div key={ci} onClick={()=>{const fs=seasons.find(s=>s.city===ci);setCity(ci);if(fs)setSeasonId(fs.id);setShowCity(false)}} style={{padding:"11px 12px",borderRadius:9,fontSize:14,fontWeight:ci===city?600:400,color:ci===city?GREEN:W,cursor:"pointer"}}>{ci}</div>
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
            <div style={{fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",color:SUB}}>Player · Liga</div>
            <div style={{fontSize:42,fontWeight:900,lineHeight:.88,textTransform:"uppercase",letterSpacing:"-.02em",color:W,marginTop:5}}>Liga</div>
            <div style={{fontSize:13,color:SUB,fontWeight:300,marginTop:7}}>Steig auf · gewinne Punkte · fordere heraus</div>
          </div>
        </div>

        {loading?(
          <p style={{textAlign:"center",color:M,padding:"40px 0"}}>Lädt …</p>
        ):seasons.length===0?(
          <p style={{textAlign:"center",color:M,padding:"40px 16px"}}>Noch keine Liga aktiv.</p>
        ):(<>
          {/* Liga-Tabs */}
          <div style={{display:"flex",gap:8,padding:"12px 14px 6px"}}>
            {citySeasons.map(s=>{
              const on=s.id===seasonId
              const tabStyle:React.CSSProperties=on?{flex:1,borderRadius:12,padding:"10px 8px",textAlign:"center",cursor:"pointer",border:"1.5px solid transparent",background:`linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box`}:{flex:1,borderRadius:12,padding:"10px 8px",textAlign:"center",cursor:"pointer",border:"none",background:C}
              return(
                <button key={s.id} onClick={()=>setSeasonId(s.id)} style={tabStyle}>
                  <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:".03em",color:W}}>{isPro(s)?"Pro":"Einstieg"}</div>
                  <div style={{fontSize:9.5,color:MUT,marginTop:2}}>Level {s.skill_class}</div>
                  <div style={{fontSize:9,fontWeight:600,marginTop:4,color:MUT}}>{isPro(s)?`${count}/${s.max_players}`:"offen"}</div>
                </button>
              )
            })}
          </div>
          <div style={{fontSize:11,color:SUB,fontWeight:300,padding:"4px 16px 8px"}}>{sel?.city} · {sel?.status==="running"?"Saison läuft":"Anmeldung offen"} · zusammen, klar getrennt</div>

          {/* Neu hier? — Erklärung (nur Nicht-Mitglieder) */}
          {!myReg&&(
            <div style={{padding:"4px 14px 0"}}>
              <div style={{borderRadius:24,padding:22,boxShadow:SHADOW,border:"1.5px solid transparent",background:`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`}}>
                <div style={{fontSize:11,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",...gt}}>Neu hier?</div>
                <div style={{fontSize:22,fontWeight:900,color:W,margin:"6px 0 16px"}}>So funktioniert die Liga</div>
                {([
                  ["1","Beitreten","Wähle Einstieg (Level 1–4) oder Pro (Level 5–7) — passend zu deinem Niveau."],
                  ["2","Spielen & fordern","Fordere andere aus deiner Klasse — jedes Resultat zählt."],
                  ["3","Aufsteigen","Gewinnst du, steigst du in der Rangliste und sammelst PingPoints."],
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
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:MUT}}>Deine Position</div>
                  <div style={{fontSize:14,color:SUB,fontWeight:300,marginTop:3}}>{myRow.level?`Level ${myRow.level}`:(sel?.skill_class?`Level ${sel.skill_class}`:'')} · ELO {myRow.elo}</div>
                </div>
              </div>
            </div>
          )}

          {/* Rangliste */}
          <div style={{padding:"16px 14px 0"}}>
            <div style={{...card,borderRadius:24,padding:"20px 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:6}}>
                <img src="/icons/liga.svg" alt="" style={{width:18,height:18}}/>
                <span style={{fontSize:12,fontWeight:700,letterSpacing:".24em",textTransform:"uppercase",color:MUT}}>Rangliste · {count} Spieler</span>
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
                        <span style={{fontSize:15,fontWeight:700,color:W}}>{r.name}{me&&<span style={{fontSize:8,border:`1px solid ${MUT}`,borderRadius:999,padding:"1px 6px",marginLeft:7,color:SUB}}>Du</span>}</span>
                      </div>
                      {r.level&&<span style={levelBadge(r.level)}>L{r.level}</span>}
                      <span style={{fontSize:14,fontWeight:800,...(me?gt:{color:SUB})}}>{r.elo}</span>
                      {!me&&myReg&&(()=>{
                        const om=openMatches[r.user_id]
                        const btnBase:React.CSSProperties={border:"1.4px solid transparent",borderRadius:10,padding:"7px 10px",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",color:W,background:`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}
                        if(!om) return <button onClick={()=>challenge(r.user_id)} style={btnBase}>Herausforderung senden</button>
                        if(om.status==="challenge_sent"&&!om.iAmP1) return <button onClick={()=>acceptChallenge(om.id)} style={{...btnBase,background:GRAD,color:"#06210F"}}>Annehmen ✓</button>
                        if(om.status==="challenge_sent"&&om.iAmP1) return <span style={{fontSize:10,color:MUT,whiteSpace:"nowrap"}}>⏳ Ausstehend</span>
                        if(om.status==="accepted"||om.status==="pending") return <Link href={`/liga/match/${om.id}`} style={{...btnBase,textDecoration:"none",display:"inline-block"}}>Spiel eintragen →</Link>
                        if(om.status==="p1_entered"&&!om.iAmP1) return <Link href={`/liga/match/${om.id}`} style={{...btnBase,background:GRAD,color:"#06210F",textDecoration:"none",display:"inline-block"}}>Bestätigen ✓</Link>
                        return <span style={{fontSize:10,color:MUT,whiteSpace:"nowrap"}}>⏳ Warte</span>
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>)}
      </div>

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
