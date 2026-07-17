"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"
import { BG, CARD, W, MUT, SUB, GREEN, GRAD, CITIES, card, cardPad, cardActive, cell, chip, btn, btnInCard, btnGhost, chipBtn, levelBadge, statusPill, h1, body, backLink } from "@/app/theme"
import { SectionBlock, SectionStat, SectionRow, SectionIntro, SectionTopBar } from "@/app/components/SectionUI"
import { OG_PREIS_CHF, OG_STORNO_STUNDEN } from "@/lib/opengames"

const M=MUT, G=GREEN, C=CARD

function whenLabel(date: string | null, hour: number | null): string {
  if (!date) return hour != null ? `${String(hour).padStart(2,"0")}:00` : "Zeit offen"
  const d = new Date(date)
  const ds = d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" })
  return hour != null ? `${ds} · ${String(hour).padStart(2,"0")}:00` : ds
}

type Player = { user_id: string; name: string; elo: number; level: string }
type Game = {
  id: string; created_by: string; location_name: string; date: string | null; start_hour: number | null
  duration_minutes: number; max_players: number; current_players: number; price_per_player: number; is_official?: boolean
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
  const [myLevel, setMyLevel]     = useState<string | null>(null)
  const [infoOpen, setInfoOpen]   = useState(false)

  const load = useCallback(async () => {
    setError("")
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      setUserId(user?.id || null)
      if (user) {
        const { data: p } = await sb.from("profiles").select("level").eq("id", user.id).maybeSingle()
        setMyLevel(p?.level || null)
      }
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


  // Der Filter lief noch auf dem alten System (Rookie/Challenger/Advanced/Elite),
  // erstellt werden Open Games aber mit Level 1–7 → der Filter traf nie zu.
  const LEVELS = ["1", "2", "3", "4", "5", "6", "7"]

  const filtered = games.filter(g =>
    (!filterLevel || g.level === filterLevel) &&
    (!filterCity  || g.location_name === filterCity)
  )

  // Die festen Abende der Lounge zuerst, danach das, was sich Spieler selbst
  // ausgedacht haben. Beides in einen Topf zu werfen, war der alte Zustand.
  const offizielle = games.filter(g => g.is_official)
  const eigene = filtered.filter(g => !g.is_official)

  // Zahlen für den Kopfblock
  const freiePlaetze = games.reduce((n, g) => n + Math.max(0, g.max_players - g.current_players), 0)
  const meineSpiele = games.filter(g => g.players.some(p => p.user_id === userId)).length

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "0 0 100px" }}>
      <SectionTopBar section="Open Game" />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "6px 16px 0" }}>
        {/* Nur das Bild und die Abende. Kein "0 Deine Anmeldungen"-Block, keine
            Intro-Karte, kein Filter — Open Game soll in zwei Klick buchbar sein:
            Mitspielen antippen, bezahlen, fertig. */}
        <SectionBlock title="Open Game" meta={`Deine nächsten Abende · CHF ${OG_PREIS_CHF} · 4 Std.`} img="/gl-tische.jpg" />

        {/* Ein Satz erklärt, worum es geht — der Rest klappt auf, wer's genau
            wissen will. Ohne das stand nur "Open Game", und niemand wusste, was das ist. */}
        <div style={{ margin: "12px 4px 0" }}>
          <p style={{ fontSize: 14, color: SUB, lineHeight: 1.5 }}>
            Feste Spielabende in deiner Stärkeklasse — komm vorbei, spiel mit wer da ist, trag dein Ergebnis ein.
          </p>
          <button onClick={() => setInfoOpen(v => !v)}
            style={{ marginTop: 8, background: "none", padding: 0, color: G, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            So funktioniert's <span style={{ transform: infoOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
          </button>
          {infoOpen && (
            <div style={{ marginTop: 12, background: C, borderRadius: 16, padding: "6px 16px" }}>
              {([
                ["Abend wählen", `Feste Abende in Glattbrugg und St. Gallen, je 6 Plätze pro Stärkeklasse (Einstieg 1–3 · Pro 4–7). So spielst du gegen Leute auf deinem Niveau.`],
                ["Platz sichern", `CHF ${OG_PREIS_CHF} für 4 Stunden. Absage bis ${OG_STORNO_STUNDEN} h vorher — Geld zurück.`],
                ["Spielen & eintragen", "Vor Ort spielst du gegen wen du willst. Nach dem Spiel trägst du das Ergebnis ein — dein Rating steigt."],
              ] as [string, string][]).map(([t, d], i) => (
                <div key={t} style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid rgba(255,255,255,.07)` }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: GRAD, color: "#06210F", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: W }}>{t}</span>
                    <span style={{ display: "block", fontSize: 13, color: MUT, marginTop: 2, lineHeight: 1.45 }}>{d}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {offizielle.length > 0 && (
          <div style={{ marginTop: 14, background: C, borderRadius: 22, padding: "4px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.14)" }}>
              {offizielle.slice(0, 14).map((g, i) => {
                const frei = Math.max(0, g.max_players - g.current_players)
                const drin = g.players.some(p => p.user_id === userId)
                const meinLevel = parseInt(myLevel || "0") || 0
                const proAbend = g.level === "4-7"
                const passt = meinLevel > 0 && (proAbend ? meinLevel >= 4 : meinLevel <= 3)
                const d = g.date ? new Date(g.date) : null

                return (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.07)" }}>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 44, flexShrink: 0 }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: W, lineHeight: 1 }}>
                        {d ? d.toLocaleDateString("de-CH", { weekday: "short" }).replace(".", "") : "—"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: M, marginTop: 2 }}>
                        {d ? d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" }) : ""}
                      </span>
                    </span>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: W, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {g.location_name}
                      </span>
                      <span style={{ display: "block", fontSize: 13, color: M, marginTop: 2 }}>
                        {/* Welche Ligen dieser Abend abdeckt — in ihren Namen, nicht "Pro/Einstieg" */}
                        {proAbend ? "Advanced & Elite" : "Rookie & Challenger"} · {String(g.start_hour ?? 19).padStart(2, "0")}:00 · {frei} von {g.max_players} frei
                      </span>
                    </span>

                    {drin ? (
                      <Link href={`/match/${g.id}`} style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#06210F", background: GRAD, borderRadius: 9, padding: "8px 0", width: 96, textAlign: "center", textDecoration: "none", flexShrink: 0 }}>
                        Dabei ✓
                      </Link>
                    ) : frei === 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: M, width: 96, textAlign: "center", flexShrink: 0 }}>Ausgebucht</span>
                    ) : !passt ? (
                      <span title={`Für Level ${g.level}`} style={{ fontSize: 12, fontWeight: 700, color: M, width: 96, textAlign: "center", flexShrink: 0 }}>
                        Level {g.level}
                      </span>
                    ) : (
                      // "Mitspielen" fuehrt auf die Detailseite: wer kommt, freie
                      // Plaetze, Ort, Storno — dann dort bezahlen (Playtomic-Weg).
                      <Link href={`/match/${g.id}`}
                        style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#06210F", background: GRAD, borderRadius: 9, padding: "9px 0", width: 96, textAlign: "center", textDecoration: "none", flexShrink: 0 }}>
                        Mitspielen
                      </Link>
                    )}
                  </div>
                )
              })}
          </div>
        )}

        {/* Selbst erstellte Spiele — nur wenn es welche gibt. Kein Filter mehr:
            bei einer Handvoll Spielen ist er Ballast. */}
        {eigene.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <span style={{ fontSize: 15, fontWeight: 900, textTransform: "uppercase", color: W }}>Von Spielern</span>
            {myGame && (
              <button onClick={() => cancel(myGame)} style={{ ...btnGhost, display: "inline-block", padding: "10px 16px", fontSize: 12, whiteSpace: "nowrap" }}>Mein Spiel löschen</button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: M }}><div style={{ fontSize: 28, marginBottom: 10 }}>🏓</div><p style={{ ...body }}>Lädt …</p></div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: M }}><p style={{ ...body, marginBottom: 16 }}>{error}</p><button onClick={load} style={{ ...btn, display: "inline-block", padding: "10px 24px" }}>Nochmals</button></div>
        ) : eigene.length === 0 ? (
          <div style={{ textAlign: "center", padding: "22px 16px 6px" }}>
            <Link href="/match/create" style={{ color: M, fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>Lieber selbst ein Spiel erstellen? →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {eigene.map(g => {
              const isMe = g.created_by === userId
              const joined = g.players.some(p => p.user_id === userId)
              const host = g.players.find(p => p.user_id === g.created_by) || g.players[0]
              const full = g.current_players >= g.max_players
              return (
                <div key={g.id} style={{ ...card, ...(isMe ? cardActive : {}), overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px 10px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: W }}>{host?.name || "Spieler"}</span>
                          <span style={{ fontSize: 11, color: M, fontWeight: 500 }}>Elo {host?.elo ?? "—"}</span>
                          {isMe && <span style={statusPill}>Dein Spiel</span>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={levelBadge(g.level)}>{g.level}</span>
                          <span style={{ ...chip }}>📍 {g.location_name}</span>
                          <span style={{ ...chip }}>🕐 {whenLabel(g.date, g.start_hour)}</span>
                          {g.price_per_player > 0
                            ? <span style={{ ...chip }}>💰 CHF {g.price_per_player}</span>
                            : <span style={{ ...chip, color: G }}>Gratis</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: full ? M : G, flexShrink: 0, marginTop: 2 }}>{g.current_players}/{g.max_players}</span>
                    </div>
                    {g.notes && <p style={{ ...body, fontStyle: "italic", margin: "2px 0 4px" }}>&quot;{g.notes}&quot;</p>}
                  </div>
                  <div style={{ padding: "4px 16px 14px" }}>
                    {isMe || joined ? (
                      <Link href={`/match/${g.id}`} style={{ ...btnInCard, display: "block", textAlign: "center" }}>{isMe ? "Dein Spiel ansehen" : "Du bist dabei · ansehen"}</Link>
                    ) : full ? (
                      <p style={{ ...body, textAlign: "center" }}>Voll</p>
                    ) : (
                      <button onClick={() => join(g.id)} disabled={joining === g.id} style={{ ...btnInCard, display: "block", width: "100%", textAlign: "center" }}>{joining === g.id ? "Trete bei …" : "Mitspielen →"}</button>
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
