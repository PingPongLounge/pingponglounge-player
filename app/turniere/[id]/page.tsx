"use client"
import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"

const BG="#15181E",C="#1E222A",B="#262B33",M="rgba(255,255,255,0.85)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

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
    <div style={{background:C,border:`1px solid ${confirmed?G+"40":B}`,borderRadius:10,padding:"10px 12px",minWidth:160,flex:"0 0 160px"}}>
      <div style={{display:"flex",alignItems:"center",position:"relative",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:m.winner_id===m.p1_id?600:400,color:m.winner_id===m.p1_id?G:W,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p1}</span>
        {confirmed&&m.sets&&<span style={{fontSize:10,color:M,marginLeft:4}}>{m.sets.filter(s=>s.p1>s.p2).length}</span>}
      </div>
      <div style={{borderTop:`1px solid ${B}`,margin:"4px 0"}}/>
      <div style={{display:"flex",alignItems:"center",position:"relative"}}>
        <span style={{fontSize:11,fontWeight:m.winner_id===m.p2_id?600:400,color:m.winner_id===m.p2_id?G:W,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p2==="?"?"tbd":p2}</span>
        {confirmed&&m.sets&&<span style={{fontSize:10,color:M,marginLeft:4}}>{m.sets.filter(s=>s.p2>s.p1).length}</span>}
      </div>
      {isMe&&!confirmed&&m.p1_id&&m.p2_id&&(
        <button onClick={()=>onResult(m)} style={{marginTop:8,width:"100%",background:"#fff",color:"#14161A",border:"none",borderRadius:6,padding:"6px",fontSize:10,fontWeight:600,cursor:"pointer",textTransform:"lowercase"}}>
          {pending?"bestätigen →":"resultat →"}
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
      <p style={{color:M,fontWeight:500,textTransform:"lowercase"}}>lädt...</p>
      <BottomNav />
    </main>
  )

  const {tournament:t,registrations,matches,isRegistered,userId}=data
  const rounds=[...new Set(matches.map(m=>m.round))].sort((a,b)=>a-b)
  const roundLabel=(r:number,maxR:number)=>r===maxR?"final":r===maxR-1?"halbfinal":r===maxR-2?"viertelfinal":`runde ${r}`
  const maxRound=rounds.length>0?Math.max(...rounds):1

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <Link href="/turniere" style={{color:M,textDecoration:"none",fontSize:13}}>← turniere</Link>

        {/* Header */}
        <div style={{margin:"20px 0 20px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div>
              <h1 style={{fontSize:24,fontWeight:900,textTransform:"uppercase",letterSpacing:".1em",lineHeight:1.1,marginBottom:8,...GRAD}}>{t.name}</h1>
              <p style={{fontSize:13,color:M,fontWeight:500,textTransform:"lowercase"}}>📍 {t.city||"standort offen"}{t.date?` · 📅 ${new Date(t.date).toLocaleDateString("de-CH",{weekday:"long",day:"numeric",month:"long"})}`:""}{t.entry_fee_chf?` · 💰 chf ${t.entry_fee_chf}`:" · gratis"}{t.counts_for_rank===false?" · nur spass":""}</p>
            </div>
            <span style={{fontSize:11,fontWeight:500,color:"rgba(255,255,255,0.85)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"3px 10px",flexShrink:0,textTransform:"lowercase"}}>{t.skill_class}</span>
          </div>
        </div>

        {/* Anmelden Button */}
        {t.status==="open"&&(
          <div style={{marginBottom:16}}>
            {isRegistered?(
              <div style={{background:`${G}12`,border:`1px solid ${G}30`,borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
                <p style={{fontSize:13,fontWeight:600,color:G,textTransform:"lowercase"}}>✓ du bist angemeldet</p>
                <p style={{fontSize:11,color:M,marginTop:2,fontWeight:500,textTransform:"lowercase"}}>{(registrations as unknown[]).length}/{t.max_players} spieler</p>
              </div>
            ):(
              <button onClick={register} disabled={registering} style={{width:"100%",background:"#fff",color:"#14161A",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,cursor:"pointer",textTransform:"lowercase"}}>
                {registering?"wird angemeldet...":"jetzt anmelden →"}
              </button>
            )}
          </div>
        )}

        {/* Ersteller: Bracket starten */}
        {t.status==="open"&&t.created_by===userId&&(
          <div style={{marginBottom:16}}>
            <button onClick={startBracket} disabled={starting||(registrations as unknown[]).length<2} style={{width:"100%",background:starting||(registrations as unknown[]).length<2?"#2A2D38":G,color:starting||(registrations as unknown[]).length<2?M:"#06210a",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,cursor:(registrations as unknown[]).length<2?"default":"pointer",textTransform:"lowercase"}}>
              {starting?"bracket wird erstellt...":(registrations as unknown[]).length<2?"mind. 2 spieler nötig":"⚔️ bracket erstellen & starten"}
            </button>
            <p style={{fontSize:11,color:M,textAlign:"center",marginTop:8,fontWeight:500,textTransform:"lowercase"}}>setzliste automatisch nach elo · danach läuft das turnier</p>
            {startError&&<p style={{fontSize:12,color:"#f87171",textAlign:"center",marginTop:6}}>{startError}</p>}
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {(["bracket","spieler"] as const).map(t_=>
            <button key={t_} onClick={()=>setTab(t_)} style={{padding:"8px 16px",borderRadius:999,fontSize:12,fontWeight:tab===t_?600:400,cursor:"pointer",background:tab===t_?"#fff":C,color:tab===t_?"#14161A":M,border:`1px solid ${tab===t_?"#fff":B}`,textTransform:"lowercase"}}>
              {t_==="bracket"?"⚔️ bracket":"👥 spieler"}
            </button>
          )}
        </div>

        {/* Bracket */}
        {tab==="bracket"&&(
          matches.length===0?(
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"32px 20px",textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:12}}>⚔️</p>
              <p style={{fontSize:14,fontWeight:600,color:W,marginBottom:6}}>bracket noch nicht generiert</p>
              <p style={{fontSize:12,color:M,fontWeight:500}}>wird nach ablauf der anmeldung erstellt.</p>
            </div>
          ):(
            <div style={{overflowX:"auto",paddingBottom:12}}>
              <div style={{display:"flex",gap:20,alignItems:"flex-start",minWidth:"fit-content"}}>
                {rounds.map(round=>(
                  <div key={round} style={{display:"flex",flexDirection:"column",gap:12}}>
                    <p style={{fontSize:10,fontWeight:500,color:M,letterSpacing:"0.04em",textTransform:"lowercase",marginBottom:4,textAlign:"center"}}>{roundLabel(round,maxRound)}</p>
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
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,overflow:"hidden"}}>
            {(registrations as Array<{player_id:string,seed:number,profiles:{name:string,elo:number,level:string}|{name:string,elo:number,level:string}[]}>).length===0?(
              <p style={{padding:"24px",textAlign:"center",color:M,fontSize:13,fontWeight:500,textTransform:"lowercase"}}>noch keine anmeldungen.</p>
            ):(registrations as Array<{player_id:string,seed:number,profiles:{name:string,elo:number,level:string}|{name:string,elo:number,level:string}[]}>).map((r,i)=>{
              const p=Array.isArray(r.profiles)?r.profiles[0]:r.profiles
              return(
                <div key={r.player_id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<registrations.length-1?`1px solid ${B}`:"none",background:r.player_id===userId?"rgba(255,255,255,0.04)":"transparent"}}>
                  <span style={{fontSize:12,color:M,minWidth:24,fontWeight:500}}>#{i+1}</span>
                  <div style={{flex:1}}>
                    <span style={{fontSize:13,fontWeight:600,color:r.player_id===userId?G:W}}>{p?.name||"?"}</span>
                    {r.player_id===userId&&<span style={{fontSize:9,color:"rgba(255,255,255,0.85)",marginLeft:6,border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"1px 6px",textTransform:"lowercase"}}>du</span>}
                  </div>
                  <span style={{fontSize:11,color:M,fontWeight:500,textTransform:"lowercase"}}>{p?.level}</span>
                  <span style={{fontSize:13,fontWeight:600,color:W}}>{p?.elo}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Resultat Modal */}
        {resultMatch&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,padding:"0 16px 24px"}}>
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:20,padding:"24px 20px",width:"100%",maxWidth:400}}>
              <p style={{fontSize:16,fontWeight:600,color:W,marginBottom:4,textTransform:"lowercase"}}>resultat eintragen</p>
              <p style={{fontSize:13,color:M,marginBottom:16,fontWeight:500}}>{getName(resultMatch.p1)} vs {getName(resultMatch.p2)}</p>
              {resultMatch.status==="p1_entered"?(
                <>
                  <p style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:16,fontWeight:500,textTransform:"lowercase"}}>bitte bestätige das eingetragene resultat:</p>
                  <p style={{fontSize:13,color:W,marginBottom:16,textAlign:"center",fontWeight:600}}>
                    {resultMatch.sets?.map(s=>`${s.p1}:${s.p2}`).join("  ")}
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setResultMatch(null)} style={{flex:1,padding:"12px",background:"transparent",color:"rgba(255,255,255,0.85)",border:"1px solid #2A2D38",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",textTransform:"lowercase"}}>abbrechen</button>
                    <button onClick={()=>submitResult("confirm")} style={{flex:1,padding:"12px",background:"#fff",color:"#14161A",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",textTransform:"lowercase"}}>bestätigen ✓</button>
                  </div>
                </>
              ):(
                <>
                  <p style={{fontSize:12,color:M,marginBottom:12,fontWeight:500,textTransform:"lowercase"}}>punktestand pro satz eintragen (optional leerlassen)</p>
                  {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:12,color:M,minWidth:52,fontWeight:500,textTransform:"lowercase"}}>satz {i+1}:</span>
                      <input type="number" min="0" max="30" value={sets[i].p1} onChange={e=>{const s=[...sets];s[i]={...s[i],p1:e.target.value};setSets(s)}} style={{width:52,background:"#14161A",border:`1px solid ${B}`,borderRadius:8,padding:"8px",fontSize:15,fontWeight:600,color:W,outline:"none",textAlign:"center"}}/>
                      <span style={{fontSize:16,color:M,fontWeight:600}}>:</span>
                      <input type="number" min="0" max="30" value={sets[i].p2} onChange={e=>{const s=[...sets];s[i]={...s[i],p2:e.target.value};setSets(s)}} style={{width:52,background:"#14161A",border:`1px solid ${B}`,borderRadius:8,padding:"8px",fontSize:15,fontWeight:600,color:W,outline:"none",textAlign:"center"}}/>
                    </div>
                  ))}
                  {resultError&&<p style={{fontSize:12,color:"#f87171",marginTop:4}}>{resultError}</p>}
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button onClick={()=>setResultMatch(null)} style={{flex:1,padding:"12px",background:"transparent",color:"rgba(255,255,255,0.85)",border:"1px solid #2A2D38",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",textTransform:"lowercase"}}>abbrechen</button>
                    <button onClick={()=>submitResult("enter")} style={{flex:1,padding:"12px",background:"#fff",color:"#14161A",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",textTransform:"lowercase"}}>eintragen →</button>
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