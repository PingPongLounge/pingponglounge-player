"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1"

type FeedMatch = {
  id: string
  p1_id: string
  p2_id: string
  p1_name: string
  p2_name: string
  sets: Array<{p1:number,p2:number}> | null
  winner_id: string | null
  played_at: string | null
  season_name: string
  season_id: string
  reactions: {type:string,user_id:string}[]
  comments: {id:string,user_id:string,user_name:string,text:string,created_at:string}[]
}

function setsStr(sets: Array<{p1:number,p2:number}>|null): string {
  if (!sets?.length) return ""
  return sets.map(s=>`${s.p1}:${s.p2}`).join("  ")
}
function setsWins(sets: Array<{p1:number,p2:number}>|null) {
  if (!sets) return {p1:0,p2:0}
  return { p1: sets.filter(s=>s.p1>s.p2).length, p2: sets.filter(s=>s.p2>s.p1).length }
}
function ago(d: string): string {
  const h = Math.floor((Date.now()-new Date(d).getTime())/3600000)
  if (h < 1) return "gerade eben"
  if (h < 24) return `vor ${h}h`
  return `vor ${Math.floor(h/24)}d`
}

export default function FeedPage() {
  const [items, setItems]       = useState<FeedMatch[]>([])
  const [userId, setUserId]     = useState<string|null>(null)
  const [loading, setLoading]   = useState(true)
  const [commentText, setCommentText] = useState<Record<string,string>>({})

  async function loadFeed() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    setUserId(user?.id || null)

    const { data } = await sb
      .from("league_matches")
      .select(`
        id, p1_id, p2_id, sets, winner_id, played_at,
        p1:profiles!league_matches_p1_id_fkey(name),
        p2:profiles!league_matches_p2_id_fkey(name),
        season:league_seasons(id,name),
        match_reactions(type,user_id),
        match_comments(id,user_id,text,created_at,profiles(name))
      `)
      .eq("status", "confirmed")
      .order("played_at", { ascending: false })
      .limit(30)

    const mapped = (data || []).map((m: Record<string,unknown>) => ({
      id: m.id as string,
      p1_id: m.p1_id as string,
      p2_id: m.p2_id as string,
      p1_name: (m.p1 as {name:string}|null)?.name || "?",
      p2_name: (m.p2 as {name:string}|null)?.name || "?",
      sets: m.sets as FeedMatch["sets"],
      winner_id: m.winner_id as string|null,
      played_at: m.played_at as string|null,
      season_name: (m.season as {name:string}|null)?.name || "",
      season_id: (m.season as {id:string}|null)?.id || "",
      reactions: (m.match_reactions || []) as {type:string,user_id:string}[],
      comments: ((m.match_comments || []) as Array<{id:string,user_id:string,text:string,created_at:string,profiles:{name:string}|null}>)
        .map(c => ({ ...c, user_name: c.profiles?.name || "?" })),
    }))
    setItems(mapped)
    setLoading(false)
  }

  useEffect(() => { loadFeed() }, [])

  async function handleReact(matchId: string, type: string) {
    if (!userId) return
    const sb = createClient()
    const item = items.find(i=>i.id===matchId)
    const existing = item?.reactions.find(r=>r.user_id===userId&&r.type===type)
    if (existing) {
      await sb.from("match_reactions").delete().eq("match_id",matchId).eq("user_id",userId).eq("type",type)
    } else {
      await sb.from("match_reactions").upsert({match_id:matchId,user_id:userId,type})
    }
    const { data } = await sb.from("match_reactions").select("type,user_id").eq("match_id",matchId)
    setItems(prev=>prev.map(i=>i.id===matchId?{...i,reactions:(data||[]) as {type:string,user_id:string}[]}:i))
  }

  async function handleComment(matchId: string) {
    const text = commentText[matchId]?.trim()
    if (!text || !userId) return
    const sb = createClient()
    await sb.from("match_comments").insert({match_id:matchId,user_id:userId,text})
    setCommentText(p=>({...p,[matchId]:""}))
    const { data } = await sb.from("match_comments").select("id,user_id,text,created_at,profiles(name)").eq("match_id",matchId).order("created_at")
    setItems(prev=>prev.map(i=>i.id===matchId?{...i,comments:((data||[]) as unknown as Array<{id:string,user_id:string,text:string,created_at:string,profiles:{name:string}|null}>).map(c=>({...c,user_name:c.profiles?.name||"?"}))}:i))
  }

  return (
    <main style={{ minHeight:"100vh", background:BG, padding:"0 0 80px" }}>
      {/* Header */}
      <div style={{ padding:"20px 20px 0", maxWidth:560, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Link href="/dashboard" style={{ fontSize:13, color:M, textDecoration:"none" }}>← Dashboard</Link>
        <p style={{ fontSize:11, fontWeight:700, color:G, letterSpacing:"0.14em", textTransform:"uppercase" }}>Activity Feed</p>
        <div style={{ width:60 }}/>
      </div>

      <div style={{ maxWidth:560, margin:"0 auto", padding:"24px 20px 0" }}>
        {loading && <p style={{ textAlign:"center", color:M, padding:40 }}>Lädt...</p>}

        {!loading && items.length === 0 && (
          <div style={{ textAlign:"center", background:C, border:`1px solid ${B}`, borderRadius:16, padding:"48px 20px" }}>
            <p style={{ fontSize:32, marginBottom:12 }}>🏓</p>
            <p style={{ fontSize:16, fontWeight:700, color:W, marginBottom:8 }}>Noch keine Matches</p>
            <p style={{ fontSize:13, color:M }}>Sobald Liga-Matches gespielt werden, erscheinen sie hier.</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {items.map(item => {
            const sw = setsWins(item.sets)
            const counts: Record<string,number> = {}
            item.reactions.forEach(r => { counts[r.type] = (counts[r.type]||0)+1 })
            const myR = new Set(item.reactions.filter(r=>r.user_id===userId).map(r=>r.type))

            return (
              <div key={item.id} style={{ background:C, border:`1px solid ${B}`, borderRadius:16, padding:16, overflow:"hidden" }}>
                {/* Liga-Tag */}
                {item.season_name && (
                  <Link href={`/liga/${item.season_id}`} style={{ fontSize:10, fontWeight:700, color:G, textDecoration:"none", letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:10 }}>
                    🏆 {item.season_name}
                  </Link>
                )}

                {/* Score */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:16, fontWeight:700, color: item.winner_id===item.p1_id ? G : W, flex:1 }}>
                    {item.p1_name}
                  </span>
                  <div style={{ textAlign:"center", padding:"0 12px" }}>
                    <span style={{ fontSize:20, fontWeight:900, color:W, background:B, borderRadius:8, padding:"4px 12px" }}>
                      {sw.p1}:{sw.p2}
                    </span>
                  </div>
                  <span style={{ fontSize:16, fontWeight:700, color: item.winner_id===item.p2_id ? G : W, flex:1, textAlign:"right" }}>
                    {item.p2_name}
                  </span>
                </div>

                {/* Sätze + Zeit */}
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ fontSize:11, color:M }}>{setsStr(item.sets)}</span>
                  {item.played_at && <span style={{ fontSize:11, color:M }}>{ago(item.played_at)}</span>}
                </div>

                {/* Reactions */}
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  {(["clap","fire","ping"] as const).map(type => (
                    <button key={type} onClick={()=>handleReact(item.id,type)} style={{
                      background: myR.has(type) ? `${G}18` : "none",
                      border: `1px solid ${myR.has(type) ? G : B}`,
                      borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13,
                      color: myR.has(type) ? G : M, fontWeight: myR.has(type) ? 700 : 400
                    }}>
                      {type==="clap"?"👏":type==="fire"?"🔥":"🏓"} {counts[type]||0}
                    </button>
                  ))}
                </div>

                {/* Comments */}
                {item.comments.length > 0 && (
                  <div style={{ borderTop:`1px solid ${B}`, paddingTop:10, marginBottom:10 }}>
                    {item.comments.map(c => (
                      <div key={c.id} style={{ marginBottom:6, display:"flex", gap:6, alignItems:"flex-start" }}>
                        <span style={{ fontSize:12, fontWeight:700, color:c.user_id===userId?G:W, flexShrink:0 }}>{c.user_name}</span>
                        <span style={{ fontSize:12, color:M, lineHeight:1.4 }}>{c.text}</span>
                        <span style={{ fontSize:10, color:M, marginLeft:"auto", flexShrink:0 }}>{ago(c.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {userId && (
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      value={commentText[item.id]||""}
                      onChange={e=>setCommentText(p=>({...p,[item.id]:e.target.value}))}
                      onKeyDown={e=>e.key==="Enter"&&handleComment(item.id)}
                      placeholder="Kommentieren..."
                      style={{ flex:1, background:BG, border:`1px solid ${B}`, borderRadius:8, padding:"8px 12px", fontSize:13, color:W, outline:"none", fontFamily:"inherit" }}
                    />
                    <button onClick={()=>handleComment(item.id)} style={{ background:G, color:"#0A0A0C", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:700 }}>→</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
