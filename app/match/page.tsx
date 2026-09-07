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
import {
  Hero, Inhalt, AbschnittKopf, Feld, AktionsZeile, ListenZeile, Symbol, Pille,
  knopfPrimaer, knopfKlein, knopfOutlineHell, TEXT_LEISE, FLAECHE,
} from "@/app/components/V2"
import { SCHWARZ, ANTON, INTER } from "@/app/theme"

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
      <main style={{ minHeight: "100dvh", background: FLAECHE, color: SCHWARZ, fontFamily: INTER }}>

        <Hero
          bild="/ppl-weapon.jpg" pos="30% 62%"
          kopf={<HeroKopf />}
          etikett="Spielen"
          titel={<>Just<br />play.</>}
          subline={<>Finde ein Spiel. Fordere jemanden heraus.<br />Oder starte selbst eins.</>}
        />

        <Inhalt>
          {/* ── Die drei Wege: eine Liste, keine Matrix. Die Reihenfolge ist
                die Empfehlung — suchen, fordern, selbst anlegen. ── */}
          <AbschnittKopf titel="Was willst du machen?" />
          <Feld>
            <a href="#heute" style={{ textDecoration: "none", display: "block" }}>
              <AktionsZeile erste symbol={<Symbol art="suche" />} titel="Spiel finden" unter="Offene Spiele in deiner Nähe" />
            </a>
            <Link href="/rangliste" style={{ textDecoration: "none", display: "block" }}>
              <AktionsZeile symbol={<Symbol art="spieler" />} titel="Player fordern" unter="Fordere einen Spieler heraus" />
            </Link>
            <Link href="/match/create" style={{ textDecoration: "none", display: "block" }}>
              <AktionsZeile symbol={<Symbol art="plus" />} titel="Spiel erstellen" unter="Lege ein eigenes Spiel an" />
            </Link>
          </Feld>

          {/* ── Heute wird gespielt ── */}
          <div id="heute" style={{ marginTop: 28, scrollMarginTop: 16 }}>
            <AbschnittKopf titel="Heute wird gespielt" mehr={alle.length ? `${alle.length}` : undefined} href={alle.length ? "#heute" : undefined} />

            {loading && <p style={{ fontSize: 15, color: TEXT_LEISE, margin: 0 }}>Spiele werden geladen …</p>}

            {!loading && error && (
              <Feld padding={16}>
                <p style={{ fontSize: 15, color: TEXT_LEISE, margin: "0 0 14px" }}>{error}</p>
                <button onClick={load} style={knopfOutlineHell}>Nochmals</button>
              </Feld>
            )}

            {!loading && !error && alle.length === 0 && (
              <Feld padding={20}>
                <b style={{ display: "block", fontFamily: ANTON, fontWeight: 400, fontSize: 26, textTransform: "uppercase", marginBottom: 8 }}>
                  Heute noch nichts
                </b>
                <p style={{ fontSize: 15, color: TEXT_LEISE, margin: "0 0 18px" }}>Mach den ersten Move.</p>
                <Link href="/match/create" style={knopfPrimaer}>Open Game erstellen</Link>
              </Feld>
            )}

            {!loading && !error && alle.length > 0 && (
              <Feld>
                {alle.map((g, i) => {
                  const max = g.max_players || 2
                  const cur = g.current_players || 1
                  const frei = Math.max(0, max - cur)
                  const dabei = g.players?.some(p => p.user_id === userId)
                  const meins = g.created_by === userId
                  return (
                    <ListenZeile
                      key={g.id}
                      erste={i === 0}
                      links={
                        <div style={{ display: "flex", flexShrink: 0 }}>
                          {(g.players || []).slice(0, 3).map((p, k) => (
                            <span key={p.user_id} style={{
                              width: 32, height: 32, borderRadius: "50%", background: "rgba(8,8,8,.08)",
                              border: "2px solid #FFFFFF", marginLeft: k ? -11 : 0,
                              display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: TEXT_LEISE,
                            }}>{initialen(p.name)}</span>
                          ))}
                          {!g.players?.length && (
                            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(8,8,8,.08)", display: "grid", placeItems: "center", fontSize: 14, color: TEXT_LEISE }}>+</span>
                          )}
                        </div>
                      }
                      titel={<Link href={`/match/${g.id}`} style={{ color: SCHWARZ, textDecoration: "none" }}>{g.location_name || "Open Game"}</Link>}
                      unter={`${wann(g.date, g.start_hour)} · ${g.level || "Alle Level"}`}
                      rechts={
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: TEXT_LEISE, fontVariantNumeric: "tabular-nums" }}>{cur}/{max}</span>
                          {dabei
                            ? <Pille text="Dabei" ton="violett" />
                            : frei === 0
                              ? <Pille text="Voll" />
                              : <button onClick={() => join(g.id)} disabled={joining === g.id}
                                  style={{ ...knopfKlein, opacity: joining === g.id ? .6 : 1 }}>
                                  {joining === g.id ? "…" : "Mitmachen"}
                                </button>}
                          {meins && (
                            <button onClick={() => cancel(g.id)} title="Mein Spiel löschen" style={{
                              background: "none", border: "none", color: TEXT_LEISE, cursor: "pointer",
                              fontSize: 15, padding: "0 2px", fontFamily: INTER,
                            }}>✕</button>
                          )}
                        </span>
                      }
                    />
                  )
                })}
              </Feld>
            )}

            {!loading && !error && alle.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <Link href="/match/create" style={knopfOutlineHell}>
                  {myGame ? "Weiteres Spiel erstellen" : "Eigenes Spiel erstellen"}
                </Link>
              </div>
            )}

            <p style={{ fontFamily: INTER, fontSize: 13.5, lineHeight: 1.5, color: TEXT_LEISE, margin: "20px 0 0" }}>
              Ein Platz im Open Game kostet CHF {OG_PREIS_CHF}.– pro Person. Absagen bis {OG_STORNO_STUNDEN} Stunden vorher sind kostenlos.
            </p>
          </div>
        </Inhalt>
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
