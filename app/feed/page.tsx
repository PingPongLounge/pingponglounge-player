"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#111214", C="#15161A", B="#26282E", M="#6B6E7A", G="#39FF14", W="#E8E6E1", PK="#FF00C8"

const levelColor = (l: string): string =>
  ({ Rookie: "#4ADE80", Challenger: "#FACC15", Advanced: "#FB923C", Elite: PK }[l] || G)

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "gerade eben"
  if (m < 60) return `vor ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h}h`
  return `vor ${Math.floor(h / 24)}d`
}

function setsLabel(sets: Array<{p1: number; p2: number}> | null): string {
  if (!sets || !sets.length) return ""
  return sets.map(s => `${s.p1}:${s.p2}`).join("  ")
}

type Profile = { id: string; name: string; elo: number }
type Season  = { name: string; city: string; skill_class: string }
type Reaction = { type: string; user_id: string }

type Match = {
  id: string
  round: number
  sets: Array<{p1: number; p2: number}> | null
  winner_id: string | null
  confirmed_at: string
  season_id: string
  p1_id: string
  p2_id: string
  p1: Profile | null
  p2: Profile | null
  season: Season | null
  match_reactions: Reaction[]
}

export default function FeedPage() {
  const [matches, setMatches]   = useState<Match[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [reacting, setReacting] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      setUserId(user?.id || null)
      const res = await fetch("/api/feed")
      const json = await res.json()
      setMatches(json.matches || [])
    } catch {
      setError("Feed konnte nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function react(matchId: string, type: string) {
    if (!userId || reacting) return
    setReacting(matchId + type)
    const sb = createClient()
    const match = matches.find(m => m.id === matchId)
    const existing = match?.match_reactions?.find(r => r.user_id === userId && r.type === type)

    if (existing) {
      await sb.from("match_reactions").delete()
        .eq("match_id", matchId).eq("user_id", userId).eq("type", type)
    } else {
      await sb.from("match_reactions").upsert({ match_id: matchId, user_id: userId, type })
    }

    // Lokales State-Update ohne Re-Fetch
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m
      const reactions = existing
        ? m.match_reactions.filter(r => !(r.user_id === userId && r.type === type))
        : [...m.match_reactions, { type, user_id: userId! }]
      return { ...m, match_reactions: reactions }
    }))
    setReacting(null)
  }

  const reactionCount = (m: Match, type: string) =>
    m.match_reactions.filter(r => r.type === type).length

  const hasReacted = (m: Match, type: string) =>
    m.match_reactions.some(r => r.user_id === userId && r.type === type)

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* Header */}
        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: M, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
        <div style={{ margin: "20px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.16em", textTransform: "uppercase" }}>Live</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 6px ${G}`, display: "inline-block" }} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1 }}>FEED</h1>
          <p style={{ fontSize: 13, color: M, marginTop: 6 }}>Alle Matches · alle Ligen · alle Städte</p>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: M }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏓</div>
            <p style={{ fontSize: 14 }}>Lädt...</p>
          </div>
        ) : matches.length === 0 ? (
          <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏓</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>Noch keine Matches</p>
            <p style={{ fontSize: 13, color: M }}>Sobald ein Match bestätigt wird, erscheint es hier.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.map(m => {
              const isWinnerP1 = m.winner_id === m.p1_id
              const claps = reactionCount(m, "👏")
              const fire  = reactionCount(m, "🔥")
              const myClap = hasReacted(m, "👏")
              const myFire = hasReacted(m, "🔥")

              return (
                <div key={m.id} style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, overflow: "hidden" }}>

                  {/* Liga Badge */}
                  {m.season && (
                    <div style={{ padding: "8px 16px", borderBottom: `1px solid ${B}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: levelColor(m.season.skill_class), background: `${levelColor(m.season.skill_class)}18`, border: `1px solid ${levelColor(m.season.skill_class)}30`, borderRadius: 999, padding: "2px 8px" }}>
                        {m.season.skill_class}
                      </span>
                      <span style={{ fontSize: 11, color: M }}>{m.season.city} · {m.season.name}</span>
                      <span style={{ fontSize: 11, color: M, marginLeft: "auto" }}>{timeAgo(m.confirmed_at)}</span>
                    </div>
                  )}

                  {/* Match */}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                      {/* P1 */}
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: isWinnerP1 ? G : W, lineHeight: 1.2 }}>
                          {isWinnerP1 && <span style={{ fontSize: 11, marginRight: 4 }}>👑</span>}
                          {m.p1?.name || "?"}
                        </p>
                        <p style={{ fontSize: 11, color: M, marginTop: 2 }}>ELO {m.p1?.elo ?? "—"}</p>
                      </div>

                      {/* Score */}
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <p style={{ fontSize: 18, fontWeight: 900, color: W, letterSpacing: 2 }}>
                          {isWinnerP1 ? "3" : "—"} : {isWinnerP1 ? "—" : "3"}
                        </p>
                        {m.sets && (
                          <p style={{ fontSize: 10, color: M, marginTop: 2 }}>{setsLabel(m.sets)}</p>
                        )}
                      </div>

                      {/* P2 */}
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: !isWinnerP1 && m.winner_id ? G : W, lineHeight: 1.2 }}>
                          {!isWinnerP1 && m.winner_id && <span style={{ fontSize: 11, marginRight: 4 }}>👑</span>}
                          {m.p2?.name || "?"}
                        </p>
                        <p style={{ fontSize: 11, color: M, marginTop: 2 }}>ELO {m.p2?.elo ?? "—"}</p>
                      </div>

                    </div>
                  </div>

                  {/* Reactions */}
                  <div style={{ padding: "8px 16px 12px", display: "flex", gap: 8 }}>
                    {(["👏", "🔥"] as const).map(emoji => {
                      const count = emoji === "👏" ? claps : fire
                      const active = emoji === "👏" ? myClap : myFire
                      return (
                        <button
                          key={emoji}
                          onClick={() => react(m.id, emoji)}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            background: active ? `${G}18` : B,
                            border: `1px solid ${active ? G + "40" : B}`,
                            borderRadius: 999, padding: "5px 12px",
                            fontSize: 13, color: active ? G : M,
                            cursor: userId ? "pointer" : "default",
                            transition: "all .15s"
                          }}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span style={{ fontSize: 12, fontWeight: 700 }}>{count}</span>}
                        </button>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}