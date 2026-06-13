"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8",PP="#FFD700"

const sourceIcon: Record<string,string> = {
  liga_win:"🏆", liga_played:"🏓", liga_upset:"⚡",
  turnier_winner:"👑", turnier_match_win:"⚔️",
  turnier_match:"⚔️", turnier_join:"📋", open_match:"🎯",
  booking:"📅", food:"🍔", referral:"👥", manual:"⭐"
}

const EARN = [
  { action: "Liga-Match spielen",     points: "+5",   icon: "🏓" },
  { action: "Liga-Match gewinnen",    points: "+15",  icon: "🏆" },
  { action: "Upset-Sieg (>100 ELO)",  points: "+10",  icon: "⚡" },
  { action: "Turnier anmelden",       points: "+10",  icon: "📋" },
  { action: "Turnier-Match gewinnen", points: "+20",  icon: "⚔️" },
  { action: "Turnier gewinnen",       points: "+100", icon: "👑" },
  { action: "Open Match spielen",     points: "+5",   icon: "🎯" },
  { action: "Tisch buchen (pro h)",   points: "+10",  icon: "📅", soon: true },
  { action: "F&B (pro CHF)",          points: "+5",   icon: "🍔", soon: true },
  { action: "Freund einladen",        points: "+50",  icon: "👥", soon: true },
]

type Transaction = { id:string; amount:number; source:string; description:string; created_at:string }
type Reward = {
  threshold:number; type:string; label:string; description:string;
  discountPercent?:number; unlocked:boolean; claimed:boolean
}

function timeAgo(d:string):string{
  const diff=Date.now()-new Date(d).getTime()
  const days=Math.floor(diff/86400000)
  if(days<1) return "heute"
  if(days===1) return "gestern"
  if(days<7) return `vor ${days}d`
  return new Date(d).toLocaleDateString("de-CH",{day:"numeric",month:"short"})
}

