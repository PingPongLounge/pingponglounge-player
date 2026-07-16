"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, CELL, W, SUB, MUT, GRAD, gt, card, body, meta, chipBtn, btnInCard } from "@/app/theme"

const G="#39FF14"

const sourceIcon: Record<string,string> = {
  liga_win:"🏆", liga_played:"🏓", liga_upset:"⚡",
  turnier_winner:"👑", turnier_match_win:"⚔️",
  turnier_match:"⚔️", turnier_join:"📋", open_match:"🎯",
  booking:"📅", food:"🍔", referral:"👥", manual:"⭐"
}

// PingPoints gibt es nur fürs Turnier-Podest und für bezahlte Buchungen.
// Liga- und Open-Game-Resultate zählen für ELO & Rang — nicht für PingPoints.
const EARN: Array<{ action: string; points: string; note?: string; soon?: boolean }> = [
  { action: "Buchung bezahlen",  points: "+5",   note: "Tisch, Training oder Open Game — 10 Buchungen = 1 Stunde gratis" },
  { action: "Turnier — Platz 1", points: "+100", note: "Turniersieg" },
  { action: "Turnier — Platz 2", points: "+50" },
  { action: "Turnier — Platz 3", points: "+25" },
  { action: "Registrierung",     points: "+15", note: "einmaliger Willkommens-Bonus" },
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
  const [error,setError]=useState("")
  const [claiming,setClaiming]=useState<number|null>(null)
  const [claimMsg,setClaimMsg]=useState<{threshold:number,msg:string}|null>(null)

  async function loadData(){
    setError("")
    try {
      const [histRes, rewRes] = await Promise.all([
        fetch("/api/pingpoints"),
        fetch("/api/pingpoints/rewards"),
      ])
      const hist = await histRes.json()
      const rew  = await rewRes.json()
      setBalance(rew.total ?? hist.balance ?? 0)
      setTransactions(hist.transactions || [])
      setRewards(rew.rewards || [])
    } catch {
      setError("PingPoints konnten nicht geladen werden")
    } finally {
      setLoading(false)
    }
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
        <Link href="/entdecken" style={{color:MUT,textDecoration:"none",fontSize:13}}>← Dashboard</Link>

        {/* Hero */}
        <div style={{textAlign:"center",margin:"24px 0 28px"}}>
          <p style={{fontSize:12.5,fontWeight:700,color:MUT,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Dein Guthaben</p>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:10}}>
            <span style={{...gt,fontSize:64,fontWeight:900,lineHeight:1,letterSpacing:"-0.02em"}}>{balance}</span>
            <span style={{...gt,fontSize:18,fontWeight:700}}>PP</span>
          </div>
          <p style={{...meta,marginTop:8}}>PingPoints</p>
          {/* Was ist ein Punkt wert? Ohne diese Zeile ist die Zahl bedeutungslos. */}
          <p style={{fontSize:12.5,color:SUB,marginTop:6}}>
            {balance>=50
              ? `Reicht für ${Math.floor(balance/50)}× 1 Stunde Tisch gratis`
              : `Noch ${50-balance} Punkte bis zur ersten Gratis-Stunde`}
          </p>
        </div>

        {/* Die Regeln auf einen Blick — vorher musste man sie sich zusammenreimen */}
        <div style={{...card,padding:"18px 18px",marginBottom:16}}>
          <p style={{fontSize:13.5,fontWeight:800,color:W,marginBottom:12}}>So funktionieren PingPoints</p>

          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[
              {v:"5",   l:"pro bezahlter\nBuchung"},
              {v:"100", l:"Turniersieg\n(2./3.: 50/25)"},
              {v:"50",  l:"= 1 Stunde\nTisch gratis"},
            ].map(s=>(
              <div key={s.l} style={{flex:1,background:CELL,borderRadius:12,padding:"12px 6px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:900,...gt}}>{s.v}</div>
                <div style={{fontSize:12,color:MUT,fontWeight:600,marginTop:3,lineHeight:1.35,whiteSpace:"pre-line"}}>{s.l}</div>
              </div>
            ))}
          </div>

          <p style={{fontSize:12,color:SUB,lineHeight:1.6,margin:0}}>
            Punkte bekommst du fürs <strong style={{color:W}}>Bezahlen</strong> (Tisch, Training, Open Game) und fürs
            <strong style={{color:W}}> Turnier-Podest</strong>. Liga- und Open-Game-Resultate zählen für ELO und Rang,
            aber nicht für PingPoints — sonst könnte man sie sich gegenseitig zuschieben.
            Einlösen kannst du sie unten unter „Einlösen": ab 50 Punkten eine Gratis-Stunde, danach Rabatte und Prämien.
          </p>
        </div>

        {/* Progress Bar */}
        {nextReward && (
          <div style={{...card,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:W,fontWeight:700}}>Nächste: {nextReward.label}</span>
              <span style={{fontSize:12,color:MUT}}>{nextReward.threshold - balance} PP fehlen</span>
            </div>
            <div style={{height:6,background:CELL,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progressPct}%`,background:GRAD,borderRadius:3,transition:"width 0.4s"}}/>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {(["history","earn","redeem"] as const).map(t_=>(
            <button key={t_} onClick={()=>setTab(t_)} style={{...chipBtn(tab===t_),flex:1,textAlign:"center"}}
            >{t_==="history"?"📜 Verlauf":t_==="earn"?"⚡ Verdienen":"🎁 Einlösen"}</button>
          ))}
        </div>

        {/* History */}
        {tab==="history"&&(
          loading?(
            <div style={{textAlign:"center",padding:"40px 0",color:MUT}}>lädt...</div>
          ):transactions.length===0?(
            <div style={{...card,padding:"32px 20px",textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:12}}>⭐</p>
              <p style={{fontSize:14,fontWeight:700,color:W,marginBottom:6}}>Noch keine Punkte</p>
              <p style={{...body}}>PingPoints sammelst du mit bezahlten Buchungen und auf dem Turnier-Podest.</p>
            </div>
          ):(
            <div style={{...card}}>
              {transactions.map((t,i)=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderTop:i>0?"1px solid rgba(255,255,255,.06)":"none"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:CELL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {sourceIcon[t.source]||"⭐"}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,color:W}}>{t.description}</p>
                    <p style={{...meta,fontSize:12.5}}>{timeAgo(t.created_at)}</p>
                  </div>
                  <span style={{fontSize:15,fontWeight:800,color:t.amount>0?W:SUB,flexShrink:0}}>
                    {t.amount>0?"+":""}{t.amount} PP
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Earn */}
        {tab==="earn"&&(
          <div style={{...card}}>
            {EARN.map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderTop:i>0?"1px solid rgba(255,255,255,.06)":"none",opacity:e.soon?0.45:1}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:13.5,fontWeight:700,color:W}}>{e.action}</p>
                  {e.note&&<p style={{...meta,fontSize:12.5,marginTop:2}}>{e.note}</p>}
                  {e.soon&&<p style={{...meta,fontSize:12}}>bald verfügbar</p>}
                </div>
                <span style={{fontSize:15,fontWeight:900,...gt,flexShrink:0}}>{e.points}</span>
              </div>
            ))}
            <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,.06)"}}>
              <p style={{...meta,fontSize:12.5,lineHeight:1.5}}>Liga- und Open-Game-Resultate zählen für ELO &amp; Rangliste — nicht für PingPoints.</p>
            </div>
          </div>
        )}

        {/* Redeem — aus PP_REWARDS API */}
        {tab==="redeem"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:MUT}}>lädt...</div>
            ):rewards.map(r=>(
              <div key={r.threshold} style={{
                ...card,
                padding:"16px 18px",
                opacity: r.claimed ? 0.5 : 1,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{textAlign:"center",minWidth:52,flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:r.unlocked?W:MUT}}>{r.threshold}</div>
                    <div style={{fontSize:9,color:MUT,fontWeight:700}}>PP</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:14,fontWeight:700,color:W}}>{r.label}</p>
                    <p style={{...body,marginTop:2}}>{r.description}</p>
                    {r.claimed&&<p style={{fontSize:12.5,color:G,marginTop:4}}>✓ Bereits eingelöst</p>}
                    {!r.claimed&&r.unlocked&&!claimMsg&&<p style={{fontSize:12.5,color:G,marginTop:4}}>✓ Verfügbar — jetzt einlösen!</p>}
                    {claimMsg?.threshold===r.threshold&&(
                      <p style={{fontSize:12,color:claimMsg.msg.startsWith("✓")?G:SUB,marginTop:4}}>{claimMsg.msg}</p>
                    )}
                  </div>
                  {!r.claimed&&r.unlocked&&(
                    <button
                      onClick={()=>claim(r.threshold)}
                      disabled={claiming===r.threshold}
                      style={{...btnInCard,flexShrink:0,whiteSpace:"nowrap",opacity:claiming===r.threshold?0.6:1}}>
                      {claiming===r.threshold?"...":"Einlösen"}
                    </button>
                  )}
                  {!r.unlocked&&(
                    <div style={{fontSize:12.5,color:MUT,flexShrink:0,textAlign:"right"}}>
                      <div>{r.threshold - balance} PP</div>
                      <div>fehlen</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <p style={{...meta,fontSize:12.5,textAlign:"center",marginTop:8}}>
              Nach Einlösung meldet sich das Team per E-Mail.
            </p>
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}