"use client"
import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"
import { BG, CARD, CELL, W, MUT, GREEN, DANGER, card, cardPad, cell, btn, btnInCard, btnGhost, chipBtn, levelBadge, h1, body, backLink } from "@/app/theme"

const M=MUT, C=CARD, B=CELL, G=GREEN

type Profile={name:string,elo:number,level?:string}
type TMatch={id:string,round:number,match_number:number,p1_id:string|null,p2_id:string|null,winner_id:string|null,sets:Array<{p1:number,p2:number}>|null,status:string,p1:Profile|Profile[]|null,p2:Profile|Profile[]|null}
type Tournament={id:string,name:string,date:string,city:string,skill_class:string,max_players:number,status:string,format:string,description:string,created_by:string,entry_fee_chf?:number,counts_for_rank?:boolean}

function getName(p:Profile|Profile[]|null):string{
  if(!p) return "?"
  if(Array.isArray(p)) return p[0]?.name||"?"
  return p.name
}
function getElo(p:Profile|Profile[]|null):number{
  if(!p) return 0
  if(Array.isArray(p)) return p[0]?.elo||0
  return p.elo
}

function BracketMatch({m,userId,onResult}:{m:TMatch,userId:string|null,onResult:(m:TMatch)=>void}){
  const p1=getName(m.p1), p2=getName(m.p2)
  const isMe=userId&&(m.p1_id===userId||m.p2_id===userId)
  const confirmed=m.status==="confirmed"
  const pending=m.status==="p1_entered"&&isMe&&m.p2_id===userId

  return(
    <div style={{...cell,padding:"10px 12px",minWidth:160,flex:"0 0 160px",...(confirmed?{border:`1px solid ${G}40`}:{})}}>
      <div style={{display:"flex",alignItems:"center",position:"relative",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:m.winner_id===m.p1_id?600:400,color:m.winner_id===m.p1_id?G:W,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p1}</span>
        {confirmed&&m.sets&&<span style={{fontSize:10,color:M,marginLeft:4}}>{m.sets.filter(s=>s.p1>s.p2).length}</span>}
      </div>
      <div style={{borderTop:`1px solid ${B}`,margin:"4px 0"}}/>
      <div style={{display:"flex",alignItems:"center",position:"relative"}}>
        <span style={{fontSize:11,fontWeight:m.winner_id===m.p2_id?600:400,color:m.winner_id===m.p2_id?G:W,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p2==="?"?"TBD":p2}</span>
        {confirmed&&m.sets&&<span style={{fontSize:10,color:M,marginLeft:4}}>{m.sets.filter(s=>s.p2>s.p1).length}</span>}
      </div>
      {isMe&&!confirmed&&m.p1_id&&m.p2_id&&(
        <button onClick={()=>onResult(m)} style={{...btnInCard,display:"block",width:"100%",textAlign:"center",marginTop:8,borderRadius:6,padding:"6px",fontSize:10}}>
          {pending?"Bestätigen →":"Resultat →"}
        </button>
      )}
    </div>
  )
}

export default function TurnierDetailPage({params}:{params:Promise<{id:string}>}){
  const {id:tournamentId}=use(params)
  const router=useRouter()
  const [data,setData]=useState<{tournament:Tournament,registrations:unknown[],matches:TMatch[],isRegistered:boolean,userId:string|null}|null>(null)
  const [loading,setLoading]=useState(true)
  const [registering,setRegistering]=useState(false)
  const [regError,setRegError]=useState("")
  const [resultError,setResultError]=useState("")
  const [resultMatch,setResultMatch]=useState<TMatch|null>(null)
  const [sets,setSets]=useState([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}])
  const [tab,setTab]=useState<"bracket"|"spieler">("bracket")

  const load=useCallback(async()=>{
    const res=await fetch(`/api/turniere/${tournamentId}`)
    const json=await res.json()
    setData(json)
    setLoading(false)
  },[tournamentId])

  useEffect(()=>{load()},[load])

  async function register(){
    setRegistering(true)
    const res=await fetch(`/api/turniere/${tournamentId}/register`,{method:"POST"})
    const json=await res.json()
    if(!res.ok){setRegError(json.error||"Fehler bei der Anmeldung");setRegistering(false);return}
    load()
    setRegistering(false)
  }

  const [starting,setStarting]=useState(false)
  const [startError,setStartError]=useState("")
  async function startBracket(){
    setStartError("")
    setStarting(true)
    const res=await fetch(`/api/turniere/${tournamentId}/start`,{method:"POST"})
    const json=await res.json()
    if(!res.ok){setStartError(json.error||"Fehler beim Starten");setStarting(false);return}
    load()
    setStarting(false)
  }

  async function submitResult(action:"enter"|"confirm"){
    if(!resultMatch) return
    const res=await fetch(`/api/turniere/${tournamentId}/result`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({match_id:resultMatch.id,sets:sets.filter(s=>s.p1!==""&&s.p2!=="").map(s=>`${s.p1}:${s.p2}`),action})
    })
    if(res.ok){setResultMatch(null);load()}
    else{const j=await res.json();setResultError(j.error||"Fehler beim Eintragen")}
  }

  if(loading||!data) return(
    <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={body}>Lädt …</p>
      <BottomNav />
    </main>
  )

  const {tournament:t,registrations,matches,isRegistered,userId}=data
  const rounds=[...new Set(matches.map(m=>m.round))].sort((a,b)=>a-b)
  const roundLabel=(r:number,maxR:number)=>r===maxR?"Final":r===maxR-1?"Halbfinal":r===maxR-2?"Viertelfinal":`Runde ${r}`
  const maxRound=rounds.length>0?Math.max(...rounds):1

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <Link href="/turniere" style={backLink}>← Turniere</Link>

        {/* Header */}
        <div style={{margin:"20px 0 20px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div>
              <h1 style={{...h1,fontSize:24,lineHeight:1.1,marginBottom:8}}>{t.name}</h1>
              <p style={body}>📍 {t.city||"Standort offen"}{t.date?` · 📅 ${new Date(t.date).toLocaleDateString("de-CH",{weekday:"long",day:"numeric",month:"long"})}`:""}{t.entry_fee_chf?` · 💰 CHF ${t.entry_fee_chf}`:" · Gratis"}{t.counts_for_rank===false?" · nur Spass":""}</p>
            </div>
            <span style={{...levelBadge(t.skill_class),flexShrink:0}}>{t.skill_class}</span>
          </div>
        </div>

        {/* Anmelden Button */}
        {t.status==="open"&&(
          <div style={{marginBottom:16}}>
            {isRegistered?(
              <div style={{...cardPad,padding:"12px 16px",textAlign:"center"}}>
                <p style={{fontSize:13,fontWeight:700,color:G}}>✓ Du bist angemeldet</p>
                <p style={{...body,marginTop:2}}>{(registrations as unknown[]).length}/{t.max_players} Spieler</p>
              </div>
            ):(
              <button onClick={register} disabled={registering} style={{...btn,width:"100%",padding:14,fontSize:14}}>
                {registering?"Wird angemeldet …":"Jetzt anmelden →"}
              </button>
            )}
          </div>
        )}

        {/* Ersteller: Bracket starten */}
        {t.status==="open"&&t.created_by===userId&&(
          <div style={{marginBottom:16}}>
            <button onClick={startBracket} disabled={starting||(registrations as unknown[]).length<2} style={{...btn,width:"100%",padding:14,fontSize:14,opacity:(registrations as unknown[]).length<2?0.5:1,cursor:(registrations as unknown[]).length<2?"default":"pointer"}}>
              {starting?"Bracket wird erstellt …":(registrations as unknown[]).length<2?"Mind. 2 Spieler nötig":"⚔️ Bracket erstellen & starten"}
            </button>
            <p style={{...body,textAlign:"center",marginTop:8,fontSize:11}}>Setzliste automatisch nach Elo · danach läuft das Turnier</p>
            {startError&&<p style={{fontSize:12,color:DANGER,textAlign:"center",marginTop:6}}>{startError}</p>}
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {(["bracket","spieler"] as const).map(t_=>
            <button key={t_} onClick={()=>setTab(t_)} style={chipBtn(tab===t_)}>
              {t_==="bracket"?"⚔️ Bracket":"👥 Spieler"}
            </button>
          )}
        </div>

        {/* Bracket */}
        {tab==="bracket"&&(
          matches.length===0?(
            <div style={{...cardPad,padding:"32px 20px",textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:12}}>⚔️</p>
              <p style={{fontSize:14,fontWeight:700,color:W,marginBottom:6}}>Bracket noch nicht generiert</p>
              <p style={body}>Wird nach Ablauf der Anmeldung erstellt.</p>
            </div>
          ):(
            <div style={{overflowX:"auto",paddingBottom:12}}>
              <div style={{display:"flex",gap:20,alignItems:"flex-start",minWidth:"fit-content"}}>
                {rounds.map(round=>(
                  <div key={round} style={{display:"flex",flexDirection:"column",gap:12}}>
                    <p style={{fontSize:10,fontWeight:600,color:M,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:4,textAlign:"center"}}>{roundLabel(round,maxRound)}</p>
                    {matches.filter(m=>m.round===round).map(m=>(
                      <BracketMatch key={m.id} m={m} userId={userId} onResult={setResultMatch}/>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Spielerliste */}
        {tab==="spieler"&&(
          <div style={{...card}}>
            {(registrations as Array<{player_id:string,seed:number,profiles:{name:string,elo:number,level:string}|{name:string,elo:number,level:string}[]}>).length===0?(
              <p style={{...body,padding:"24px",textAlign:"center"}}>Noch keine Anmeldungen.</p>
            ):(registrations as Array<{player_id:string,seed:number,profiles:{name:string,elo:number,level:string}|{name:string,elo:number,level:string}[]}>).map((r,i)=>{
              const p=Array.isArray(r.profiles)?r.profiles[0]:r.profiles
              return(
                <div key={r.player_id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderTop:i>0?`1px solid rgba(255,255,255,.06)`:"none",background:r.player_id===userId?"rgba(255,255,255,0.04)":"transparent"}}>
                  <span style={{fontSize:12,color:M,minWidth:24,fontWeight:500}}>#{i+1}</span>
                  <div style={{flex:1}}>
                    <span style={{fontSize:13,fontWeight:700,color:r.player_id===userId?G:W}}>{p?.name||"?"}</span>
                    {r.player_id===userId&&<span style={{fontSize:9,color:"rgba(255,255,255,0.85)",marginLeft:6,border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"1px 6px"}}>Du</span>}
                  </div>
                  {p?.level&&<span style={levelBadge(p.level)}>{p.level}</span>}
                  <span style={{fontSize:13,fontWeight:700,color:W}}>{p?.elo}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Resultat Modal */}
        {resultMatch&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,padding:"0 16px 24px"}}>
            <div style={{...cardPad,padding:"24px 20px",borderRadius:20,width:"100%",maxWidth:400}}>
              <p style={{fontSize:16,fontWeight:800,color:W,marginBottom:4}}>Resultat eintragen</p>
              <p style={{...body,marginBottom:16}}>{getName(resultMatch.p1)} vs {getName(resultMatch.p2)}</p>
              {resultMatch.status==="p1_entered"?(
                <>
                  <p style={{...body,marginBottom:16}}>Bitte bestätige das eingetragene Resultat:</p>
                  <p style={{fontSize:13,color:W,marginBottom:16,textAlign:"center",fontWeight:700}}>
                    {resultMatch.sets?.map(s=>`${s.p1}:${s.p2}`).join("  ")}
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setResultMatch(null)} style={{...btnGhost,flex:1,padding:12,fontSize:13}}>Abbrechen</button>
                    <button onClick={()=>submitResult("confirm")} style={{...btnInCard,flex:1,display:"block",textAlign:"center",padding:12,fontSize:13}}>Bestätigen ✓</button>
                  </div>
                </>
              ):(
                <>
                  <p style={{...body,marginBottom:12}}>Punktestand pro Satz eintragen (optional leerlassen)</p>
                  {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:12,color:M,minWidth:52,fontWeight:500}}>Satz {i+1}:</span>
                      <input type="number" min="0" max="30" value={sets[i].p1} onChange={e=>{const s=[...sets];s[i]={...s[i],p1:e.target.value};setSets(s)}} style={{width:52,background:"#0E1014",border:`1px solid ${B}`,borderRadius:8,padding:"8px",fontSize:15,fontWeight:600,color:W,outline:"none",textAlign:"center"}}/>
                      <span style={{fontSize:16,color:M,fontWeight:600}}>:</span>
                      <input type="number" min="0" max="30" value={sets[i].p2} onChange={e=>{const s=[...sets];s[i]={...s[i],p2:e.target.value};setSets(s)}} style={{width:52,background:"#0E1014",border:`1px solid ${B}`,borderRadius:8,padding:"8px",fontSize:15,fontWeight:600,color:W,outline:"none",textAlign:"center"}}/>
                    </div>
                  ))}
                  {resultError&&<p style={{fontSize:12,color:DANGER,marginTop:4}}>{resultError}</p>}
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button onClick={()=>setResultMatch(null)} style={{...btnGhost,flex:1,padding:12,fontSize:13}}>Abbrechen</button>
                    <button onClick={()=>submitResult("enter")} style={{...btnInCard,flex:1,display:"block",textAlign:"center",padding:12,fontSize:13}}>Eintragen →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}