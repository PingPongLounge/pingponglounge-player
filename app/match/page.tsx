"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8"
const levelColor = (l: string) => ({ Locker: "#4ADE80", Hobby: "#FACC15", Fortgeschritten: "#FB923C", Competitive: PK }[l] || G)

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

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    setUserId(user?.id || null)

    const res = await fetch("/api/match")
    const json = await res.json()
    const list: OpenMatch[] = json.matches || []
    setMatches(list)
    setMyOpen(list.find(m => m.creator_id === user?.id)?.id || null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function join(id: string) {
    setJoining(id)
    const res = await fetch(`/api/match/${id}/join`, { method: "POST" })
    if (res.ok) {
      router.push(`/match/${id}`)
    } else {
      const json = await res.json()
      alert(json.error || "Fehler")
      setJoining(null)
    }
  }

  async function cancel(id: string) {
    await fetch(`/api/match/${id}/cancel`, { method: "POST" })
    load()
  }

  const LEVELS = ["Locker", "Hobby", "Fortgeschritten", "Competitive"]
  const CITIES = ["Zürich", "Basel", "Luzern", "St. Gallen", "Glattbrugg"]

  const filtered = matches.filter(m =>
    (!filterLevel || m.level === filterLevel) &&
    (!filterCity  || m.city  === filterCity)
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <Link href="/dashboard" style={{position:"absolute",left:0,right:0,display:"flex",justifyContent:"center", color: M, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "20px 0 20px" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1 }}>OPEN MATCHES</h1>
            <p style={{ fontSize: 13, color: M, marginTop: 6 }}>{matches.length} offen · {filtered.length} angezeigt</p>
          </div>
          {!myOpen ? (
            <Link href="/match/create" style={{ textDecoration: "none" }}>
              <button style={{ background: G, color: "#0A0A0C", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                + Match
              </button>
            </Link>
          ) : (
            <button onClick={() => cancel(myOpen)} style={{ background: C, color: "#f87171", border: "1px solid #3d1515", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Mein Match löschen
            </button>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {LEVELS.map(l => {
            const lc = levelColor(l)
            const active = filterLevel === l
            return (
              <button key={l} onClick={() => setFilterLevel(active ? "" : l)} style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: active ? `${lc}20` : C, border: `1px solid ${active ? lc : B}`, color: active ? lc : M
              }}>{l}</button>
            )
          })}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {CITIES.map(c => (
            <button key={c} onClick={() => setFilterCity(filterCity === c ? "" : c)} style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: filterCity === c ? `${G}18` : C, border: `1px solid ${filterCity === c ? G : B}`,
              color: filterCity === c ? G : M
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
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>Keine offenen Matches</p>
            <p style={{ fontSize: 13, color: M, marginBottom: 20 }}>Stell das erste ein!</p>
            <Link href="/match/create" style={{ textDecoration: "none" }}>
              <button style={{ background: G, color: "#0A0A0C", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Match erstellen
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(m => {
              const creator = creatorOf(m)
              const lc = levelColor(m.level)
              const isMe = m.creator_id === userId
              return (
                <div key={m.id} style={{ background: C, border: `1px solid ${isMe ? G + "40" : B}`, borderRadius: 16, overflow: "hidden" }}>

                  {/* Top row */}
                  <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: W }}>{creator?.name || "?"}</span>
                        <span style={{ fontSize: 11, color: M }}>ELO {creator?.elo ?? "—"}</span>
                        {isMe && <span style={{ fontSize: 10, fontWeight: 700, color: G, background: `${G}18`, borderRadius: 999, padding: "1px 7px" }}>Dein Match</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: lc, background: `${lc}15`, border: `1px solid ${lc}30`, borderRadius: 999, padding: "2px 8px" }}>{m.level}</span>
                        <span style={{ fontSize: 11, color: M, background: B, borderRadius: 999, padding: "2px 8px" }}>📍 {m.city}</span>
                        {m.proposed_time && (
                          <span style={{ fontSize: 11, color: M, background: B, borderRadius: 999, padding: "2px 8px" }}>🕐 {timeLabel(m.proposed_time)}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: M, flexShrink: 0, marginTop: 2 }}>{postedAgo(m.created_at)}</span>
                  </div>

                  {m.message && (
                    <div style={{ padding: "0 16px 10px" }}>
                      <p style={{ fontSize: 12, color: M, fontStyle: "italic" }}>"{m.message}"</p>
                    </div>
                  )}

                  {/* Action */}
                  <div style={{ padding: "10px 16px 14px" }}>
                    {isMe ? (
                      <p style={{ fontSize: 12, color: M, textAlign: "center" }}>Warte auf Mitspieler...</p>
                    ) : (
                      <button
                        onClick={() => join(m.id)}
                        disabled={joining === m.id}
                        style={{ width: "100%", background: G, color: "#0A0A0C", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" }}
                      >
                        {joining === m.id ? "Trete bei..." : "Beitreten →"}
                      </button>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}