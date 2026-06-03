"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8",PP="#FFD700"

const sourceIcon: Record<string,string> = {
  liga_win:"🏆", liga_played:"🏓", turnier_winner:"👑", turnier_match_win:"⚔️",
  turnier_match:"⚔️", turnier_join:"📋", open_match:"🎯",
  booking:"📅", food:"🍔", referral:"👥", manual:"⭐"
}

type Transaction = { id:string; amount:number; source:string; description:string; created_at:string }

const REDEEM = [
  { points: 50,  reward: "10% Rabatt auf nächste Buchung" },
  { points: 100, reward: "1 Stunde Tisch gratis" },
  { points: 200, reward: "Turnier-Startgeld gratis" },
  { points: 500, reward: "VIP-Abend für 2 Personen" },
]

const EARN = [
  { action: "Liga-Match spielen",     points: "+5",   icon: "🏓" },
  { action: "Liga-Match gewinnen",    points: "+15",  icon: "🏆" },
  { action: "Turnier anmelden",       points: "+10",  icon: "📋" },
  { action: "Turnier-Match gewinnen", points: "+20",  icon: "⚔️" },
  { action: "Turnier gewinnen",       points: "+100", icon: "👑" },
  { action: "Open Match spielen",     points: "+5",   icon: "🎯" },
  { action: "Tisch buchen (pro h)",   points: "+10",  icon: "📅", soon: true },
  { action: "F&B (pro CHF)",          points: "+5",   icon: "🍔", soon: true },
  { action: "Freund einladen",        points: "+50",  icon: "👥", soon: true },
]

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
  const [tab,setTab]=useState<"history"|"earn"|"redeem">("history")
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    fetch("/api/pingpoints").then(r=>r.json()).then(d=>{
      setBalance(d.balance||0)
      setTransactions(d.transactions||[])
      setLoading(false)
    })
  },[])

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <Link href="/profil" style={{color:M,textDecoration:"none",fontSize:13}}>← Profil</Link>

        {/* Hero */}
        <div style={{textAlign:"center",margin:"24px 0 28px"}}>
          <p style={{fontSize:11,fontWeight:700,color:M,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Dein Guthaben</p>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:10}}>
            <span style={{fontSize:64,fontWeight:900,color:PP,lineHeight:1,letterSpacing:"-0.02em"}}>{balance}</span>
            <span style={{fontSize:18,fontWeight:700,color:PP}}>PP</span>
          </div>
          <p style={{fontSize:13,color:M,marginTop:8}}>PingPoints</p>
        </div>

        {/* Progress to next reward */}
        {balance < 500 && (
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            {REDEEM.filter(r=>r.points>balance)[0] && (()=>{
              const next=REDEEM.filter(r=>r.points>balance)[0]
              const prev=REDEEM.filter(r=>r.points<=balance).slice(-1)[0]
              const from=prev?.points||0
              const pct=Math.round(((balance-from)/(next.points-from))*100)
              return(
                <>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:12,color:W,fontWeight:700}}>Nächste Prämie: {next.reward}</span>
                    <span style={{fontSize:12,color:M}}>{next.points-balance} PP fehlen</span>
                  </div>
                  <div style={{height:6,background:B,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:PP,borderRadius:3,boxShadow:`0 0 6px ${PP}80`}}/>
                  </div>
                </>
              )
            })()}
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

        {/* Redeem */}
        {tab==="redeem"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {REDEEM.map((r,i)=>{
              const canRedeem=balance>=r.points
              return(
                <div key={i} style={{background:C,border:`1px solid ${canRedeem?PP+"40":B}`,borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,opacity:canRedeem?1:0.5}}>
                  <div style={{textAlign:"center",minWidth:52}}>
                    <div style={{fontSize:18,fontWeight:900,color:PP}}>{r.points}</div>
                    <div style={{fontSize:9,color:M,fontWeight:700}}>PP</div>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:700,color:W}}>{r.reward}</p>
                    {canRedeem&&<p style={{fontSize:11,color:G,marginTop:2}}>✓ Verfügbar</p>}
                  </div>
                  {canRedeem&&(
                    <button style={{background:PP,color:"#0A0A0C",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:800,cursor:"pointer"}}>
                      Info →
                    </button>
                  )}
                </div>
              )
            })}
            <p style={{fontSize:11,color:M,textAlign:"center",marginTop:8}}>
              Für Einlösung an der Lounge melden oder info@pingponglounge.ch
            </p>
          </div>
        )}

      </div>
    </main>
  )
}