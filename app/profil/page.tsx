"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import LogoutButton from "@/app/components/LogoutButton"

const BG="#0E1014",C="#1A1D24",B="#1A1D24",M="rgba(255,255,255,0.35)",G="#39FF14",W="#FFFFFF",PK="#1FD1C4"
const GRAD="linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"
const levelColor=(l:string)=>({Rookie:"#4ADE80",Challenger:"#FACC15",Advanced:"#FB923C",Elite:PK}[l]||G)

function timeAgo(d:string):string{
  const diff=Date.now()-new Date(d).getTime()
  const days=Math.floor(diff/86400000)
  if(days<1) return "heute"
  if(days===1) return "gestern"
  if(days<7) return `vor ${days}d`
  return new Date(d).toLocaleDateString("de-CH",{day:"numeric",month:"short"})
}

function EloChart({history,current}:{history:{elo:number,delta:number,created_at:string}[],current:number}){
  const points = history.length > 0
    ? history.map(h=>h.elo)
    : [current]

  if(points.length < 2) return (
    <div style={{textAlign:"center",padding:"20px 0",color:M,fontSize:12}}>
      Noch keine Matchhistorie — spiel dein erstes Match!
    </div>
  )

  const min=Math.min(...points)-30
  const max=Math.max(...points)+30
  const range=max-min||100
  const W_=280, H_=70
  const xs=points.map((_,i)=>i*(W_/(points.length-1)))
  const ys=points.map(p=>H_-((p-min)/range)*H_)
  const d="M"+xs.map((x,i)=>`${x},${ys[i]}`).join(" L")

  return(
    <svg viewBox={`0 0 ${W_} ${H_+10}`} style={{width:"100%",height:80,overflow:"visible"}}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={G} stopOpacity={0.4}/>
          <stop offset="100%" stopColor={G} stopOpacity={1}/>
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Last point dot */}
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="4" fill={G} style={{filter:`drop-shadow(0 0 4px ${G})`}}/>
    </svg>
  )
}

type EloPoint={elo:number,delta:number,created_at:string}
type RecentMatch={id:string,sets:Array<{p1:number,p2:number}>|null,winner_id:string|null,confirmed_at:string,p1_id:string,p2_id:string,p1:{name:string}|null,p2:{name:string}|null,season:{name:string,city:string}|null}
type Profile={id:string,name:string,elo:number,level:string,matches_played:number,matches_won:number,canton:string|null,created_at:string,avatar_url?:string|null}

