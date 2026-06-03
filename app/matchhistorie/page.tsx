"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1"

function dateLabel(d:string):string{
  return new Date(d).toLocaleDateString("de-CH",{day:"numeric",month:"short",year:"numeric"})
}

type Match={
  id:string
  sets:Array<{p1:number,p2:number}>|null
  winner_id:string|null
  confirmed_at:string
  p1_id:string
  p2_id:string
  p1:{name:string}|null
  p2:{name:string}|null
  season:{name:string,city:string,skill_class:string}|null
}

type EloEntry={match_id:string,delta:number,elo:number}

export default function MatchHistoriePage(){
  const [matches,setMatches]=useState<Match[]>([])
  const [userId,setUserId]=useState<string|null>(null)
  const [eloMap,setEloMap]=useState<Record<string,EloEntry>>({})
  const [filter,setFilter]=useState<"alle"|"siege"|"niederlagen">("alle")
  const [loading,setLoading]=useState(true)
  const [page,setPage]=useState(0)
  const PER_PAGE=20

  const load=useCallback(async()=>{
    const sb=createClient()
    const {data:{user}}=await sb.auth.getUser()
    if(!user){setLoading(false);return}
    setUserId(user.id)

    const {data:m}=await sb
      .from("league_matches")
      .select(`id,sets,winner_id,confirmed_at,p1_id,p2_id,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name),season:league_seasons!league_matches_season_id_fkey(name,city,skill_class)`)
      .eq("status","confirmed")
      .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
      .order("confirmed_at",{ascending:false})
      .limit(200)

    const mapped = (m||[]).map((x: Record<string,unknown>) => ({
      ...x,
      p1: Array.isArray(x.p1) ? (x.p1[0] || null) : x.p1,
      p2: Array.isArray(x.p2) ? (x.p2[0] || null) : x.p2,
      season: Array.isArray(x.season) ? (x.season[0] || null) : x.season,
    }))
    setMatches(mapped as unknown as unknown as Match[])

    // ELO history für delta
    const {data:eh}=await sb
      .from("elo_history")
      .select("match_id,delta,elo")
      .eq("player_id",user.id)
    const map:Record<string,EloEntry>={}
    ;(eh||[]).forEach((e:{match_id:string,delta:number,elo:number})=>{map[e.match_id]=e})
    setEloMap(map)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const filtered=matches.filter(m=>{
    if(filter==="siege") return m.winner_id===userId
    if(filter==="niederlagen") return m.winner_id!==null&&m.winner_id!==userId
    return true
  })
  const paginated=filtered.slice(0,(page+1)*PER_PAGE)
  const hasMore=filtered.length>(page+1)*PER_PAGE

  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>

        <Link href="/profil" style={{color:M,textDecoration:"none",fontSize:13}}>← Profil</Link>

        <div style={{margin:"20px 0 24px"}}>
          <h1 style={{fontSize:28,fontWeight:900,color:W,textTransform:"uppercase",lineHeight:1}}>MATCHHISTORIE</h1>
          <p style={{fontSize:13,color:M,marginTop:6}}>{matches.length} Matches total</p>
        </div>

        {/* Filter */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {(["alle","siege","niederlagen"] as const).map(f=>(
            <button key={f} onClick={()=>{setFilter(f);setPage(0)}} style={{
              padding:"7px 16px",borderRadius:999,fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid",
              background:filter===f?G:C,
              color:filter===f?"#0A0A0C":M,
              borderColor:filter===f?G:B,
              textTransform:"capitalize"
            }}>{f==="alle"?`Alle (${matches.length})`:f==="siege"?`Siege (${matches.filter(m=>m.winner_id===userId).length})`:`Niederlagen (${matches.filter(m=>m.winner_id!==null&&m.winner_id!==userId).length})`}</button>
          ))}
        </div>

        {/* List */}
        {loading?(
          <div style={{textAlign:"center",padding:"60px 0",color:M}}>
            <p style={{fontSize:14}}>Lädt...</p>
          </div>
        ):filtered.length===0?(
          <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,padding:"40px 20px",textAlign:"center"}}>
            <p style={{fontSize:28,marginBottom:12}}>🏓</p>
            <p style={{fontSize:15,fontWeight:700,color:W,marginBottom:6}}>Keine Matches</p>
            <p style={{fontSize:13,color:M}}>Meld dich in einer Liga an und spiel los.</p>
          </div>
        ):(
          <>
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:16,overflow:"hidden"}}>
              {paginated.map((m,i)=>{
                const isP1=m.p1_id===userId
                const opponentName=isP1?m.p2?.name||"?":m.p1?.name||"?"
                const won=m.winner_id===userId
                const elo=eloMap[m.id]
                const setsStr=m.sets?m.sets.map(s=>isP1?`${s.p1}:${s.p2}`:`${s.p2}:${s.p1}`).join("  "):""

                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px",borderBottom:i<paginated.length-1?`1px solid #1a1a1a`:"none"}}>

                    {/* Icon */}
                    <div style={{width:32,height:32,borderRadius:9,background:won?`${G}18`:"#2d1111",border:`1px solid ${won?G+"30":"#3d1111"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                      {won?"👑":"💀"}
                    </div>

                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <span style={{fontSize:14,fontWeight:700,color:W}}>{opponentName}</span>
                        <span style={{fontSize:10,fontWeight:700,color:won?G:"#f87171",background:won?`${G}18`:"#2d1111",borderRadius:999,padding:"1px 7px"}}>{won?"SIEG":"NDLG"}</span>
                      </div>
                      <p style={{fontSize:11,color:M}}>
                        {m.season?.city||""}{m.season?.city&&setsStr?" · ":""}{setsStr}
                      </p>
                    </div>

                    {/* Right */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      {elo&&(
                        <p style={{fontSize:13,fontWeight:700,color:elo.delta>=0?"#4ADE80":"#f87171",marginBottom:2}}>
                          {elo.delta>=0?"+":""}{elo.delta}
                        </p>
                      )}
                      {elo&&<p style={{fontSize:11,color:M}}>{elo.elo} ELO</p>}
                      {!elo&&<p style={{fontSize:11,color:M}}>{dateLabel(m.confirmed_at)}</p>}
                    </div>

                  </div>
                )
              })}
            </div>

            {hasMore&&(
              <button onClick={()=>setPage(p=>p+1)} style={{display:"block",width:"100%",marginTop:10,padding:"14px",background:C,border:`1px solid ${B}`,borderRadius:12,color:M,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                Mehr laden ({filtered.length-(page+1)*PER_PAGE} weitere)
              </button>
            )}
          </>
        )}

      </div>
    </main>
  )
}