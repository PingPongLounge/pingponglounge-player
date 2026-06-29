"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"

const BG="#0E1014",C="#1A1D24",B="#23272F",M="rgba(255,255,255,0.85)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

function whenLabel(date: string | null, hour: number | null): string {
  if (!date) return hour != null ? `${String(hour).padStart(2,"0")}:00` : "zeit offen"
  const d = new Date(date)
  const ds = d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" })
  return hour != null ? `${ds} · ${String(hour).padStart(2,"0")}:00` : ds
}

type Player = { user_id: string; name: string; elo: number; level: string }
type Game = {
  id: string; created_by: string; location_name: string; date: string | null; start_hour: number | null
  duration_minutes: number; max_players: number; current_players: number; price_per_player: number
  level: string; status: string; notes: string | null; created_at: string; players: Player[]
}

export default function MatchPage() {
  const router = useRouter()
  const [games, setGames]     = useState<Game[]>([])
  const [userId, setUserId]   = useState<string | null>(null)
  const [myGame, setMyGame]   = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState("")
  const [filterCity, setFilterCity]   = useState("")
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError]         = useState("")
  const [joinError, setJoinError] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      setUserId(user?.id || null)
      const res = await fetch("/api/match")
      const json = await res.json()
      const list: Game[] = json.matches || []
      setGames(list)
      setMyGame(list.find(g => g.created_by === user?.id)?.id || null)
    } catch {
      setError("Spiele konnten nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function join(id: string) {
    setJoining(id); setJoinError("")
    const res = await fetch(`/api/match/${id}/join`, { method: "POST" })
    if (res.ok) router.push(`/match/${id}`)
    else { const j = await res.json(); setJoinError(j.error || "Fehler beim Beitreten"); setJoining(null) }
  }

  async function cancel(id: string) { await fetch(`/api/match/${id}/cancel`, { method: "POST" }); load() }

  const LEVELS = ["Rookie", "Challenger", "Advanced", "Elite"]
  const CITIES = ["Glattbrugg", "Oerlikon", "Zürich", "Winterthur", "Baden"]

  const filtered = games.filter(g =>
    (!filterLevel || g.level === filterLevel) &&
    (!filterCity  || g.location_name === filterCity)
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: M, textDecoration: "none", fontSize: 13 }}>← dashboard</Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "20px 0 20px" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, ...GRAD }}>open game</h1>
            <p style={{ fontSize: 13, color: M, marginTop: 8, fontWeight: 500 }}>{games.length} offen · {filtered.length} angezeigt</p>
          </div>
          {!myGame ? (
            <Link href="/match/create" style={{ textDecoration: "none" }}>
              <button style={{ background: "#fff", color: "#0E1014", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>+ spiel</button>
            </Link>
          ) : (
            <button onClick={() => cancel(myGame)} style={{ background: "transparent", color: "rgba(255,255,255,0.85)", border: "1px solid #23272F", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "lowercase" }}>mein spiel löschen</button>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {LEVELS.map(l => { const active = filterLevel === l; return (
            <button key={l} onClick={() => setFilterLevel(active ? "" : l)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", textTransform: "lowercase", background: active ? "#fff" : C, border: `1px solid ${active ? "#fff" : B}`, color: active ? "#0E1014" : M }}>{l}</button>
          )})}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {CITIES.map(c => (
            <button key={c} onClick={() => setFilterCity(filterCity === c ? "" : c)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: filterCity === c ? 600 : 400, cursor: "pointer", textTransform: "lowercase", background: filterCity === c ? "#fff" : C, border: `1px solid ${filterCity === c ? "#fff" : B}`, color: filterCity === c ? "#0E1014" : M }}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: M }}><div style={{ fontSize: 32, marginBottom: 12 }}>🏓</div><p style={{ fontSize: 14 }}>lädt...</p></div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: M }}><p style={{ marginBottom: 16 }}>{error}</p><button onClick={load} style={{ background: "#fff", color: "#0E1014", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>nochmals</button></div>
        ) : filtered.length === 0 ? (
          <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏓</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: W, marginBottom: 8 }}>keine offenen spiele</p>
            <p style={{ fontSize: 13, color: M, marginBottom: 20, fontWeight: 500 }}>erstell das erste!</p>
            <Link href="/match/create" style={{ textDecoration: "none" }}><button style={{ background: "#fff", color: "#0E1014", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>open game erstellen</button></Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(g => {
              const isMe = g.created_by === userId
              const joined = g.players.some(p => p.user_id === userId)
              const host = g.players.find(p => p.user_id === g.created_by) || g.players[0]
              const full = g.current_players >= g.max_players
              return (
                <div key={g.id} style={{ background: C, border: `1px solid ${isMe ? "rgba(255,255,255,0.25)" : B}`, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px 10px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: W }}>{host?.name || "Spieler"}</span>
                          <span style={{ fontSize: 11, color: M, fontWeight: 500 }}>elo {host?.elo ?? "—"}</span>
                          {isMe && <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "1px 8px", textTransform: "lowercase" }}>dein spiel</span>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "2px 9px", textTransform: "lowercase" }}>{g.level}</span>
                          <span style={{ fontSize: 11, color: M, background: "#1A1D24", borderRadius: 999, padding: "2px 8px", fontWeight: 500, textTransform: "lowercase" }}>📍 {g.location_name}</span>
                          <span style={{ fontSize: 11, color: M, background: "#1A1D24", borderRadius: 999, padding: "2px 8px", fontWeight: 500, textTransform: "lowercase" }}>🕐 {whenLabel(g.date, g.start_hour)}</span>
                          {g.price_per_player > 0
                            ? <span style={{ fontSize: 11, color: M, background: "#1A1D24", borderRadius: 999, padding: "2px 8px", fontWeight: 500, textTransform: "lowercase" }}>💰 chf {g.price_per_player}</span>
                            : <span style={{ fontSize: 11, color: G, background: "#1A1D24", borderRadius: 999, padding: "2px 8px", fontWeight: 500, textTransform: "lowercase" }}>gratis</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: full ? M : G, flexShrink: 0, marginTop: 2, textTransform: "lowercase" }}>{g.current_players}/{g.max_players}</span>
                    </div>
                    {g.notes && <p style={{ fontSize: 12, color: M, fontStyle: "italic", fontWeight: 500, margin: "2px 0 4px" }}>&quot;{g.notes}&quot;</p>}
                  </div>
                  <div style={{ padding: "4px 16px 14px" }}>
                    {isMe || joined ? (
                      <Link href={`/match/${g.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ width: "100%", textAlign: "center", background: "transparent", color: "rgba(255,255,255,0.85)", border: "1px solid #23272F", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "lowercase" }}>{isMe ? "dein spiel ansehen" : "du bist dabei · ansehen"}</div>
                      </Link>
                    ) : full ? (
                      <p style={{ fontSize: 12, color: M, textAlign: "center", fontWeight: 500, textTransform: "lowercase" }}>voll</p>
                    ) : (
                      <button onClick={() => join(g.id)} disabled={joining === g.id} style={{ width: "100%", background: "#fff", color: "#0E1014", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>{joining === g.id ? "trete bei..." : "mitspielen →"}</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {joinError && <div style={{ position: "fixed", bottom: 80, left: 0, right: 0, padding: "12px 20px", background: "#f87171", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, zIndex: 200 }}>{joinError}</div>}
      <BottomNav />
    </main>
  )
}