export default function ProfilPage(){
  const [profile,setProfile]=useState<Profile|null>(null)
  const [eloHistory,setEloHistory]=useState<EloPoint[]>([])
  const [recentMatches,setRecentMatches]=useState<RecentMatch[]>([])
  const [loading,setLoading]=useState(true)
  const [ppBalance,setPpBalance]=useState(0)
  const [badges,setBadges]=useState<{icon:string,title:string,earned:boolean,tier:string}[]>([])
  const [earnedCount,setEarnedCount]=useState(0)
  const [error,setError]=useState("")

  async function load(){
    setError("")
    try {
      const [achRes, ppRes, profRes] = await Promise.all([
        fetch("/api/achievements"),
        fetch("/api/pingpoints"),
        fetch("/api/profil"),
      ])
      const ach  = await achRes.json()
      const pp   = await ppRes.json()
      const prof = await profRes.json()
      setBadges((ach.badges||[]).filter((b:{earned:boolean})=>b.earned).slice(0,6))
      setEarnedCount(ach.earned||0)
      setPpBalance(pp.balance||0)
      setProfile(prof.profile)
      setEloHistory(prof.eloHistory||[])
      setRecentMatches(prof.recentMatches||[])
    } catch {
      setError("Profil konnte nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ load() },[])

  if(error) return(
    <main style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{textAlign:"center"}}>
        <p style={{fontSize:36,marginBottom:12}}>⚠️</p>
        <p style={{fontSize:14,fontWeight:700,color:W,marginBottom:6}}>Verbindungsfehler</p>
        <p style={{fontSize:13,color:M,marginBottom:20}}>{error}</p>
        <button onClick={load} style={{background:G,color:"#0E1014",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Nochmals versuchen</button>
      </div>
      <BottomNav />
    </main>
  )

  if(loading) return(
    <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:M,fontSize:14}}>Lädt...</p>
      <BottomNav />
    </main>
  )

  if(!profile) return(
    <main style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:M}}>Nicht eingeloggt.</p>
    </main>
  )

  const played=profile.matches_played||0
  const won=profile.matches_won||0
  const lost=played-won
  const winRate=played>0?Math.round((won/played)*100):0
  const lc=levelColor(profile.level)

  // ELO-Delta seit letztem Match
  const lastDelta=eloHistory.length>0?eloHistory[eloHistory.length-1].delta:null

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>

        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",color:M,textDecoration:"none",fontSize:13}}>← entdecken</Link>

        {/* Header */}
        <div style={{textAlign:"center",margin:"24px 0 28px"}}>
          {/* Avatar */}
          <Link href="/profil/avatar" style={{display:"inline-block",position:"relative",marginBottom:12}}>
            <div style={{width:80,height:80,borderRadius:"50%",background:`${G}18`,border:`2px solid ${G}40`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" style={{width:"100%",height:"200%",objectFit:"cover",objectPosition:"top center"}}/>
                : "🏓"}
            </div>
            <div style={{position:"absolute",bottom:0,right:0,width:22,height:22,borderRadius:"50%",background:PK,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:`2px solid ${BG}`}}>✏️</div>
          </Link>
          <h1 style={{fontSize:22,fontWeight:900,color:W,marginBottom:4}}>{profile.name}</h1>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,color:lc,background:`${lc}18`,border:`1px solid ${lc}40`,borderRadius:999,padding:"2px 10px"}}>{profile.level}</span>
            {profile.canton&&<span style={{fontSize:11,color:M,background:C,border:`1px solid ${B}`,borderRadius:999,padding:"2px 10px"}}>{profile.canton}</span>}
          </div>
        </div>

        {/* ELO Hero */}
        <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"20px 20px 14px",marginBottom:10,textAlign:"center"}}>
          <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>ELO Rating</p>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:10}}>
            <span style={{fontSize:56,fontWeight:900,lineHeight:1,letterSpacing:"-0.02em",background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{profile.elo??1000}</span>
            {lastDelta!==null&&(
              <span style={{fontSize:14,fontWeight:700,color:lastDelta>=0?"#4ADE80":"#f87171"}}>
                {lastDelta>=0?"+":""}{lastDelta}
              </span>
            )}
          </div>
          <div style={{margin:"12px 0 4px"}}>
            <EloChart history={eloHistory} current={profile.elo??1000}/>
          </div>
          {eloHistory.length>0&&(
            <p style={{fontSize:11,color:M}}>{eloHistory.length} Datenpunkte</p>
          )}
        </div>

        {/* Stats Row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[
            {num:played,lbl:"Gespielt"},
            {num:won,lbl:"Siege"},
            {num:lost,lbl:"Niederlagen"},
            {num:winRate+"%",lbl:"Win Rate"},
            {num:ppBalance+"PP",lbl:"PingPoints"},
          ].map(({num,lbl})=>(
            <div key={lbl} style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:W,lineHeight:1}}>{num}</div>
              <div style={{fontSize:10,color:M,marginTop:4}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Letzte Matches */}
        <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,overflow:"hidden",marginBottom:10}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${B}`,display:"flex",alignItems:"center",position:"relative"}}>
            <span style={{fontSize:13,fontWeight:700,color:W}}>Letzte Matches</span>
            <Link href="/matchhistorie" style={{fontSize:12,color:G,textDecoration:"none",fontWeight:700}}>Alle →</Link>
          </div>
          {recentMatches.length===0?(
            <div style={{padding:"24px",textAlign:"center",color:M,fontSize:13}}>Noch keine Matches gespielt.</div>
          ):(
            recentMatches.map(m=>{
              const isMe_p1=m.p1_id===profile.id
              const opponent=isMe_p1?m.p1?.name:m.p2?.name  // wait - opponent is the OTHER player
              const opponentName=isMe_p1?m.p2?.name:m.p1?.name
              const won_=m.winner_id===profile.id
              const sets=m.sets?m.sets.map(s=>isMe_p1?`${s.p1}:${s.p2}`:`${s.p2}:${s.p1}`).join(" "):""
              return(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px",borderBottom:`1px solid #1a1a1a`}}>
                  <div style={{width:28,height:28,borderRadius:8,background:won_?`${G}18`:"#2d1111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                    {won_?"👑":"💀"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:700,color:W,marginBottom:2}}>{opponentName||"?"}</p>
                    <p style={{fontSize:11,color:M}}>{m.season?.city} · {sets}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontSize:12,fontWeight:700,color:won_?G:"#f87171"}}>{won_?"SIEG":"NIEDERLAGE"}</p>
                    <p style={{fontSize:10,color:M}}>{timeAgo(m.confirmed_at)}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Menü */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {[
            {href:"/matchhistorie", icon:"📋", label:"Matchhistorie",   sub:`${played} Matches total`},
            {href:"/achievements",  icon:"🏆", label:"Achievements",    sub:`${earnedCount} verdient`},
            {href:"/pingpoints",    icon:"⚡", label:"PingPoints",      sub:`${ppBalance} PP Guthaben`},
            {href:"/liga",          icon:"🏓", label:"Liga",            sub:"Saisons & Challenges"},
            {href:"/freunde",       icon:"👥", label:"Freunde",         sub:"Spieler finden"},
            {href:"/buchen",        icon:"📅", label:"Tisch buchen",    sub:"Standort & Zeit wählen"},
            {href:"/profil/avatar", icon:"🎨", label:"Avatar ändern",   sub:"AI Comic Graffiti Stil"},
          ].map(({href,icon,label,sub})=>(
            <Link key={href} href={href} style={{display:"block",textDecoration:"none"}}>
              <div style={{background:C,border:`1px solid ${B}`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`${G}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{icon}</div>
                  <div>
                    <p style={{fontSize:13,fontWeight:700,color:W}}>{label}</p>
                    <p style={{fontSize:11,color:M}}>{sub}</p>
                  </div>
                </div>
                <span style={{color:G,fontWeight:700}}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <div style={{marginTop:8,background:C,border:`1px solid #f8717130`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:"#f8717118",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🚪</div>
          <LogoutButton variant="menu" />
        </div>

      </div>
      <BottomNav/>
    </main>
  )
}