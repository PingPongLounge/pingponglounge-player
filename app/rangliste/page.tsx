"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#0E1014",C="#1A1D24",B="#1A1D24",M="rgba(255,255,255,0.66)",G="#39FF14",W="#FFFFFF",PK="#1FD1C4"
const GRAD="linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"
const levelColor=(l:string)=>({Rookie:"#4ADE80",Challenger:"#FACC15",Advanced:"#FB923C",Elite:PK}[l]||G)

const CANTONS = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR",
  "JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG",
  "TI","UR","VD","VS","ZG","ZH"
]

const RANK_COLORS: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" }
const RANK_EMOJI: Record<number, string>  = { 1: "🥇", 2: "🥈", 3: "🥉" }

type Player = {
  id: string
  name: string
  elo: number
  level: string
  matches_played: number
  matches_won: number
  canton: string | null
  rank: number
}

export default function RanglistePage() {
  const [players, setPlayers]     = useState<Player[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [myRank, setMyRank]       = useState<number | null>(null)
  const [canton, setCanton]       = useState("")
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async (ct: string) => {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    setUserId(user?.id || null)

    const url = ct ? `/api/rangliste?canton=${ct}` : "/api/rangliste"
    const res  = await fetch(url)
    const json = await res.json()
    const list: Player[] = json.players || []
    setPlayers(list)

    // Eigenen Rang finden
    const me = list.find(p => p.id === user?.id)
    setMyRank(me?.rank || null)
    setLoading(false)
  }, [])

  useEffect(() => { load(canton) }, [canton, load])

  const top3    = players.slice(0, 3)
  const rest    = players.slice(3)
  const myEntry = players.find(p => p.id === userId)

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: M, textDecoration: "none", fontSize: 13 }}>← dashboard</Link>

        {/* Header */}
        <div style={{ margin: "20px 0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'League Spartan', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>rangliste</h1>
          <p style={{ fontSize: 13, color: M, marginTop: 6 }}>
            {canton ? `Kanton ${canton}` : "schweiz national"} · {players.length} spieler
          </p>
        </div>

        {/* Mein Rang — oben fixiert wenn nicht in Top 3 */}
        {myEntry && myEntry.rank > 3 && (
          <div style={{ background: `${G}12`, border: `1px solid ${G}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: G, minWidth: 36 }}>#{myEntry.rank}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: G }}>dein rang</p>
              <p style={{ fontSize: 11, color: M }}>{myEntry.elo} ELO · {myEntry.level}</p>
            </div>
            <span style={{ fontSize: 12, color: M }}>{myEntry.matches_played > 0 ? `${Math.round((myEntry.matches_won / myEntry.matches_played) * 100)}% WR` : "—"}</span>
          </div>
        )}

        {/* Filter Kantone */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setCanton("")} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: !canton ? "#fff" : C, border: `1px solid ${!canton ? "#fff" : B}`, color: !canton ? "#0E1014" : M
            }}>🇨🇭 national</button>
            {CANTONS.map(c => (
              <button key={c} onClick={() => setCanton(canton === c ? "" : c)} style={{
                padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: canton === c ? "#fff" : C, border: `1px solid ${canton === c ? "#fff" : B}`, color: canton === c ? "#0E1014" : M
              }}>{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: M }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏓</div>
            <p style={{ fontSize: 14 }}>lädt...</p>
          </div>
        ) : players.length === 0 ? (
          <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏓</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>noch keine spieler</p>
            <p style={{ fontSize: 13, color: M }}>spiel dein erstes match um auf die rangliste zu kommen.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podest */}
            {top3.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {top3.map(p => {
                  const isMe = p.id === userId
                  const rc   = RANK_COLORS[p.rank] || G
                  const emoji = RANK_EMOJI[p.rank] || ""
                  const lc   = levelColor(p.level)
                  const wr   = p.matches_played > 0 ? Math.round((p.matches_won / p.matches_played) * 100) : 0
                  return (
                    <div key={p.id} style={{
                      background: isMe ? `${G}08` : C,
                      border: `1px solid ${isMe ? G + "40" : rc + "30"}`,
                      borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                      display: "flex", alignItems: "center", gap: 14
                    }}>
                      {/* Rank */}
                      <div style={{ textAlign: "center", minWidth: 40 }}>
                        <div style={{ fontSize: 22 }}>{emoji}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: rc }}># {p.rank}</div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: isMe ? G : W }}>{p.name}</span>
                          {isMe && <span style={{ fontSize: 9, color: G, background: `${G}18`, borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>du</span>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: lc, background: `${lc}15`, borderRadius: 999, padding: "1px 7px" }}>{p.level}</span>
                          {p.canton && <span style={{ fontSize: 10, color: M }}>{p.canton}</span>}
                          <span style={{ fontSize: 10, color: M }}>{p.matches_played} Matches · {wr}% WR</span>
                        </div>
                      </div>

                      {/* ELO */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: rc, lineHeight: 1 }}>{p.elo}</div>
                        <div style={{ fontSize: 10, color: M, marginTop: 2 }}>ELO</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rest der Liste */}
            {rest.length > 0 && (
              <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden" }}>
                {rest.map((p, i) => {
                  const isMe = p.id === userId
                  const lc   = levelColor(p.level)
                  const wr   = p.matches_played > 0 ? Math.round((p.matches_won / p.matches_played) * 100) : 0
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 16px",
                      borderBottom: i < rest.length - 1 ? `1px solid ${B}` : "none",
                      background: isMe ? `${G}08` : "transparent"
                    }}>
                      {/* Rank */}
                      <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? G : M, minWidth: 28, textAlign: "right" }}>#{p.rank}</span>

                      {/* Name + Level */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isMe ? G : W }}>{p.name}</span>
                          {isMe && <span style={{ fontSize: 9, color: G, background: `${G}18`, borderRadius: 999, padding: "1px 5px", fontWeight: 700 }}>du</span>}
                        </div>
                        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: lc }}>{p.level}</span>
                          {p.canton && <span style={{ fontSize: 10, color: M }}>· {p.canton}</span>}
                          <span style={{ fontSize: 10, color: M }}>· {wr}% WR</span>
                        </div>
                      </div>

                      {/* ELO */}
                      <span style={{ fontSize: 15, fontWeight: 800, color: isMe ? G : W }}>{p.elo}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
      <BottomNav />
    </main>
  )
}