"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type Assignment = {
  id: string
  opponent_id: string
  opponent_name: string
  opponent_elo: number | null
  opponent_avatar: string | null
  round: number
  status: string
  deadline: string | null
  confirmed_at: string | null
  ranked: boolean
  i_am_p1: boolean
}

type Season = {
  id: string
  name: string
  city: string
  status: string
  max_players: number
  start_date: string | null
  description: string | null
  joined: boolean
  player_count: number
  assignments: Assignment[]
}

const BG = "#080808"
const CARD = "#121212"
const LINE = "rgba(255,255,255,.10)"
const W = "#F4F1EB"
const MUT = "rgba(244,241,235,.62)"
const V = "#8C3DFF"

function fmtDate(v: string | null) {
  if (!v) return ""
  return new Date(v).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })
}

export default function SeasonPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [resultFor, setResultFor] = useState<Assignment | null>(null)
  const [mySets, setMySets] = useState(0)
  const [oppSets, setOppSets] = useState(0)

  async function load() {
    setLoading(true)
    setError("")
    const r = await fetch("/api/liga/season", { cache: "no-store" })
    if (r.status === 401) { window.location.href = "/login"; return }
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || "Season konnte nicht geladen werden")
    setSeasons(j.seasons || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const joined = useMemo(() => seasons.filter(s => s.joined), [seasons])
  const open = useMemo(() => seasons.filter(s => !s.joined && s.status === "open"), [seasons])

  async function membership(seasonId: string, action: "join" | "leave") {
    setBusy(seasonId)
    setError("")
    const r = await fetch("/api/liga/season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_id: seasonId, action }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || "Aktion fehlgeschlagen")
    await load()
    setBusy(null)
  }

  function openResult(a: Assignment) {
    setResultFor(a)
    setMySets(0)
    setOppSets(0)
  }

  async function submitResult() {
    if (!resultFor || mySets === oppSets || (mySets === 0 && oppSets === 0)) return
    setBusy(resultFor.id)
    setError("")

    const sets = [
      ...Array(mySets).fill(null).map(() => ({ p1: resultFor.i_am_p1 ? 11 : 7, p2: resultFor.i_am_p1 ? 7 : 11 })),
      ...Array(oppSets).fill(null).map(() => ({ p1: resultFor.i_am_p1 ? 7 : 11, p2: resultFor.i_am_p1 ? 11 : 7 })),
    ]
    const winnerId = mySets > oppSets ? "me" : resultFor.opponent_id

    const me = await fetch("/api/me").then(r => r.ok ? r.json() : null).catch(() => null)
    const myId = me?.id || me?.user?.id
    if (!myId) { window.location.href = "/login"; return }

    const r = await fetch("/api/liga/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: resultFor.id,
        sets,
        winner_id: winnerId === "me" ? myId : winnerId,
      }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || "Resultat konnte nicht eingetragen werden")
    else setResultFor(null)
    await load()
    setBusy(null)
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, color: W, paddingBottom: 80 }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "18px 16px 0" }}>
        <Link href="/liga" style={{ color: MUT, textDecoration: "none", fontSize: 13 }}>← Liga</Link>

        <div style={{ marginTop: 22, padding: "28px 22px", border: `1px solid ${LINE}`, borderRadius: 24, background: "linear-gradient(145deg,#181818,#0E0E0E)" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".16em", color: V }}>OPTIONAL</div>
          <h1 style={{ margin: "8px 0 10px", fontSize: 42, lineHeight: .92, textTransform: "uppercase" }}>3-Monats-Season</h1>
          <p style={{ margin: 0, color: MUT, lineHeight: 1.5, fontSize: 15 }}>12 Wochen. Automatische Gegner. Gleiche globale Wertung.</p>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${LINE}`, fontSize: 13, lineHeight: 1.5, color: MUT }}>
            Du musst bei keiner Season mitmachen. Deine globale Rangliste bleibt trotzdem aktiv. Für den Rating-Erhalt zählen weiterhin deine gewerteten Pflichtspiele pro Monat.
          </div>
        </div>

        {error && <div style={{ marginTop: 14, borderRadius: 14, padding: 13, background: "rgba(255,80,80,.12)", color: "#ff9a9a", fontSize: 13 }}>{error}</div>}

        {loading ? <p style={{ color: MUT, padding: "36px 4px" }}>Lädt …</p> : <>
          {joined.map(s => {
            const done = s.assignments.filter(a => a.status === "confirmed").length
            const total = s.assignments.length
            const rounds = Array.from(new Set(s.assignments.map(a => a.round))).sort((a,b) => a-b)
            return <section key={s.id} style={{ marginTop: 18, padding: 18, borderRadius: 22, background: CARD, border: `1px solid ${LINE}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: V, fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>DEINE SEASON</div>
                  <h2 style={{ margin: "5px 0 4px", fontSize: 27 }}>{s.name}</h2>
                  <div style={{ color: MUT, fontSize: 13 }}>{s.city} · {s.player_count} Spieler</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{done}/{total || "–"}</div>
                  <div style={{ color: MUT, fontSize: 11 }}>gespielt</div>
                </div>
              </div>

              {s.status === "open" && total === 0 && <div style={{ marginTop: 16, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                <div style={{ color: MUT, fontSize: 13, lineHeight: 1.5 }}>Du bist angemeldet. Der Spielplan wird zum Season-Start erstellt.</div>
                <button onClick={() => membership(s.id, "leave")} disabled={busy === s.id} style={{ marginTop: 12, background: "transparent", color: MUT, border: `1px solid ${LINE}`, borderRadius: 12, padding: "10px 12px", fontWeight: 800, cursor: "pointer" }}>Abmelden</button>
              </div>}

              {rounds.map(round => <div key={round} style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, color: MUT, fontWeight: 900, letterSpacing: ".12em", marginBottom: 8 }}>RUNDE {round}</div>
                {s.assignments.filter(a => a.round === round).map(a => {
                  const finished = a.status === "confirmed"
                  const waiting = a.status === "p1_entered"
                  return <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderTop: `1px solid ${LINE}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {a.opponent_avatar ? <img src={a.opponent_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontWeight: 900 }}>{a.opponent_name.slice(0,1)}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.opponent_name}</div>
                      <div style={{ color: MUT, fontSize: 12, marginTop: 2 }}>{a.opponent_elo ? `ELO ${a.opponent_elo} · ` : ""}{a.deadline ? `bis ${fmtDate(a.deadline)}` : ""}</div>
                    </div>
                    {finished ? <span style={{ color: "#7EE787", fontSize: 12, fontWeight: 900 }}>✓ DONE</span> : waiting ? <span style={{ color: MUT, fontSize: 11, fontWeight: 800, textAlign: "right" }}>WARTET AUF<br/>BESTÄTIGUNG</span> : <button onClick={() => openResult(a)} style={{ background: V, color: "white", border: 0, borderRadius: 11, padding: "10px 11px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>RESULTAT</button>}
                  </div>
                })}
              </div>)}
            </section>
          })}

          {open.length > 0 && <section style={{ marginTop: 22 }}>
            <div style={{ fontSize: 11, color: MUT, fontWeight: 900, letterSpacing: ".14em", marginBottom: 8 }}>NÄCHSTE SEASON</div>
            {open.map(s => <div key={s.id} style={{ padding: 18, marginBottom: 10, borderRadius: 20, background: CARD, border: `1px solid ${LINE}` }}>
              <h3 style={{ margin: 0, fontSize: 23 }}>{s.name}</h3>
              <div style={{ color: MUT, fontSize: 13, marginTop: 4 }}>{s.city}{s.start_date ? ` · Start ${fmtDate(s.start_date)}` : ""}</div>
              <p style={{ color: MUT, fontSize: 13, lineHeight: 1.5, margin: "12px 0" }}>{s.description || "Bis zu 8 automatische Gegner in 4 Runden. Deine Resultate zählen zur globalen Rangliste."}</p>
              <button onClick={() => membership(s.id, "join")} disabled={busy === s.id} style={{ width: "100%", background: V, color: "white", border: 0, borderRadius: 13, padding: 14, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>{busy === s.id ? "…" : "SEASON MITMACHEN"}</button>
            </div>)}
          </section>}

          {!joined.length && !open.length && <div style={{ marginTop: 20, padding: 18, borderRadius: 18, background: CARD, border: `1px solid ${LINE}`, color: MUT, lineHeight: 1.5 }}>Aktuell ist keine 3-Monats-Season offen. Die globale Liga läuft normal weiter.</div>}
        </>}

        <div style={{ marginTop: 24, padding: 18, borderTop: `1px solid ${LINE}`, color: MUT, fontSize: 13, lineHeight: 1.55 }}>
          <b style={{ color: W }}>Wichtig:</b> Season und freie Matches verwenden dieselbe globale ELO. Wer unten startet, kann mit Siegen jederzeit bis ganz nach oben kommen.
        </div>
      </div>

      {resultFor && <div onClick={() => setResultFor(null)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,.76)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, background: "#141414", borderRadius: "24px 24px 0 0", padding: 20, border: `1px solid ${LINE}` }}>
          <div style={{ color: V, fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>RESULTAT</div>
          <h3 style={{ margin: "6px 0 4px", fontSize: 25 }}>gegen {resultFor.opponent_name}</h3>
          <p style={{ color: MUT, fontSize: 13, margin: "0 0 18px" }}>Gewonnene Sätze eintragen. Der Gegner bestätigt danach.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
            <div><label style={{ display: "block", color: MUT, fontSize: 11, marginBottom: 5 }}>DU</label><input type="number" min={0} max={4} value={mySets} onChange={e => setMySets(Math.max(0, Math.min(4, Number(e.target.value))))} style={{ width: "100%", background: "#080808", color: W, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, fontSize: 24, fontWeight: 900, textAlign: "center" }} /></div>
            <span style={{ color: MUT, fontWeight: 900, marginTop: 18 }}>:</span>
            <div><label style={{ display: "block", color: MUT, fontSize: 11, marginBottom: 5 }}>GEGNER</label><input type="number" min={0} max={4} value={oppSets} onChange={e => setOppSets(Math.max(0, Math.min(4, Number(e.target.value))))} style={{ width: "100%", background: "#080808", color: W, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, fontSize: 24, fontWeight: 900, textAlign: "center" }} /></div>
          </div>
          <button onClick={submitResult} disabled={busy === resultFor.id || mySets === oppSets || (mySets === 0 && oppSets === 0)} style={{ width: "100%", marginTop: 16, background: V, color: "white", border: 0, borderRadius: 13, padding: 15, fontWeight: 900, cursor: "pointer", opacity: mySets === oppSets ? .45 : 1 }}>{busy === resultFor.id ? "…" : "RESULTAT SENDEN"}</button>
        </div>
      </div>}
    </main>
  )
}
