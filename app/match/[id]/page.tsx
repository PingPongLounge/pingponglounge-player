"use client"
import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BottomNav from "@/app/components/BottomNav"

const BG="#0E1013",C="#171A1F",B="#232833",M="rgba(255,255,255,0.85)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

function whenLabel(date: string | null, hour: number | null, dur: number): string {
  const t = hour != null ? `${String(hour).padStart(2,"0")}:00` : null
  if (!date) return t ? `heute · ${t}` : "zeit offen"
  const d = new Date(date).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })
  return `${d}${t ? ` · ${t}` : ""} · ${dur}min`
}

type Player = { user_id: string; name: string; elo: number; level: string; is_creator: boolean }
type Game = { id: string; created_by: string; location_name: string; date: string | null; start_hour: number | null; duration_minutes: number; max_players: number; current_players: number; price_per_player: number; level: string; status: string; notes: string | null }
type Data = { game: Game; players: Player[]; userId: string | null; isCreator: boolean; isJoined: boolean }

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err, setErr] = useState("")

  const load = useCallback(async () => {
    const res = await fetch(`/api/match/${matchId}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [matchId])
  useEffect(() => { load() }, [load])

  async function join() { setBusy(true); setErr(""); const r = await fetch(`/api/match/${matchId}/join`, { method: "POST" }); if (!r.ok) { const j = await r.json(); setErr(j.error || "Fehler") } await load(); setBusy(false) }
  async function leave() { setBusy(true); setErr(""); const r = await fetch(`/api/match/${matchId}/leave`, { method: "POST" }); if (!r.ok) { const j = await r.json(); setErr(j.error || "Fehler") } await load(); setBusy(false) }
  async function del() { setBusy(true); await fetch(`/api/match/${matchId}/cancel`, { method: "POST" }); router.push("/match") }

  if (loading || !data) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: M, fontWeight: 400, textTransform: "lowercase" }}>lädt...</p><BottomNav /></main>

  const { game: g, players, isCreator, isJoined } = data
  const full = g.current_players >= g.max_players
  const slots = Array.from({ length: g.max_players })
  const cancelled = g.status === "cancelled"

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/match" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← open game</Link>

        <div style={{ margin: "20px 0 20px", textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em", textTransform: "lowercase", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "3px 10px" }}>{g.level}</span>
          <h1 style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", margin: "12px 0 8px", ...GRAD }}>open game</h1>
          <p style={{ fontSize: 13, color: M, fontWeight: 400, textTransform: "lowercase" }}>📍 {g.location_name} · 🕐 {whenLabel(g.date, g.start_hour, g.duration_minutes)}</p>
          <p style={{ fontSize: 13, color: g.price_per_player > 0 ? M : G, fontWeight: 400, marginTop: 4, textTransform: "lowercase" }}>{g.price_per_player > 0 ? `💰 chf ${g.price_per_player} pro spieler` : "gratis"}</p>
        </div>

        {cancelled ? (
          <div style={{ background: "#f8717112", border: "1px solid #f8717130", borderRadius: 12, padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f87171", textTransform: "lowercase" }}>dieses spiel wurde abgesagt</p>
          </div>
        ) : (<>
          {/* Spieler-Slots */}
          <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "16px", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: M, marginBottom: 12, textTransform: "lowercase", fontWeight: 400 }}>{g.current_players}/{g.max_players} spieler dabei</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {slots.map((_, i) => {
                const p = players[i]
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#1A1D24", borderRadius: 10, border: p ? "none" : "1px dashed #3A3D48" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p ? "#222630" : "transparent", border: p ? "1px solid #2A2D38" : "1px dashed #3A3D48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: M }}>{p ? "🏓" : "+"}</div>
                    {p ? (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: W }}>{p.name}</span>
                        {p.is_creator && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginLeft: 6, textTransform: "lowercase", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "1px 6px" }}>host</span>}
                        <p style={{ fontSize: 11, color: M, fontWeight: 400 }}>elo {p.elo} · {p.level}</p>
                      </div>
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, color: M, fontWeight: 400, textTransform: "lowercase" }}>freier platz</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {g.notes && <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}><p style={{ fontSize: 13, color: M, fontStyle: "italic", fontWeight: 400 }}>&quot;{g.notes}&quot;</p></div>}

          {err && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{err}</p>}

          {/* Aktion */}
          {isCreator ? (
            confirmDelete ? (
              <div style={{ background: "#f8717110", border: "1px solid #f8717140", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 13, color: "#f87171", fontWeight: 600, marginBottom: 10, textTransform: "lowercase" }}>spiel wirklich löschen?</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, background: "transparent", color: "rgba(255,255,255,0.85)", border: `1px solid #2A2D38`, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "lowercase" }}>abbrechen</button>
                  <button onClick={del} disabled={busy} style={{ flex: 1, background: "#f87171", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>{busy ? "..." : "ja, löschen"}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", background: "transparent", color: "rgba(255,255,255,0.85)", border: `1px solid #2A2D38`, borderRadius: 10, padding: "13px", fontSize: 13, cursor: "pointer", fontWeight: 500, textTransform: "lowercase" }}>spiel löschen</button>
            )
          ) : isJoined ? (
            <button onClick={leave} disabled={busy} style={{ width: "100%", background: "transparent", color: "rgba(255,255,255,0.85)", border: `1px solid #2A2D38`, borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 500, cursor: "pointer", textTransform: "lowercase" }}>{busy ? "..." : "doch nicht · platz freigeben"}</button>
          ) : full ? (
            <div style={{ background: `${G}10`, border: `1px solid ${B}`, borderRadius: 12, padding: "14px", textAlign: "center" }}><p style={{ fontSize: 14, fontWeight: 600, color: M, textTransform: "lowercase" }}>spiel ist voll</p></div>
          ) : (
            <button onClick={join} disabled={busy} style={{ width: "100%", background: "#fff", color: "#14161A", border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer", textTransform: "lowercase" }}>{busy ? "trete bei..." : "mitspielen →"}</button>
          )}
        </>)}
      </div>
      <BottomNav />
    </main>
  )
}
