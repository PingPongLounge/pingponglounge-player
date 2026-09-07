"use client"
/* PLAYER V2 — SPIELEN (07.09.2026, Oliver).

   Die Seite beantwortet genau eine Frage: "Wie komme ich jetzt zu einem
   Spiel?" Vorher standen vier gleichwertige Kacheln da — "Gegner finden",
   "Jemanden fordern", "Open Game", "Spiel erstellen" — deren Begriffe sich
   ueberschnitten und die eine Entscheidung erzwangen, die niemand treffen
   wollte. Jetzt sind es drei Wege in klarer Reihenfolge, formuliert aus der
   Sicht des Spielers ("Ich suche …", "Ich kenne …", "Ich organisiere …").

   Rhythmus: SCHWARZER HERO ↘ OFF-WHITE (die drei Wege, lesen und verstehen)
   ↘ SCHWARZ (heute wird gespielt, Menschen und Aktion).
   Alle Daten und Funktionen sind unveraendert: /api/match, join, cancel. */
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"
import { OG_PREIS_CHF, OG_STORNO_STUNDEN } from "@/lib/opengames"
import HeroKopf from "@/app/components/HeroKopf"
import { FotoHero, KanteZuHell, KanteZuDunkel, Etikett, Titel, ListenZeile, knopfPrimaer, knopfOutline, knopfKlein } from "@/app/components/V2"
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, LINE, MUT } from "@/app/theme"

type Player = { user_id: string; name: string; elo: number; level: string }
type Game = {
  id: string; created_by: string; location_name: string; date: string | null; start_hour: number | null
  duration_minutes: number; max_players: number; current_players: number; price_per_player: number
  is_official?: boolean; level: string; status: string; notes: string | null; created_at: string; players: Player[]
}

function wann(date: string | null, hour: number | null) {
  if (!date) return hour != null ? `${String(hour).padStart(2, "0")}:00` : "Zeit offen"
  const d = new Date(`${date}T12:00:00`)
  return `${d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" })}`
    + (hour != null ? ` · ${String(hour).padStart(2, "0")}:00` : "")
}
function initialen(n: string) { return n.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() }

const breit: React.CSSProperties = { maxWidth: 620, margin: "0 auto", padding: "0 22px" }

/* Ein Weg — Nummer, Titel, ein Satz, ein Knopf. Bewusst untereinander und
   nicht als Raster: die Reihenfolge ist die Empfehlung. */
