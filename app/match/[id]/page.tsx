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
type Game = { id: string; created_by: string; location_name: string; date: string | null; start_hour: number | null; duration_minutes: number; max_players: number; current_players: number; price_per_player: number; level: string; status: string; notes: string | null; winner_id?: string | null; entered_by?: string | null; sets?: Array<{p1:number;p2:number}> | null }
type Data = { game: Game; players: Player[]; userId: string | null; isCreator: boolean; isJoined: boolean }

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err, setErr] = useState("")
  const [myS, setMyS] = useState(0)   // Ergebnis-Zähler
  const [oppS, setOppS] = useState(0)

  const load = useCallback(async () => {
    const res = await fetch(`/api/match/${matchId}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [matchId])
  useEffect(() => { load() }, [load])

  async function join() { setBusy(true); setErr(""); const r = await fetch(`/api/match/${matchId}/join`, { method: "POST" }); if (!r.ok) { const j = await r.json(); setErr(j.error || "Fehler") } await load(); setBusy(false) }
  async function leave() { setBusy(true); setErr(""); const r = await fetch(`/api/match/${matchId}/leave`, { method: "POST" }); if (!r.ok) { const j = await r.json(); setErr(j.error || "Fehler") } await load(); setBusy(false) }
  async function del() { setBusy(true); await fetch(`/api/match/${matchId}/cancel`, { method: "POST" }); router.push("/match") }

  async function sendResult(action: "enter" | "confirm") {
    setBusy(true); setErr("")
    const r = await fetch(`/api/match/${matchId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, my_sets: myS, opp_sets: oppS }),
    })
    if (r.status === 401) { window.location.href = "/login"; return }
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || "Fehler") }
    await load(); setBusy(false)
  }

  if (loading || !data) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={body}>Lädt …</p><BottomNav /></main>

  const { game: g, players, isCreator, isJoined, userId } = data
  const full = g.current_players >= g.max_players
  const slots = Array.from({ length: g.max_players })
  const cancelled = g.status === "cancelled"

  // Ergebnisse nur bei Spielen zu zweit — bei 3–4 Spielern ist unklar, wer gegen wen spielte
  const duo = players.length === 2
  const opponent = players.find(p => p.user_id !== userId)
  const enteredByMe = g.entered_by === userId
  const iWon = g.winner_id === userId
  const sets = g.sets || []
  const mySets = sets.filter(s => (g.entered_by === userId ? s.p1 > s.p2 : s.p2 > s.p1)).length
  const oppSets = sets.length - mySets

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
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p ? "#222630" : "transparent", border: p ? "1px solid #353B46" : "1px dashed #3A3D48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: M }}>{p ? "🏓" : "+"}</div>
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

          {/* Ergebnis — bisher gab es das gar nicht: ein Open Game konnte nie enden,
              obwohl die App "Resultat erfassen, dein Rang steigt" versprach. */}
          {isJoined && duo && !cancelled && (<>
            {g.status === "confirmed" ? (
              <div style={{ ...cardPad, padding: "18px 16px", textAlign: "center", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: M, marginBottom: 6 }}>Gewertet</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: G }}>{iWon ? "Sieg" : "Niederlage"}</p>
                <p style={{ ...body, marginTop: 4 }}>ELO und Rangliste sind aktualisiert.</p>
              </div>
            ) : g.status === "p1_entered" ? (
              enteredByMe ? (
                <div style={{ ...cardPad, padding: "16px", textAlign: "center", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: W, marginBottom: 4 }}>Ergebnis eingetragen</p>
                  <p style={{ ...body, lineHeight: 1.5 }}>{opponent?.name || "Dein Gegner"} bekommt eine E-Mail und muss noch bestätigen.</p>
                </div>
              ) : (
                <div style={{ ...cardPad, padding: "18px 16px", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: W, marginBottom: 4, textAlign: "center" }}>Ergebnis bestätigen</p>
                  <p style={{ ...body, textAlign: "center", marginBottom: 12 }}>
                    {opponent?.name || "Dein Gegner"} hat eingetragen: <strong style={{ color: W }}>{mySets}:{oppSets}</strong> für dich
                  </p>
                  <button onClick={() => sendResult("confirm")} disabled={busy} style={{ ...btn, width: "100%", padding: 14, fontSize: 14 }}>
                    {busy ? "…" : "Bestätigen ✓"}
                  </button>
                </div>
              )
            ) : (
              <div style={{ ...cardPad, padding: "18px 16px", marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: W, marginBottom: 3, textAlign: "center" }}>Schon gespielt?</p>
                <p style={{ ...body, textAlign: "center", marginBottom: 16 }}>Trag die Sätze ein — {opponent?.name || "dein Gegner"} bestätigt, dann zählt&apos;s für ELO &amp; Rang.</p>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
                  {([["Du", myS, setMyS], [opponent?.name || "Gegner", oppS, setOppS]] as [string, number, (n: number) => void][]).map(([lab, val, set], idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                      {idx === 1 && <span style={{ fontSize: 26, fontWeight: 900, color: M, paddingBottom: 4 }}>:</span>}
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10.5, color: M, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lab}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button onClick={() => set(Math.max(0, val - 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: B, border: "none", color: W, fontSize: 19, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>−</button>
                          <span style={{ fontSize: 32, fontWeight: 900, width: 30, textAlign: "center", color: G }}>{val}</span>
                          <button onClick={() => set(Math.min(7, val + 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: B, border: "none", color: W, fontSize: 19, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => sendResult("enter")} disabled={busy || myS === oppS} style={{ ...btn, width: "100%", padding: 14, fontSize: 14, marginTop: 18, opacity: myS === oppS ? .5 : 1, cursor: myS === oppS ? "not-allowed" : "pointer" }}>
                  {busy ? "…" : "Ergebnis absenden"}
                </button>
                {myS === oppS && <p style={{ ...body, textAlign: "center", marginTop: 8, fontSize: 12 }}>Kein Unentschieden möglich.</p>}
              </div>
            )}
          </>)}

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
