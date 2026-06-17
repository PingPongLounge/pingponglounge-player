"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"

const BG="#14161A",C="#1B1E25",B="#1E2230",M="rgba(255,255,255,0.62)",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

function timeLabel(d: string): string {
  const dt = new Date(d)
  const now = new Date()
  const diff = dt.getTime() - now.getTime()
  if (diff < 0) return "Jetzt"
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "in < 1h"
  if (h < 24) return `in ${h}h`
  return dt.toLocaleDateString("de-CH", { weekday: "short", hour: "2-digit", minute: "2-digit" })
}
function postedAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "gerade"
  if (m < 60) return `vor ${m}min`
  return `vor ${Math.floor(m / 60)}h`
}

type OpenMatch = {
  id: string
  level: string
  city: string
  proposed_time: string | null
  message: string | null
  status: string
  created_at: string
  creator_id: string
  joiner_id: string | null
  creator: { name: string; elo: number; level: string } | { name: string; elo: number; level: string }[] | null
}

function creatorOf(m: OpenMatch): { name: string; elo: number; level: string } | null {
  if (!m.creator) return null
  if (Array.isArray(m.creator)) return m.creator[0] || null
  return m.creator
}

export default function MatchPage() {
  const router = useRouter()
  const [matches, setMatches]   = useState<OpenMatch[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [myOpen, setMyOpen]     = useState<string | null>(null)  // my open match id
  const [filterLevel, setFilterLevel] = useState("")
  const [filterCity, setFilterCity]   = useState("")
  const [loading, setLoading]   = useState(true)
  const [joining, setJoining]   = useState<string | null>(null)
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
      const list: OpenMatch[] = json.matches || []
      setMatches(list)
      setMyOpen(list.find(m => m.creator_id === user?.id)?.id || null)
    } catch {
      setError("Matches konnten nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function join(id: string) {
    setJoining(id)
    setJoinError("")
    const res = await fetch(`/api/match/${id}/join`, { method: "POST" })
    if (res.ok) {
      router.push(`/match/${id}`)
    } else {
      const json = await res.json()
      setJoinError(json.error || "Fehler beim Beitreten")
      setJoining(null)
    }
  }

  async function cancel(id: string) {
    await fetch(`/api/match/${id}/cancel`, { method: "POST" })
    load()
  }

  const LEVELS = ["Rookie", "Challenger", "Advanced", "Elite"]
  const CITIES = ["Zürich", "Basel", "Luzern", "St. Gallen", "Glattbrugg"]

  const filtered = matches.filter(m =>
    (!filterLevel || m.level === filterLevel) &&
    (!filterCity  || m.city  === filterCity)
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: M, textDecoration: "none", fontSize: 13 }}>← dashboard</Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "20px 0 20px" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, ...GRAD }}>open game</h1>
            <p style={{ fontSize: 13, color: M, marginTop: 8, fontWeight: 400 }}>{matches.length} offen · {filtered.length} angezeigt</p>
          </div>
          {!myOpen ? (
            <Link href="/match/create" style={{ textDecoration: "none" }}>
              <button style={{ background: "#fff", color: "#14161A", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>
                + match
              </button>
            </Link>
          ) : (
            <button onClick={() => cancel(myOpen)} style={{ background: "transparent", color: "rgba(255,255,255,0.85)", border: "1px solid #2A2D38", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "lowercase" }}>
              mein match löschen
            </button>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {LEVELS.map(l => {
            const active = filterLevel === l
            return (
              <button key={l} onClick={() => setFilterLevel(active ? "" : l)} style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", textTransform: "lowercase",
                background: active ? "#fff" : C, border: `1px solid ${active ? "#fff" : B}`, color: active ? "#14161A" : M
              }}>{l}</button>
            )
          })}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {CITIES.map(c => (
            <button key={c} onClick={() => setFilterCity(filterCity === c ? "" : c)} style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: filterCity === c ? 600 : 400, cursor: "pointer", textTransform: "lowercase",
              background: filterCity === c ? "#fff" : C, border: `1px solid ${filterCity === c ? "#fff" : B}`,
              color: filterCity === c ? "#14161A" : M
            }}>{c}</button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: M }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏓</div>
            <p style={{ fontSize: 14 }}>Lädt...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏓</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: W, marginBottom: 8 }}>keine offenen spiele</p>
            <p style={{ fontSize: 13, color: M, marginBottom: 20, fontWeight: 400 }}>stell das erste ein!</p>
            <Link href="/match/create" style={{ textDecoration: "none" }}>
              <button style={{ background: "#fff", color: "#14161A", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>
                match erstellen
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(m => {
              const creator = creatorOf(m)
              const isMe = m.creator_id === userId
              return (
                <div key={m.id} style={{ background: C, border: `1px solid ${isMe ? "rgba(255,255,255,0.25)" : B}`, borderRadius: 16, overflow: "hidden" }}>

                  {/* Top row */}
                  <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: W }}>{creator?.name || "?"}</span>
                        <span style={{ fontSize: 11, color: M, fontWeight: 400 }}>elo {creator?.elo ?? "—"}</span>
                        {isMe && <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "1px 8px", textTransform: "lowercase" }}>dein match</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "2px 9px", textTransform: "lowercase" }}>{m.level}</span>
                        <span style={{ fontSize: 11, color: M, background: "#1A1D24", borderRadius: 999, padding: "2px 8px", fontWeight: 400, textTransform: "lowercase" }}>📍 {m.city}</span>
                        {m.proposed_time && (
                          <span style={{ fontSize: 11, color: M, background: "#1A1D24", borderRadius: 999, padding: "2px 8px", fontWeight: 400, textTransform: "lowercase" }}>🕐 {timeLabel(m.proposed_time)}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: M, flexShrink: 0, marginTop: 2, fontWeight: 400, textTransform: "lowercase" }}>{postedAgo(m.created_at)}</span>
                  </div>

                  {m.message && (
                    <div style={{ padding: "0 16px 10px" }}>
                      <p style={{ fontSize: 12, color: M, fontStyle: "italic", fontWeight: 400 }}>"{m.message}"</p>
                    </div>
                  )}

                  {/* Action */}
                  <div style={{ padding: "10px 16px 14px" }}>
                    {isMe ? (
                      <p style={{ fontSize: 12, color: M, textAlign: "center", fontWeight: 400 }}>warte auf mitspieler...</p>
                    ) : (
                      <button
                        onClick={() => join(m.id)}
                        disabled={joining === m.id}
                        style={{ width: "100%", background: "#fff", color: "#14161A", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}
                      >
                        {joining === m.id ? "trete bei..." : "mitspielen →"}
                      </button>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
      {joinError && (
        <div style={{ position: "fixed", bottom: 80, left: 0, right: 0, padding: "12px 20px", background: "#f87171", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, zIndex: 200 }}>{joinError}</div>
      )}
      <BottomNav />
    </main>
  )
}