export default function PingPointsPage(){
  const [balance,setBalance]=useState(0)
  const [transactions,setTransactions]=useState<Transaction[]>([])
  const [rewards,setRewards]=useState<Reward[]>([])
  const [tab,setTab]=useState<"history"|"earn"|"redeem">("history")
  const [loading,setLoading]=useState(true)
  const [claiming,setClaiming]=useState<number|null>(null)
  const [claimMsg,setClaimMsg]=useState<{threshold:number,msg:string}|null>(null)

  async function loadData(){
    const [histRes, rewRes] = await Promise.all([
      fetch("/api/pingpoints"),
      fetch("/api/pingpoints/rewards"),
    ])
    const hist = await histRes.json()
    const rew  = await rewRes.json()
    setBalance(rew.total ?? hist.balance ?? 0)
    setTransactions(hist.transactions || [])
    setRewards(rew.rewards || [])
    setLoading(false)
  }

  useEffect(()=>{ loadData() },[])

  async function claim(threshold:number){
    setClaiming(threshold)
    setClaimMsg(null)
    const res = await fetch("/api/pingpoints/rewards",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({threshold})
    })
    const d = await res.json()
    setClaimMsg({threshold, msg: d.message || d.error || "Fehler"})
    setClaiming(null)
    if(res.ok) loadData()
  }

  // Nächste unerledigte Schwelle
  const nextReward = rewards.find(r=>!r.unlocked)
  const prevThreshold = rewards.filter(r=>r.unlocked).slice(-1)[0]?.threshold ?? 0
  const progressPct = nextReward
    ? Math.min(100, Math.round(((balance - prevThreshold) / (nextReward.threshold - prevThreshold)) * 100))
    : 100

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/dashboard" style={{color:M,textDecoration:"none",fontSize:13}}>← Dashboard</Link>

        {/* Hero */}
        <div style={{textAlign:"center",margin:"24px 0 28px"}}>
          <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Dein Guthaben</p>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:10}}>
            <span style={{fontSize:64,fontWeight:900,color:PP,lineHeight:1,letterSpacing:"-0.02em"}}>{balance}</span>
            <span style={{fontSize:18,fontWeight:700,color:PP}}>PP</span>
          </div>
          <p style={{fontSize:13,color:M,marginTop:8}}>PingPoints</p>
        </div>

        {/* Progress Bar */}
        {nextReward && (
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:W,fontWeight:700}}>Nächste: {nextReward.label}</span>
              <span style={{fontSize:12,color:M}}>{nextReward.threshold - balance} PP fehlen</span>
            </div>
            <div style={{height:6,background:B,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progressPct}%`,background:PP,borderRadius:3,boxShadow:`0 0 6px ${PP}80`,transition:"width 0.4s"}}/>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {(["history","earn","redeem"] as const).map(t_=>(
            <button key={t_} onClick={()=>setTab(t_)} style={{
              flex:1,padding:"9px",borderRadius:999,fontSize:12,fontWeight:700,cursor:"pointer",
              background:tab===t_?PP:C,color:tab===t_?"#0A0A0C":M,border:`1px solid ${tab===t_?PP:B}`
            }}>{t_==="history"?"📜 Verlauf":t_==="earn"?"⚡ Verdienen":"🎁 Einlösen"}</button>
          ))}
        </div>

        {/* History */}
        {tab==="history"&&(
          loading?(
            <div style={{textAlign:"center",padding:"40px 0",color:M}}>Lädt...</div>
          ):transactions.length===0?(
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"32px 20px",textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:12}}>⭐</p>
              <p style={{fontSize:14,fontWeight:700,color:W,marginBottom:6}}>Noch keine Punkte</p>
              <p style={{fontSize:12,color:M}}>Spiel dein erstes Match um PingPoints zu verdienen!</p>
            </div>
          ):(
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,overflow:"hidden"}}>
              {transactions.map((t,i)=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<transactions.length-1?`1px solid #1a1a1a`:"none"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:t.amount>0?`${PP}18`:"#2d1111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {sourceIcon[t.source]||"⭐"}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,color:W}}>{t.description}</p>
                    <p style={{fontSize:11,color:M}}>{timeAgo(t.created_at)}</p>
                  </div>
                  <span style={{fontSize:15,fontWeight:800,color:t.amount>0?PP:"#f87171",flexShrink:0}}>
                    {t.amount>0?"+":""}{t.amount} PP
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Earn */}
        {tab==="earn"&&(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,overflow:"hidden"}}>
            {EARN.map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<EARN.length-1?`1px solid #1a1a1a`:"none",opacity:e.soon?0.45:1}}>
                <span style={{fontSize:20,flexShrink:0}}>{e.icon}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:W}}>{e.action}</p>
                  {e.soon&&<p style={{fontSize:10,color:M}}>Bald verfügbar</p>}
                </div>
                <span style={{fontSize:14,fontWeight:800,color:PP}}>{e.points}</span>
              </div>
            ))}
          </div>
        )}

        {/* Redeem — aus PP_REWARDS API */}
        {tab==="redeem"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:M}}>Lädt...</div>
            ):rewards.map(r=>(
              <div key={r.threshold} style={{
                background:C,
                border:`1px solid ${r.unlocked ? PP+"50" : B}`,
                borderRadius:14,padding:"16px 18px",
                opacity: r.claimed ? 0.5 : 1,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{textAlign:"center",minWidth:52,flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:r.unlocked?PP:M}}>{r.threshold}</div>
                    <div style={{fontSize:9,color:M,fontWeight:700}}>PP</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:14,fontWeight:700,color:W}}>{r.label}</p>
                    <p style={{fontSize:11,color:M,marginTop:2}}>{r.description}</p>
                    {r.claimed&&<p style={{fontSize:11,color:G,marginTop:4}}>✓ Bereits eingelöst</p>}
                    {!r.claimed&&r.unlocked&&!claimMsg&&<p style={{fontSize:11,color:PP,marginTop:4}}>✓ Verfügbar — jetzt einlösen!</p>}
                    {claimMsg?.threshold===r.threshold&&(
                      <p style={{fontSize:12,color:claimMsg.msg.startsWith("✓")?G:PK,marginTop:4}}>{claimMsg.msg}</p>
                    )}
                  </div>
                  {!r.claimed&&r.unlocked&&(
                    <button
                      onClick={()=>claim(r.threshold)}
                      disabled={claiming===r.threshold}
                      style={{
                        background:claiming===r.threshold?B:PP,
                        color:claiming===r.threshold?M:"#0A0A0C",
                        border:"none",borderRadius:8,padding:"9px 14px",
                        fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0,
                        whiteSpace:"nowrap"
                      }}>
                      {claiming===r.threshold?"...":"Einlösen"}
                    </button>
                  )}
                  {!r.unlocked&&(
                    <div style={{fontSize:11,color:M,flexShrink:0,textAlign:"right"}}>
                      <div>{r.threshold - balance} PP</div>
                      <div>fehlen</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <p style={{fontSize:11,color:M,textAlign:"center",marginTop:8}}>
              Nach Einlösung meldet sich das Team per E-Mail.
            </p>
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}