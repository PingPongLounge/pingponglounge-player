"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, W, MUT, gt, card, h1, meta, body, chipBtn, levelBadge, lvColor, ratingLabel } from "@/app/theme"

const G="#57CF79"

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

        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: MUT, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>

        {/* Header */}
        <div style={{ margin: "20px 0 24px" }}>
          <h1 style={{ ...h1, fontFamily: "'League Spartan', system-ui, sans-serif" }}>Rangliste</h1>
          <p style={{ ...meta, marginTop: 6 }}>
            {canton ? `Kanton ${canton}` : "Schweiz national"} · {players.length} Spieler
          </p>
        </div>

        {/* Mein Rang — oben fixiert wenn nicht in Top 3 */}
        {myEntry && myEntry.rank > 3 && (
          <div style={{ ...card, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ ...gt, fontSize: 18, fontWeight: 900, minWidth: 36 }}>#{myEntry.rank}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: W }}>Dein Rang</p>
              <p style={{ ...meta, fontSize:12.5 }}>Rating {ratingLabel(myEntry.elo)} · {myEntry.level}</p>
            </div>
            <span style={{ ...meta, fontSize: 12 }}>{myEntry.matches_played > 0 ? `${Math.round((myEntry.matches_won / myEntry.matches_played) * 100)}% WR` : "—"}</span>
          </div>
        )}

        {/* Filter Kantone */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setCanton("")} style={chipBtn(!canton)}>🇨🇭 National</button>
            {CANTONS.map(c => (
              <button key={c} onClick={() => setCanton(canton === c ? "" : c)} style={chipBtn(canton === c)}>{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: MUT }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏓</div>
            <p style={{ fontSize: 14 }}>lädt...</p>
          </div>
        ) : players.length === 0 ? (
          <div style={{ ...card, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏓</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>Noch keine Spieler</p>
            <p style={{ ...body }}>Spiel dein erstes Match um auf die Rangliste zu kommen.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podest */}
            {top3.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {top3.map(p => {
                  const isMe = p.id === userId
                  const rc   = RANK_COLORS[p.rank] || W
                  const emoji = RANK_EMOJI[p.rank] || ""
                  const wr   = p.matches_played > 0 ? Math.round((p.matches_won / p.matches_played) * 100) : 0
                  return (
                    <div key={p.id} style={{
                      ...card,
                      ...(isMe ? { background: "rgba(255,255,255,.14)" } : {}),
                      padding: "14px 16px", marginBottom: 8,
                      display: "flex", alignItems: "center", gap: 14
                    }}>
                      {/* Rank */}
                      <div style={{ textAlign: "center", minWidth: 40 }}>
                        <div style={{ fontSize: 22 }}>{emoji}</div>
                        <div style={{ fontSize:12, fontWeight: 700, color: rc }}># {p.rank}</div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: W }}>{p.name}</span>
                          {isMe && <span style={{ fontSize: 9, color: G, background: `${G}18`, borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>du</span>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={levelBadge(p.level)}>{p.level}</span>
                          {p.canton && <span style={{ ...meta, fontSize:12 }}>{p.canton}</span>}
                          <span style={{ ...meta, fontSize:12 }}>{p.matches_played} Matches · {wr}% WR</span>
                        </div>
                      </div>

                      {/* ELO */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: W, lineHeight: 1 }}>{ratingLabel(p.elo)}</div>
                        <div style={{ ...meta, fontSize:12, marginTop: 2 }}>Rating</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rest der Liste */}
            {rest.length > 0 && (
              <div style={{ ...card }}>
                {rest.map((p, i) => {
                  const isMe = p.id === userId
                  const wr   = p.matches_played > 0 ? Math.round((p.matches_won / p.matches_played) * 100) : 0
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 16px",
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,.06)" : "none",
                      background: isMe ? `${G}08` : "transparent"
                    }}>
                      {/* Rank */}
                      <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? G : MUT, minWidth: 28, textAlign: "right" }}>#{p.rank}</span>

                      {/* Name + Level */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isMe ? G : W }}>{p.name}</span>
                          {isMe && <span style={{ fontSize: 9, color: G, background: `${G}18`, borderRadius: 999, padding: "1px 5px", fontWeight: 700 }}>du</span>}
                        </div>
                        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                          <span style={{ fontSize:12, color: lvColor(p.level) }}>{p.level}</span>
                          {p.canton && <span style={{ ...meta, fontSize:12 }}>· {p.canton}</span>}
                          <span style={{ ...meta, fontSize:12 }}>· {wr}% WR</span>
                        </div>
                      </div>

                      {/* ELO */}
                      <span style={{ fontSize: 15, fontWeight: 800, color: isMe ? G : W }}>{ratingLabel(p.elo)}</span>
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