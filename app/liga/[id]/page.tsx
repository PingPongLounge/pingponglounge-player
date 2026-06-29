"use client"
import { useEffect, useState, use } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { LIGA_CONFIG } from "@/lib/rewards"

const BG="#0E1014",C="#1A1D24",B="#1A1D24",M="rgba(255,255,255,0.66)",G="#39FF14",W="#FFFFFF",PK="#1FD1C4"
const GRAD="linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"
const levelColor=(l:string):string=>({Rookie:"#4ADE80",Challenger:"#FACC15",Advanced:"#FB923C",Elite:PK}[l]||G)

type Standing={player_id:string,player_name:string,points:number,played:number,wins:number,losses:number,rank:number}
type Match={id:string,round:number,p1_id:string,p1_name:string,p2_id:string,p2_name:string,sets:Array<{p1:number,p2:number}>|null,winner_id:string|null,status:string,deadline:string|null,played_at:string|null}
type Challenge={id:string,p1_id:string,p2_id:string,p1_name:string,p2_name:string,status:string}
type Reaction={type:string,user_id:string}
type Comment={id:string,user_id:string,user_name:string,text:string,created_at:string}
type FeedItem=Match&{reactions:Reaction[],comments:Comment[]}
type Season={id:string,name:string,city:string,skill_class:string,status:string,max_players:number,start_date:string,description:string}

function setsToString(sets:Array<{p1:number,p2:number}>|null):string{
  if(!sets||!sets.length) return "—"
  return sets.map(s=>`${s.p1}:${s.p2}`).join(", ")
}
function winsFromSets(sets:Array<{p1:number,p2:number}>|null):{p1:number,p2:number}{
  if(!sets) return {p1:0,p2:0}
  return {p1:sets.filter(s=>s.p1>s.p2).length,p2:sets.filter(s=>s.p2>s.p1).length}
}
function timeAgo(d:string):string{
  const h=Math.floor((Date.now()-new Date(d).getTime())/3600000)
  if(h<1) return "gerade eben"
  if(h<24) return `vor ${h}h`
  return `vor ${Math.floor(h/24)}d`
}