function Weg({ nr, titel, text, knopf, href, primaer }: {
  nr: string; titel: string; text: string; knopf: string; href: string; primaer?: boolean
}) {
  return (
    <div style={{ borderTop: "1px solid rgba(8,8,8,.16)", padding: "22px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: ANTON, fontSize: 20, color: "rgba(8,8,8,.34)", lineHeight: 1 }}>{nr}</span>
        <h3 style={{
          fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(22px,6vw,30px)", lineHeight: 1,
          textTransform: "uppercase", margin: 0, color: SCHWARZ,
        }}>{titel}</h3>
      </div>
      <p style={{ fontFamily: INTER, fontSize: 16, lineHeight: 1.5, color: "rgba(8,8,8,.66)", margin: "10px 0 16px", maxWidth: "46ch" }}>{text}</p>
      <Link href={href} style={primaer
        ? { ...knopfPrimaer, display: "inline-flex" }
        : {
            display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 100,
            padding: "13.5px 24px", fontFamily: INTER, fontSize: 14, fontWeight: 900, letterSpacing: ".1em",
            textTransform: "uppercase", textDecoration: "none", color: SCHWARZ,
            border: "1.5px solid rgba(8,8,8,.28)", background: "transparent",
          }}>{knopf} →</Link>
    </div>
  )
}

export default function MatchPage() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [myGame, setMyGame] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError] = useState("")
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
    } catch { setError("Spiele konnten nicht geladen werden") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function join(id: string) {
    setJoining(id); setJoinError("")
    const res = await fetch(`/api/match/${id}/join`, { method: "POST" })
    if (res.ok) router.push(`/match/${id}`)
    else { const j = await res.json().catch(() => ({})); setJoinError(j.error || "Fehler beim Beitreten"); setJoining(null) }
  }
  async function cancel(id: string) { await fetch(`/api/match/${id}/cancel`, { method: "POST" }); load() }

  const alle = [...games].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.start_hour ?? 0) - (b.start_hour ?? 0))

  return (
    <>
      <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER }}>

        {/* ══ FOTO-HERO ══ */}
        <FotoHero bild="/ppl-spielen.jpg" pos="50% 40%" kopf={<HeroKopf />}>
          <Etikett text="Spielen" />
          <h1 style={{
            fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(56px,16vw,104px)",
            lineHeight: .86, textTransform: "uppercase", letterSpacing: ".005em", margin: "6px 0 0",
          }}>Play<br />just play.</h1>
          <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, lineHeight: 1.5, margin: "10px 0 0", maxWidth: "42ch" }}>
            Finde ein Spiel. Fordere jemanden heraus. Oder starte selbst eins.
          </p>
        </FotoHero>

        {/* ══ OFF-WHITE: die drei Wege ══ */}
        <KanteZuHell />
        <section style={{ background: CREME, color: SCHWARZ }}>
          <div className="ppl-breit" style={{ paddingTop: 28, paddingBottom: 30 }}>
            <Etikett text="Drei Wege" hell />
            <h2 style={{
              fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(30px,8vw,42px)",
              lineHeight: .94, textTransform: "uppercase", margin: "8px 0 6px", color: SCHWARZ,
            }}>Was willst du machen?</h2>

            <div className="ppl-g3">
            <Weg nr="01" titel="Ich suche ein Spiel" primaer
              text="Zeige mir offene Spiele und passende Gegner."
              knopf="Spiel finden" href="#heute" />
            <Weg nr="02" titel="Ich kenne meinen Gegner"
              text="Suche einen Player und fordere ihn direkt heraus."
              knopf="Player suchen" href="/rangliste" />
            <Weg nr="03" titel="Ich organisiere ein Spiel"
              text="Lege Ort und Zeit fest. Andere Player können beitreten."
              knopf="Spiel erstellen" href="/match/create" />
            </div>

            <div style={{ borderTop: "1px solid rgba(8,8,8,.16)", paddingTop: 18, marginTop: 18 }}>
              <p style={{ fontFamily: INTER, fontSize: 15, lineHeight: 1.55, color: "rgba(8,8,8,.58)", margin: 0, maxWidth: "50ch" }}>
                Ein Platz im Open Game kostet CHF {OG_PREIS_CHF}.– pro Person. Absagen bis {OG_STORNO_STUNDEN} Stunden vorher sind kostenlos.
              </p>
            </div>
          </div>
        </section>
        <KanteZuDunkel />

        {/* ══ SCHWARZ: heute wird gespielt ══ */}
        <section id="heute" className="ppl-breit" style={{ paddingTop: 30, scrollMarginTop: 16 }}>
          <Etikett text={alle.length ? `${alle.length} offen` : "Open Games"} />
          <Titel>Heute wird gespielt</Titel>

          {loading && <p style={{ fontSize: 16, color: MUT, marginTop: 20 }}>Spiele werden geladen …</p>}

          {!loading && error && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 16, color: MUT, margin: "0 0 14px" }}>{error}</p>
              <button onClick={load} style={{ ...knopfOutline, cursor: "pointer" }}>Nochmals</button>
            </div>
          )}

          {/* Leerzustand: kein grosses schwarzes Loch, sondern eine Einladung. */}
          {!loading && !error && alle.length === 0 && (
            <div style={{ marginTop: 22, borderTop: `1px solid ${LINE}`, paddingTop: 26 }}>
              <h3 style={{
                fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(28px,8vw,40px)",
                lineHeight: .96, textTransform: "uppercase", margin: "0 0 10px",
              }}>Heute noch nichts?</h3>
              <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, margin: "0 0 20px", maxWidth: "38ch" }}>
                Mach den ersten Move.
              </p>
              <Link href="/match/create" style={knopfPrimaer}>Open Game erstellen</Link>
            </div>
          )}

          {!loading && !error && alle.map(g => {
            const frei = Math.max(0, (g.max_players || 2) - (g.current_players || 1))
            const dabei = g.players?.some(p => p.user_id === userId)
            const meins = g.created_by === userId
            return (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderTop: `1px solid ${LINE}` }}>
                {/* Gesichter statt Textwueste */}
                <div style={{ display: "flex", flexShrink: 0 }}>
                  {(g.players || []).slice(0, 3).map((p, i) => (
                    <span key={p.user_id} style={{
                      width: 38, height: 38, borderRadius: "50%", background: "#1A1A1E",
                      border: `2px solid ${SCHWARZ}`, marginLeft: i ? -12 : 0,
                      display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: MUT,
                    }}>{initialen(p.name)}</span>
                  ))}
                  {!g.players?.length && (
                    <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#1A1A1E", display: "grid", placeItems: "center", fontSize: 15, color: MUT }}>+</span>
                  )}
                </div>

                <Link href={`/match/${g.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: CREME }}>
                  <b style={{ display: "block", fontSize: 17, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {g.location_name || "Open Game"}
                  </b>
                  <span style={{ display: "block", fontSize: 14, color: MUT, marginTop: 3 }}>
                    {wann(g.date, g.start_hour)} · {g.level || "Alle Level"}
                    {g.is_official ? "" : " · Community"}
                  </span>
                </Link>

                {dabei
                  ? <Link href={`/match/${g.id}`} style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: VIOLETT, textDecoration: "none", whiteSpace: "nowrap" }}>Dabei ✓</Link>
                  : frei === 0
                    ? <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: MUT, whiteSpace: "nowrap" }}>Voll</span>
                    : <button onClick={() => join(g.id)} disabled={joining === g.id} style={{
                        fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase",
                        padding: "10px 16px", borderRadius: 100, background: VIOLETT, color: CREME,
                        border: "none", cursor: "pointer", whiteSpace: "nowrap", opacity: joining === g.id ? .6 : 1,
                      }}>{joining === g.id ? "…" : "Mitspielen"}</button>}

                {meins && (
                  <button onClick={() => cancel(g.id)} title="Mein Spiel löschen" style={{
                    background: "none", border: "none", color: MUT, cursor: "pointer",
                    fontSize: 16, padding: "0 2px", flexShrink: 0, fontFamily: INTER,
                  }}>✕</button>
                )}
              </div>
            )
          })}

          {!loading && !error && alle.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <Link href="/match/create" style={knopfOutline}>
                {myGame ? "Weiteres Spiel erstellen" : "Eigenes Spiel erstellen"}
              </Link>
            </div>
          )}
        </section>
      </main>

      {joinError && (
        <div role="alert" style={{
          position: "fixed", left: 16, right: 16, bottom: 88, zIndex: 120,
          background: "#3A1416", border: "1px solid rgba(255,122,114,.5)", borderRadius: 12,
          padding: "13px 16px", color: "#FFD9D6", fontFamily: INTER, fontSize: 15,
        }}>{joinError}</div>
      )}
      <BottomNav />
    </>
  )
}
