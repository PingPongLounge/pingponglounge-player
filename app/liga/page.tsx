"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import {
  BG, CARD, CELL, W, SUB, MUT, GREEN, LINE,
  gt, GRAD, card, btn, levelBadge,
} from "@/app/theme"

const C=CARD, B=CELL, M=SUB

type Season={id:string,name:string,city:string,skill_class:string,status:string,max_players:number}
type Row={user_id:string,name:string,elo:number,level:string}

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
  // chat
  const [chatOpen,setChatOpen]=useState(false)
  const [msgs,setMsgs]=useState<{id:string,user_id:string|null,name:string,text:string,kind?:string}[]>([])
  const [msg,setMsg]=useState("")
  const meRef=useRef<HTMLDivElement|null>(null)

  const flash=(t:string)=>{setToast(t);setTimeout(()=>setToast(""),2500)}

  // Saisons laden
  useEffect(()=>{(async()=>{
    const sb=createClient()
    const {data:{user}}=await sb.auth.getUser()
    setUserId(user?.id||null)
    const {data}=await sb.from("league_seasons").select("id,name,city,skill_class,status,max_players").in("status",["open","running"]).order("city").order("skill_class")
    const ss=(data||[]) as Season[]
    setSeasons(ss)
    // Default-Stadt: wo der User angemeldet ist, sonst erste
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
    setMyReg(!!userId&&ids.includes(userId))
    if(ids.length===0){setRows([]);return}
    const {data:profs}=await sb.from("public_profiles").select("id,name,elo,level").in("id",ids)
    const list=(profs||[]).map(p=>({user_id:p.id,name:p.name,elo:p.elo??1000,level:p.level||""})).sort((a,b)=>b.elo-a.elo)
    setRows(list)
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
    flash(r.ok?"⚔️ Herausforderung gesendet!":(j.error||"Fehler"))
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
  const isPro=(s:Season)=>/advanced|elite|pro/i.test(s.skill_class)
  const medal=(i:number)=>i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`

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
        {/* Foto-Hero */}
        <div style={{position:"relative",height:130}}>
          <img src="/liga-hero.jpg" alt="" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(14,16,19,.25),rgba(14,16,19,.9))"}}/>
          <div style={{position:"absolute",left:16,bottom:12}}>
            <div style={{fontSize:28,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:W}}>Liga</div>
            <div style={{fontSize:11.5,color:SUB,fontWeight:300}}>Steig auf · gewinne Punkte · fordere heraus</div>
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
                  <div style={{fontSize:9.5,color:MUT,marginTop:2}}>{s.skill_class.replace("+"," · ")}</div>
                  <div style={{fontSize:9,fontWeight:600,marginTop:4,color:MUT}}>{isPro(s)?`${count}/${s.max_players}`:"offen"}</div>
                </button>
              )
            })}
          </div>
          <div style={{fontSize:11,color:SUB,fontWeight:300,padding:"4px 16px 8px"}}>{sel?.city} · {sel?.status==="running"?"Saison läuft":"Anmeldung offen"} · zusammen, klar getrennt</div>

          {/* Standings-Karte */}
          <div style={{padding:"0 14px"}}>
            <div style={{...card,borderRadius:16}}>
              <div style={{height:360,overflowY:"auto",padding:"4px 8px"}}>
                {rows.length===0?(
                  <p style={{textAlign:"center",color:M,padding:"40px 0",fontSize:13}}>Noch keine Spieler — sei die/der Erste!</p>
                ):rows.map((r,i)=>{
                  const me=r.user_id===userId
                  return(
                    <div key={r.user_id} ref={me?meRef:null} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderBottom:`1px solid ${LINE}`,...(me?{background:"linear-gradient(90deg,rgba(57,255,20,.12),rgba(31,209,196,.05))",borderRadius:12}:{})}}>
                      <span style={{width:24,textAlign:"center",fontSize:14,fontWeight:700,color:SUB}}>{medal(i)}</span>
                      <span style={{width:32,height:32,borderRadius:"50%",background:CARD,border:`1px solid ${CELL}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🏓</span>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:14,fontWeight:500,color:W}}>{r.name}{me&&<span style={{fontSize:8,border:`1px solid ${MUT}`,borderRadius:999,padding:"1px 5px",marginLeft:6,color:SUB}}>Du</span>}</span>
                      </div>
                      {r.level&&<span style={levelBadge(r.level)}>{r.level}</span>}
                      <span style={{fontSize:14,fontWeight:700,...gt}}>{r.elo}</span>
                      {!me&&myReg&&(
                        <button onClick={()=>challenge(r.user_id)} title="Herausfordern" style={{background:CELL,border:"none",borderRadius:8,padding:"5px 8px",fontSize:13,cursor:"pointer"}}>⚔️</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Beitreten */}
          {!myReg&&(
            <div style={{padding:"12px 14px 0"}}>
              <button onClick={join} disabled={busy} style={{...btn,width:"100%",opacity:busy?0.6:1,cursor:busy?"not-allowed":"pointer"}}>{busy?"…":"+ Liga beitreten"}</button>
            </div>
          )}
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
              {msgs.length===0?<p style={{textAlign:"center",color:M,fontSize:13,marginTop:20}}>Noch keine Nachrichten — schreib die erste 👋</p>:msgs.map(m=>{
                if(m.kind==="feed") return(
                  <div key={m.id} style={{alignSelf:"center",fontSize:11,color:SUB,background:CELL,border:"none",borderRadius:999,padding:"5px 12px",textAlign:"center"}}>{m.text}</div>
                )
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
