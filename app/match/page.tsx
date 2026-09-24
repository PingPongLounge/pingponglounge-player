"use client"
/* PLAYER · SPIELEN — Open Games (07.09.2026, Oliver).

   Die Seite beantwortet genau eine Frage: "Wie komme ich jetzt zu einem
   Spiel?" Drei Wege in klarer Reihenfolge, formuliert aus der Sicht des
   Spielers ("Ich suche …", "Ich kenne …", "Ich organisiere …"), darunter
   die offenen Spiele.

   24.09.2026: auf das Design-System V3 gezogen — derselbe Kopf wie die
   Startseite, dieselben Karten, Listenzeilen und Knoepfe. Die drei Wege
   stehen jetzt im Raster der drei Einstiege von /entdecken.
   Alle Daten und Funktionen sind unveraendert: /api/match, join, cancel. */
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { useRouter } from "next/navigation"
import { OG_PREIS_CHF, OG_STORNO_STUNDEN } from "@/lib/opengames"
import { pruefeAuth } from "@/lib/auth-client"
import PlayerKopf from "@/app/components/PlayerKopf"
import { IconSuche, IconSpieler, IconOpenGames } from "@/app/components/Icons"
import { INTER, TEXT, LEISE, BG, knopf, knopfUmriss } from "@/app/design"

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
    if (!pruefeAuth(res)) return
    if (res.ok) router.push(`/match/${id}`)
    else { const j = await res.json().catch(() => ({})); setJoinError(j.error || "Fehler beim Beitreten"); setJoining(null) }
  }
  async function cancel(id: string) { await fetch(`/api/match/${id}/cancel`, { method: "POST" }); load() }

  const alle = [...games].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.start_hour ?? 0) - (b.start_hour ?? 0))
  const freiGesamt = alle.reduce((s, g) => s + Math.max(0, (g.max_players || 2) - (g.current_players || 1)), 0)

  return (
    <>
      <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>

        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ppl-home.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
          <div aria-hidden className="p-hero-schleier" />

          <PlayerKopf />

          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">Spielen</h1>
            <p className="p-eyebrow">Finde ein Spiel. Fordere jemanden<br />heraus. Oder starte selbst eins.</p>

            <div className="p-streifen">
              <div>
                <span className="zahl">{alle.length || "—"}</span>
                <span className="was">Open Games</span>
              </div>
              <div>
                <span className="zahl">{freiGesamt || "—"}</span>
                <span className="was">Plätze frei</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>

          {/* ── Die drei Wege: eine Liste, keine Matrix. Die Reihenfolge ist
                die Empfehlung — suchen, fordern, selbst anlegen. ── */}
          <section className="p-karte">
            <div className="p-kopf"><h2>Was willst du machen?</h2></div>
            <a href="#heute" className="p-zeile">
              <IconSuche size={24} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>Spiel finden</b>
                <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>Offene Spiele in deiner Nähe</span>
              </span>
            </a>
            <Link href="/rangliste" className="p-zeile">
              <IconSpieler size={24} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>Player fordern</b>
                <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>Fordere einen Spieler heraus</span>
              </span>
            </Link>
            <Link href="/match/create" className="p-zeile">
              <IconOpenGames size={24} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>Spiel erstellen</b>
                <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>Lege ein eigenes Spiel an</span>
              </span>
            </Link>
          </section>

          {/* ── Heute wird gespielt ── */}
          <section id="heute" className="p-karte p-abschnitt" style={{ scrollMarginTop: 16 }}>
            <div className="p-kopf">
              <h2>Heute wird gespielt</h2>
              {alle.length > 0 && <span className="p-mehr">{alle.length}</span>}
            </div>

            {loading && <p className="p-leer">Spiele werden geladen …</p>}

            {!loading && error && (
              <div style={{ padding: 18 }}>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: LEISE }}>{error}</p>
                <button onClick={load} style={knopfUmriss}>Nochmals</button>
              </div>
            )}

            {!loading && !error && alle.length === 0 && (
              <div style={{ padding: 18 }}>
                <p style={{ margin: "0 0 18px", fontSize: 15, color: LEISE }}>
                  Heute noch nichts. Mach den ersten Move.
                </p>
                <Link href="/match/create" style={knopf}>Open Game erstellen</Link>
              </div>
            )}

            {!loading && !error && alle.map(g => {
              const max = g.max_players || 2
              const cur = g.current_players || 1
              const frei = Math.max(0, max - cur)
              const dabei = g.players?.some(p => p.user_id === userId)
              // Kostet der Platz etwas, fuehrt der Knopf auf die Detailseite —
              // dort haengen Stripe, PingPoints und Gutschein dran. Ein
              // "Mitmachen" direkt aus der Liste wuerde den Gratis-Beitritt
              // aufrufen und die Bezahlung ueberspringen.
              const kostet = !!g.is_official && (g.price_per_player ?? 0) > 0
              // Ohne Anmeldung gehoert niemandem ein Spiel — sonst zeigte die
              // ausgeloggte Seite an jeder Zeile ein Loesch-Kreuz.
              const meins = !!userId && g.created_by === userId
              return (
                <div key={g.id} className="p-zeile hat-cta">
                  <span style={{ display: "flex", flexShrink: 0 }}>
                    {(g.players || []).slice(0, 3).map((p, k) => (
                      <span key={p.user_id} style={{
                        width: 32, height: 32, borderRadius: "50%", background: "#FFFFFF",
                        border: "1px solid #DDDDDA", marginLeft: k ? -11 : 0,
                        display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 600, color: LEISE,
                      }}>{initialen(p.name)}</span>
                    ))}
                    {!g.players?.length && (
                      <span style={{
                        width: 32, height: 32, borderRadius: "50%", background: "#FFFFFF",
                        border: "1px solid #DDDDDA", display: "grid", placeItems: "center", fontSize: 14, color: LEISE,
                      }}>+</span>
                    )}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/match/${g.id}`} style={{ color: TEXT, textDecoration: "none" }}>
                      <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{g.location_name || "Open Game"}</b>
                    </Link>
                    <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
                      {wann(g.date, g.start_hour)} · {g.level || "Alle Level"} · {cur}/{max}
                    </span>
                  </span>

                  <span className="cta" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    {dabei
                      ? <span className="p-pille gut">Dabei</span>
                      : frei === 0
                        ? <span className="p-pille">Voll</span>
                        : kostet
                          ? <Link href={`/match/${g.id}`} className="p-aktion">Platz sichern · CHF {g.price_per_player}</Link>
                          : <button onClick={() => join(g.id)} disabled={joining === g.id} className="p-aktion">
                              {joining === g.id ? "…" : "Mitmachen"}
                            </button>}
                    {meins && (
                      <button onClick={() => cancel(g.id)} title="Mein Spiel löschen" aria-label="Mein Spiel löschen"
                        style={{ background: "none", border: "none", color: LEISE, cursor: "pointer", fontSize: 15, padding: "0 2px" }}>✕</button>
                    )}
                  </span>
                </div>
              )
            })}
          </section>

          {!loading && !error && alle.length > 0 && (
            <div className="p-abschnitt">
              <Link href="/match/create" style={{ ...knopfUmriss, width: "100%" }}>
                {myGame ? "Weiteres Spiel erstellen" : "Eigenes Spiel erstellen"}
              </Link>
            </div>
          )}

          <p style={{ margin: "20px 0 0", fontSize: 13, lineHeight: 1.5, color: LEISE }}>
            Ein Platz im Open Game kostet CHF {OG_PREIS_CHF}.– pro Person. Absagen bis {OG_STORNO_STUNDEN} Stunden vorher sind kostenlos.
          </p>
        </div>
      </main>

      {joinError && (
        <div role="alert" style={{
          position: "fixed", left: 16, right: 16, bottom: 88, zIndex: 120,
          background: "#080B0D", border: "1px solid rgba(255,255,255,.20)",
          padding: "13px 16px", color: "#FFFFFF", fontFamily: INTER, fontSize: 14,
        }}>{joinError}</div>
      )}
      <BottomNav />
    </>
  )
}
