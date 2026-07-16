"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"
import { BG, CARD, W, MUT, GREEN, CITIES, card, cardPad, cardActive, cell, chip, btn, btnInCard, btnGhost, chipBtn, levelBadge, statusPill, h1, body, backLink } from "@/app/theme"
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
  const [kaufen, setKaufen]       = useState<string | null>(null)
  const [kaufError, setKaufError] = useState("")

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

  // Platz an einem festen Abend kaufen → Stripe-Kasse. Der Platz wird erst
  // vergeben, wenn die Zahlung wirklich durch ist (im Webhook).
  async function platzKaufen(id: string) {
    setKaufen(id); setKaufError("")
    try {
      const res = await fetch(`/api/match/${id}/checkout`, { method: "POST" })
      if (res.status === 401) { router.push("/login"); return }
      const j = await res.json().catch(() => ({}))
      if (j.needsOnboarding) { router.push("/onboarding"); return }
      if (!res.ok || !j.url) { setKaufError(j.error || "Kasse konnte nicht geöffnet werden"); setKaufen(null); return }
      window.location.href = j.url
    } catch {
      setKaufError("Kasse konnte nicht geöffnet werden")
      setKaufen(null)
    }
  }

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
        {/* Derselbe Block wie in der Liga: Bild, darunter deine Lage, darunter die Handlung. */}
        <SectionBlock
          title="Open Game"
          meta={`${games.length} offen · ${freiePlaetze} ${freiePlaetze === 1 ? "Platz" : "Plätze"} frei`}
          img="/gl-tische.jpg"
        >
          <SectionStat
            big={String(meineSpiele)}
            label={meineSpiele === 1 ? "Du bist angemeldet" : "Deine Anmeldungen"}
            sub={meineSpiele > 0 ? "Trag nach dem Spiel dein Resultat ein." : "Tritt einem Spiel bei — oder erstell dein eigenes."}
          />
          <SectionRow label="Eigenes Spiel erstellen" href="/match/create" />
        </SectionBlock>
        <SectionIntro storageKey="intro_match" title="So funktioniert's" steps={[["1", "Abend wählen", "Feste Abende in Glattbrugg und St. Gallen — je 6 Plätze pro Stärkeklasse."], ["2", "Platz sichern", `CHF ${OG_PREIS_CHF} für 4 Stunden. Absage bis ${OG_STORNO_STUNDEN} h vorher, Geld zurück.`], ["3", "Ergebnis eintragen", "Nach dem Spiel Resultat erfassen — dein Rang steigt."]]} />

        {/* DIE FESTEN ABENDE — die eigentliche Sache. Vorher gab es nur die
            Spiele, die sich jemand selbst ausdachte; jetzt stehen die Abende
            der Lounge oben und sind direkt buchbar. */}
        {offizielle.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 10px" }}>
              <span style={{ fontSize: 15, fontWeight: 900, textTransform: "uppercase", color: W }}>Feste Abende</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: ".05em" }}>
                CHF {OG_PREIS_CHF} · 4 Std.
              </span>
            </div>

            <div style={{ background: C, borderRadius: 22, padding: "4px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.14)" }}>
              {offizielle.slice(0, 12).map((g, i) => {
                const frei = Math.max(0, g.max_players - g.current_players)
                const drin = g.players.some(p => p.user_id === userId)
                const meinLevel = parseInt(myLevel || "0") || 0
                const proAbend = g.level === "4-7"
                const passt = meinLevel > 0 && (proAbend ? meinLevel >= 4 : meinLevel <= 3)
                const d = g.date ? new Date(g.date) : null

                return (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.07)" }}>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 42, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: W, lineHeight: 1 }}>
                        {d ? d.toLocaleDateString("de-CH", { weekday: "short" }).replace(".", "") : "—"}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: M, marginTop: 2 }}>
                        {d ? d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" }) : ""}
                      </span>
                    </span>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: W, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {g.location_name} · {proAbend ? "Pro" : "Einstieg"}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: M, marginTop: 2 }}>
                        {String(g.start_hour ?? 19).padStart(2, "0")}:00 · Level {g.level} · {frei} von {g.max_players} frei
                      </span>
                    </span>

                    {drin ? (
                      <Link href={`/match/${g.id}`} style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: G, border: `1px solid rgba(57,255,20,.35)`, borderRadius: 9, padding: "7px 0", width: 78, textAlign: "center", textDecoration: "none", flexShrink: 0 }}>
                        Dabei ✓
                      </Link>
                    ) : frei === 0 ? (
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: M, width: 78, textAlign: "center", flexShrink: 0 }}>Ausgebucht</span>
                    ) : !passt ? (
                      <span title={`Dieser Abend ist für Level ${g.level}`} style={{ fontSize: 10, fontWeight: 700, color: M, width: 78, textAlign: "center", flexShrink: 0 }}>
                        Level {g.level}
                      </span>
                    ) : (
                      <button onClick={() => platzKaufen(g.id)} disabled={kaufen === g.id}
                        style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: W, border: "1px solid #353B46", borderRadius: 9, padding: "7px 0", width: 78, textAlign: "center", background: "none", cursor: kaufen === g.id ? "wait" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                        {kaufen === g.id ? "…" : `CHF ${OG_PREIS_CHF}`}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {kaufError && <p style={{ fontSize: 12.5, color: "#FF5C5C", margin: "10px 4px 0" }}>{kaufError}</p>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 12px" }}>
          <span style={{ fontSize: 15, fontWeight: 900, textTransform: "uppercase", color: W }}>Spiele von Spielern</span>
          {!myGame ? (
            <Link href="/match/create" style={{ ...btnInCard, whiteSpace: "nowrap" }}>+ Spiel</Link>
          ) : (
            <button onClick={() => cancel(myGame)} style={{ ...btnGhost, display: "inline-block", padding: "10px 16px", fontSize: 12, whiteSpace: "nowrap" }}>Mein Spiel löschen</button>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {LEVELS.map(l => { const active = filterLevel === l; return (
            <button key={l} onClick={() => setFilterLevel(active ? "" : l)} style={chipBtn(active)}>L{l}</button>
          )})}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {CITIES.map(c => (
            <button key={c} onClick={() => setFilterCity(filterCity === c ? "" : c)} style={chipBtn(filterCity === c)}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: M }}><div style={{ fontSize: 32, marginBottom: 12 }}>🏓</div><p style={{ ...body }}>Lädt …</p></div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: M }}><p style={{ ...body, marginBottom: 16 }}>{error}</p><button onClick={load} style={{ ...btn, display: "inline-block", padding: "10px 24px" }}>Nochmals</button></div>
        ) : eigene.length === 0 ? (
          <div style={{ ...cardPad, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏓</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>Keine offenen Spiele</p>
            <p style={{ ...body, marginBottom: 20 }}>Erstell das erste!</p>
            <Link href="/match/create" style={{ ...btnInCard }}>Open Game erstellen</Link>
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