export default function SeasonPage({params}:{params:Promise<{id:string}>}){
  const {id:seasonId}=use(params)
  const [season,setSeason]=useState<Season|null>(null)
  const [standings,setStandings]=useState<Standing[]>([])
  const [matches,setMatches]=useState<Match[]>([])
  const [feed,setFeed]=useState<FeedItem[]>([])
  const [challenges,setChallenges]=useState<Challenge[]>([])
  const [tab,setTab]=useState<"tabelle"|"spielplan"|"challenges"|"feed">("tabelle")
  const [userId,setUserId]=useState<string|null>(null)
  const [commentText,setCommentText]=useState<{[k:string]:string}>({})
  const [challenging,setChallenging]=useState<string|null>(null)
  const [confirmDecline,setConfirmDecline]=useState<string|null>(null)
  const [confirmWithdraw,setConfirmWithdraw]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)

  async function loadChallenges(sb:ReturnType<typeof createClient>,uid:string){
    const {data}=await sb.from("league_matches")
      .select(`id,p1_id,p2_id,status,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name)`)
      .eq("season_id",seasonId)
      .eq("status","challenge_sent")
      .or(`p1_id.eq.${uid},p2_id.eq.${uid}`)
    const mapped=(data||[]).map((x:Record<string,unknown>)=>({
      ...x,
      p1_name:((x.p1 as {name:string}[]|null)?.[0]?.name)||"?",
      p2_name:((x.p2 as {name:string}[]|null)?.[0]?.name)||"?",
    }))
    setChallenges(mapped as unknown as Challenge[])
  }

  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const {data:{user}}=await sb.auth.getUser()
      setUserId(user?.id||null)

      const {data:s}=await sb.from("league_seasons").select("*").eq("id",seasonId).single()
      setSeason(s)

      const {data:st}=await sb.rpc("get_league_standings",{season_id:seasonId})
      setStandings(st||[])

      const {data:m}=await sb.from("league_matches")
        .select(`id,round,p1_id,p2_id,sets,winner_id,status,deadline,played_at,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name)`)
        .eq("season_id",seasonId).not("status","in","(challenge_sent,cancelled)").order("round",{ascending:true})
      const mappedM=(m||[]).map((x:Record<string,unknown>)=>({...x,p1_name:((x.p1 as {name:string}[]|null)?.[0]?.name)||"?",p2_name:((x.p2 as {name:string}[]|null)?.[0]?.name)||"?"}))
      setMatches(mappedM as unknown as Match[])

      const {data:f}=await sb.from("league_matches")
        .select(`id,round,p1_id,p2_id,sets,winner_id,played_at,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name),match_reactions(type,user_id),match_comments(id,user_id,text,created_at,profiles(name))`)
        .eq("season_id",seasonId).eq("status","confirmed").order("played_at",{ascending:false}).limit(20)
      const feedMapped=(f||[]).map((x:Record<string,unknown>)=>({
        ...x,
        p1_name:((x.p1 as {name:string}[]|null)?.[0]?.name)||"?",
        p2_name:((x.p2 as {name:string}[]|null)?.[0]?.name)||"?",
        reactions:(x.match_reactions||[]) as Reaction[],
        comments:((x.match_comments||[]) as Array<{id:string,user_id:string,text:string,created_at:string,profiles:{name:string}|null}>).map(c=>({...c,user_name:c.profiles?.name||"?"}))
      }))
      setFeed(feedMapped as unknown as FeedItem[])

      if(user?.id) await loadChallenges(sb,user.id)
      setLoading(false)
    }
    load()
  },[seasonId])

  async function handleChallenge(opponentId:string){
    if(!userId||challenging) return
    setChallenging(opponentId)
    const res=await fetch("/api/liga/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,challenged_id:opponentId})})
    if(res.ok){
      const sb=createClient()
      await loadChallenges(sb,userId)
    }
    setChallenging(null)
  }

  async function handleAccept(matchId:string){
    await fetch("/api/liga/challenge/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})})
    const sb=createClient()
    if(userId) await loadChallenges(sb,userId)
    // Spielplan neu laden
    const {data:m}=await sb.from("league_matches")
      .select(`id,round,p1_id,p2_id,sets,winner_id,status,deadline,played_at,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name)`)
      .eq("season_id",seasonId).not("status","in","(challenge_sent,cancelled)").order("round",{ascending:true})
    const mappedM=(m||[]).map((x:Record<string,unknown>)=>({...x,p1_name:((x.p1 as {name:string}[]|null)?.[0]?.name)||"?",p2_name:((x.p2 as {name:string}[]|null)?.[0]?.name)||"?"}))
    setMatches(mappedM as unknown as Match[])
    setTab("spielplan")
  }

  async function handleDecline(matchId:string){
    await fetch("/api/liga/challenge/decline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})})
    const sb=createClient()
    if(userId) await loadChallenges(sb,userId)
  }

  async function handleReact(matchId:string,type:string){
    if(!userId) return
    const sb=createClient()
    const existing=feed.find(f=>f.id===matchId)?.reactions?.find(r=>r.user_id===userId&&r.type===type)
    if(existing){
      await sb.from("match_reactions").delete().eq("match_id",matchId).eq("user_id",userId).eq("type",type)
    } else {
      await sb.from("match_reactions").upsert({match_id:matchId,user_id:userId,type})
    }
    const {data}=await createClient().from("match_reactions").select("type,user_id").eq("match_id",matchId)
    setFeed(prev=>prev.map(f=>f.id===matchId?{...f,reactions:(data||[]) as Reaction[]}:f))
  }

  async function handleComment(matchId:string){
    const text=commentText[matchId]?.trim()
    if(!text||!userId) return
    const sb=createClient()
    await sb.from("match_comments").insert({match_id:matchId,user_id:userId,text})
    setCommentText(prev=>({...prev,[matchId]:""}))
    const {data}=await sb.from("match_comments").select("id,user_id,text,created_at,profiles(name)").eq("match_id",matchId).order("created_at")
    setFeed(prev=>prev.map(f=>f.id===matchId?{...f,comments:((data||[]) as unknown as Array<{id:string,user_id:string,text:string,created_at:string,profiles:{name:string}|null}>).map(c=>({...c,user_name:c.profiles?.name||"?"}))}:f))
  }

  if(loading||!season) return <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:M}}>lädt...</p>
      <BottomNav /></main>

  const lc=levelColor(season.skill_class)
  const myMatches=matches.filter(m=>m.p1_id===userId||m.p2_id===userId)
  const incomingChallenges=challenges.filter(c=>c.p2_id===userId)
  const outgoingChallenges=challenges.filter(c=>c.p1_id===userId)

  // Spieler die ich bereits herausgefordert habe oder von denen ich eine Challenge habe
  const busyOpponents=new Set(challenges.map(c=>c.p1_id===userId?c.p2_id:c.p1_id))

  const TABS=[
    {key:"tabelle",label:"tabelle"},
    {key:"spielplan",label:"spielplan"},
    {key:"challenges",label:`challenges${incomingChallenges.length>0?` (${incomingChallenges.length})`:""}` },
    {key:"feed",label:"feed"},
  ] as const

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 20px 80px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/liga" style={{color:M,textDecoration:"none",fontSize:13}}>← liga</Link>

        {/* Header */}
        <div style={{margin:"16px 0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <h1 style={{fontSize:22,fontWeight:900,fontFamily:"'League Spartan', system-ui, sans-serif",textTransform:"uppercase",letterSpacing:".1em",background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{season.name}</h1>
            <span style={{fontSize:10,fontWeight:700,color:lc,background:`${lc}18`,border:`1px solid ${lc}40`,borderRadius:999,padding:"2px 8px"}}>{season.skill_class}</span>
          </div>
          <p style={{fontSize:12,color:M}}>{season.city} · {standings.length} spieler · {season.status==="running"?"läuft gerade":"offen für anmeldung"}</p>
        </div>

        {/* Anmelden CTA */}
        {season.status==="open"&&!myMatches.length&&<Link href={`/liga/${season.id}/anmelden`} style={{display:"block",background:"#fff",color:"#0E1014",textDecoration:"none",borderRadius:10,padding:"14px",textAlign:"center",fontSize:13,fontWeight:700,textTransform:"lowercase",letterSpacing:"0.02em",marginBottom:16}}>kostenlos anmelden</Link>}

        {/* Tabs */}
        <div style={{display:"flex",background:C,borderRadius:10,padding:3,marginBottom:16,gap:2}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,background:tab===t.key?"#fff":"none",border:"none",borderRadius:8,padding:"9px 4px",fontSize:11,fontWeight:700,color:tab===t.key?"#0E1014":M,cursor:"pointer",textTransform:"lowercase",letterSpacing:"0.04em",transition:"all 0.2s",position:"relative"}}>
              {t.label}
              {t.key==="challenges"&&incomingChallenges.length>0&&tab!=="challenges"&&(
                <span style={{position:"absolute",top:2,right:2,width:7,height:7,background:G,borderRadius:"50%"}}/>
              )}
            </button>
          ))}
        </div>

        {/* ── TABELLE ─────────────────────────────────────────── */}
        {tab==="tabelle"&&(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:14,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 50px 52px 44px",padding:"10px 14px",borderBottom:`1px solid ${B}`,background:"#0E1014"}}>
              <span style={{fontSize:10,color:M,fontWeight:700}}>#</span>
              <span style={{fontSize:10,color:M,fontWeight:700}}>spieler</span>
              <span style={{fontSize:10,color:M,fontWeight:700,textAlign:"center"}}>s</span>
              <span style={{fontSize:10,color:M,fontWeight:700,textAlign:"right"}}>pts</span>
              <span style={{fontSize:10,color:M,fontWeight:700,textAlign:"center"}}>⚔</span>
            </div>
            {standings.length===0?(
              <p style={{padding:"20px",textAlign:"center",color:M,fontSize:13}}>noch keine ergebnisse</p>
            ):standings.map((s,i)=>{
              const isSelf=s.player_id===userId
              const isBusy=busyOpponents.has(s.player_id)
              return(
                <div key={s.player_id} style={{display:"grid",gridTemplateColumns:"28px 1fr 50px 52px 44px",padding:"12px 14px",borderBottom:i<standings.length-1?`1px solid ${B}`:"none",background:isSelf?`${G}08`:"none",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:i<3?700:400,color:i===0?G:i===1?"#A8AAB2":i===2?"#CD7F32":M}}>{i+1}</span>
                  <div>
                    <span style={{fontSize:14,fontWeight:700,color:isSelf?G:W}}>{s.player_name}</span>
                    {isSelf&&<span style={{fontSize:10,color:G,marginLeft:6}}>du</span>}
                  </div>
                  <span style={{fontSize:12,color:M,textAlign:"center"}}>{s.wins}W/{s.losses}L</span>
                  <span style={{fontSize:18,fontWeight:900,color:G,textAlign:"right"}}>{s.points}</span>
                  <div style={{textAlign:"center"}}>
                    {!isSelf&&userId&&(
                      isBusy?(
                        <span style={{fontSize:10,color:M}}>⏳</span>
                      ):(
                        <button
                          onClick={()=>handleChallenge(s.player_id)}
                          disabled={challenging===s.player_id}
                          style={{background:challenging===s.player_id?B:`${G}20`,border:`1px solid ${challenging===s.player_id?B:G}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,color:G,fontWeight:700}}
                        >
                          {challenging===s.player_id?"...":"⚔"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── SPIELPLAN ───────────────────────────────────────── */}
        {tab==="spielplan"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {matches.length===0?<p style={{textAlign:"center",color:M,padding:"20px"}}>noch keine matches</p>:
            matches.map(m=>{
              const isMe=m.p1_id===userId||m.p2_id===userId
              const confirmed=m.status==="confirmed"
              const sw=m.sets?winsFromSets(m.sets):{p1:0,p2:0}
              return(
                <div key={m.id} style={{background:C,border:`1px solid ${isMe?`${G}40`:B}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",position:"relative",marginBottom:6}}>
                    <span style={{fontSize:10,color:M,fontWeight:700,textTransform:"uppercase"}}>{m.round>0?`runde ${m.round}`:"open match"}</span>
                    <span style={{fontSize:10,color:confirmed?G:m.status==="p1_entered"?"#FACC15":M,fontWeight:700,textTransform:"uppercase"}}>{confirmed?"✓ bestätigt":m.status==="p1_entered"?"warten":"ausstehend"}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:15,fontWeight:700,color:m.winner_id===m.p1_id?G:W}}>{m.p1_name}</span>
                    {confirmed&&m.sets?(
                      <span style={{fontSize:13,fontWeight:700,color:W,background:B,borderRadius:6,padding:"4px 10px"}}>{sw.p1}:{sw.p2}</span>
                    ):<span style={{fontSize:12,color:M}}>vs</span>}
                    <span style={{fontSize:15,fontWeight:700,color:m.winner_id===m.p2_id?G:W}}>{m.p2_name}</span>
                  </div>
                  {confirmed&&m.sets&&<p style={{fontSize:11,color:M,marginTop:6,textAlign:"center"}}>{setsToString(m.sets)}</p>}
                  {isMe&&!confirmed&&(
                    <Link href={`/liga/match/${m.id}`} style={{display:"block",marginTop:10,background:"#fff",color:"#0E1014",textDecoration:"none",borderRadius:8,padding:"10px",textAlign:"center",fontSize:12,fontWeight:700,textTransform:"lowercase",letterSpacing:"0.02em"}}>
                      {m.status==="p1_entered"&&m.p2_id===userId?"bestätigen":"resultat eingeben"}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── CHALLENGES ──────────────────────────────────────── */}
        {tab==="challenges"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Incoming */}
            {incomingChallenges.length>0&&(
              <div>
                <p style={{fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>eingehend</p>
                {incomingChallenges.map(c=>(
                  <div key={c.id} style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
                    <p style={{fontSize:14,fontWeight:700,color:W,marginBottom:4}}>
                      <span style={{color:G}}>{c.p1_name}</span> fordert dich heraus
                    </p>
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <button onClick={()=>handleAccept(c.id)} style={{flex:1,background:"#fff",color:"#0E1014",border:"none",borderRadius:8,padding:"10px",fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"lowercase"}}>✓ annehmen</button>
                      {confirmDecline===c.id?(
                        <div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}>
                          <span style={{fontSize:11,color:M,flex:1}}>sicher?</span>
                          <button onClick={()=>setConfirmDecline(null)} style={{background:"none",color:M,border:`1px solid ${B}`,borderRadius:6,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>nein</button>
                          <button onClick={()=>{handleDecline(c.id);setConfirmDecline(null)}} style={{background:"#f8717120",color:"#f87171",border:"1px solid #f8717140",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>ablehnen</button>
                        </div>
                      ):(
                        <button onClick={()=>setConfirmDecline(c.id)} style={{flex:1,background:"none",color:M,border:`1px solid ${B}`,borderRadius:8,padding:"10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>ablehnen</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing */}
            {outgoingChallenges.length>0&&(
              <div>
                <p style={{fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>gesendet</p>
                {outgoingChallenges.map(c=>(
                  <div key={c.id} style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",position:"relative"}}>
                      <p style={{fontSize:14,fontWeight:700,color:W}}>challenge an <span style={{color:G}}>{c.p2_name}</span></p>
                      <span style={{fontSize:10,color:"#FACC15",fontWeight:700}}>⏳ wartet</span>
                    </div>
                    {confirmWithdraw===c.id?(
                      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:10}}>
                        <span style={{fontSize:11,color:M,flex:1}}>zurückziehen?</span>
                        <button onClick={()=>setConfirmWithdraw(null)} style={{background:"none",color:M,border:`1px solid ${B}`,borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>nein</button>
                        <button onClick={()=>{handleDecline(c.id);setConfirmWithdraw(null)}} style={{background:"#f8717120",color:"#f87171",border:"1px solid #f8717140",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>ja</button>
                      </div>
                    ):(
                      <button onClick={()=>setConfirmWithdraw(c.id)} style={{marginTop:10,background:"none",color:M,border:`1px solid ${B}`,borderRadius:8,padding:"8px 14px",fontSize:11,cursor:"pointer"}}>zurückziehen</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {incomingChallenges.length===0&&outgoingChallenges.length===0&&(
              <div style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"32px 20px",textAlign:"center"}}>
                <p style={{fontSize:28,marginBottom:10}}>⚔️</p>
                <p style={{fontSize:15,fontWeight:700,color:W,marginBottom:6}}>keine offenen challenges</p>
                <p style={{fontSize:13,color:M}}>fordere einen mitspieler in der tabelle heraus.</p>
              </div>
            )}
          </div>
        )}

        {/* ── FEED ────────────────────────────────────────────── */}
        {tab==="feed"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {feed.length===0?<p style={{textAlign:"center",color:M,padding:"20px"}}>noch keine ergebnisse</p>:
            feed.map(f=>{
              const sw=winsFromSets(f.sets)
              const reactionCounts:{[k:string]:number}={}
              f.reactions?.forEach(r=>{reactionCounts[r.type]=(reactionCounts[r.type]||0)+1})
              const myReactions=new Set(f.reactions?.filter(r=>r.user_id===userId).map(r=>r.type))
              return(
                <div key={f.id} style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"16px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:14,fontWeight:700,color:f.winner_id===f.p1_id?G:W}}>{f.p1_name}</span>
                    <div style={{textAlign:"center"}}>
                      <span style={{fontSize:18,fontWeight:900,color:W,background:B,borderRadius:8,padding:"4px 12px"}}>{sw.p1}:{sw.p2}</span>
                    </div>
                    <span style={{fontSize:14,fontWeight:700,color:f.winner_id===f.p2_id?G:W}}>{f.p2_name}</span>
                  </div>
                  {f.sets&&<p style={{fontSize:11,color:M,textAlign:"center",marginBottom:10}}>{setsToString(f.sets)}</p>}
                  {f.played_at&&<p style={{fontSize:11,color:M,marginBottom:12}}>{timeAgo(f.played_at)}</p>}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["clap","👏"],["fire","🔥"],["ping","🏓"]].map(([type,emoji])=>(
                      <button key={type} onClick={()=>handleReact(f.id,type)} style={{background:myReactions.has(type)?`${G}20`:"none",border:`1px solid ${myReactions.has(type)?G:B}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,color:myReactions.has(type)?G:M,fontWeight:myReactions.has(type)?700:400}}>
                        {emoji} {reactionCounts[type]||0}
                      </button>
                    ))}
                  </div>
                  {f.comments?.length>0&&(
                    <div style={{borderTop:`1px solid ${B}`,paddingTop:10,marginBottom:10}}>
                      {f.comments.map(c=>(
                        <div key={c.id} style={{marginBottom:8}}>
                          <span style={{fontSize:12,fontWeight:700,color:c.user_id===userId?G:W}}>{c.user_name}</span>
                          <span style={{fontSize:12,color:M,marginLeft:8}}>{c.text}</span>
                          <span style={{fontSize:10,color:M,marginLeft:8}}>{timeAgo(c.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {userId&&(
                    <div style={{display:"flex",gap:8}}>
                      <input value={commentText[f.id]||""} onChange={e=>setCommentText(p=>({...p,[f.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleComment(f.id)} placeholder="kommentar..." style={{flex:1,background:BG,border:`1px solid ${B}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:W,outline:"none"}}/>
                      <button onClick={()=>handleComment(f.id)} style={{background:"#fff",color:"#0E1014",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:700}}>→</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}