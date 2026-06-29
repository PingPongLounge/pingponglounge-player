"use client"
import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BottomNav from "@/app/components/BottomNav"
import { BG, CARD, CELL, W, MUT, GREEN, DANGER, card, cardPad, cell, btn, btnGhost, btnDanger, levelBadge, h1, body, backLink } from "@/app/theme"

const M=MUT, C=CARD, B=CELL, G=GREEN

function whenLabel(date: string | null, hour: number | null, dur: number): string {
  const t = hour != null ? `${String(hour).padStart(2,"0")}:00` : null
  if (!date) return t ? `heute · ${t}` : "Zeit offen"
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

  if (loading || !data) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={body}>Lädt …</p><BottomNav /></main>

  const { game: g, players, isCreator, isJoined } = data
  const full = g.current_players >= g.max_players
  const slots = Array.from({ length: g.max_players })
  const cancelled = g.status === "cancelled"

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/match" style={backLink}>← Open Game</Link>

        <div style={{ margin: "20px 0 20px", textAlign: "center" }}>
          <span style={levelBadge(g.level)}>{g.level}</span>
          <h1 style={{ ...h1, fontSize: 26, margin: "12px 0 8px" }}>Open Game</h1>
          <p style={body}>📍 {g.location_name} · 🕐 {whenLabel(g.date, g.start_hour, g.duration_minutes)}</p>
          <p style={{ ...body, color: g.price_per_player > 0 ? M : G, marginTop: 4 }}>{g.price_per_player > 0 ? `💰 CHF ${g.price_per_player} pro Spieler` : "Gratis"}</p>
        </div>

        {cancelled ? (
          <div style={{ ...cardPad, textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: DANGER }}>Dieses Spiel wurde abgesagt</p>
          </div>
        ) : (<>
          {/* Spieler-Slots */}
          <div style={{ ...cardPad, marginBottom: 12 }}>
            <p style={{ ...body, marginBottom: 12 }}>{g.current_players}/{g.max_players} Spieler dabei</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {slots.map((_, i) => {
                const p = players[i]
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", ...cell, border: p ? "none" : "1px dashed #3A3D48" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p ? "#222630" : "transparent", border: p ? "1px solid #23272F" : "1px dashed #3A3D48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: M }}>{p ? "🏓" : "+"}</div>
                    {p ? (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: W }}>{p.name}</span>
                        {p.is_creator && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginLeft: 6, border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "1px 6px" }}>Host</span>}
                        <p style={{ fontSize: 11, color: M, fontWeight: 500 }}>Elo {p.elo} · {p.level}</p>
                      </div>
                    ) : (
                      <span style={{ flex: 1, ...body }}>Freier Platz</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {g.notes && <div style={{ ...cardPad, padding: "12px 16px", marginBottom: 12 }}><p style={{ ...body, fontStyle: "italic" }}>&quot;{g.notes}&quot;</p></div>}

          {err && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{err}</p>}

          {/* Aktion */}
          {isCreator ? (
            confirmDelete ? (
              <div style={{ ...cardPad, padding: "14px 16px" }}>
                <p style={{ fontSize: 13, color: DANGER, fontWeight: 700, marginBottom: 10 }}>Spiel wirklich löschen?</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ ...btnGhost, flex: 1, padding: 10, fontSize: 13 }}>Abbrechen</button>
                  <button onClick={del} disabled={busy} style={{ ...btnDanger, flex: 1, padding: 10, fontSize: 13 }}>{busy ? "…" : "Ja, löschen"}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ ...btnGhost, width: "100%", padding: 13, fontSize: 13 }}>Spiel löschen</button>
            )
          ) : isJoined ? (
            <button onClick={leave} disabled={busy} style={{ ...btnGhost, width: "100%", padding: 14 }}>{busy ? "…" : "Doch nicht · Platz freigeben"}</button>
          ) : full ? (
            <div style={{ ...cardPad, textAlign: "center" }}><p style={{ fontSize: 14, fontWeight: 700, color: M }}>Spiel ist voll</p></div>
          ) : (
            <button onClick={join} disabled={busy} style={{ ...btn, width: "100%", padding: 15, fontSize: 15 }}>{busy ? "Trete bei …" : "Mitspielen →"}</button>
          )}
        </>)}
      </div>
      <BottomNav />
    </main>
  )
}
