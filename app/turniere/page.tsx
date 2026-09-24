"use client"
/* PLAYER · TURNIERE — auf das Design-System V3 gezogen (24.09.2026).

   Die Startseite ist die visuelle Vorgabe: dunkler Kopf mit Foto und
   PlayerKopf, EINE Anton-Zeile, Eyebrow, Kennzahlenstreifen — darunter
   .p-karte, .p-kopf, .p-zeile und die Datumskachel .p-datum, genau wie in
   der Turnierliste auf /entdecken.

   Inhalte und Funktionen unveraendert: /api/turniere, dieselbe Trennung in
   kommende und vergangene Turniere, dieselben Links, dieselbe
   Community-Bildreihe, dieselben zwei Knoepfe am Schluss.
   Eventnamen werden nicht gekuerzt — bei wenig Platz rutscht der
   Anmelde-Knopf auf eine eigene Zeile (siehe .p-zeile.hat-cta). */
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import PlayerKopf from "@/app/components/PlayerKopf"
import {
  IconChevron, IconCommunity, IconKalender, IconMatches,
} from "@/app/components/Icons"
import { INTER, TEXT, LEISE, BG, knopf, knopfUmriss } from "@/app/design"

type Tournament = {
  id: string; name: string; date: string; city: string; skill_class: string
  max_players: number; status: string; format: string
  tournament_registrations: { count: number }[]
}

const STATUS: Record<string, string> = { open: "offen", running: "läuft", finished: "beendet" }

function datum(d: string) {
  if (!d) return "Datum offen"
  const t = new Date(`${d}T12:00:00`)
  return t.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "long" })
}
const tagKurz = (d: string) => d ? new Date(`${d}T12:00:00`).toLocaleDateString("de-CH", { weekday: "short" }).replace(".", "") : "—"
const tagZahl = (d: string) => d ? new Date(`${d}T12:00:00`).getDate() : "–"
const tagMon = (d: string) => d ? new Date(`${d}T12:00:00`).toLocaleDateString("de-CH", { month: "short" }).replace(".", "") : ""

export default function TurnierePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setError("")
    try {
      const r = await fetch("/api/turniere")
      const d = await r.json()
      setTournaments(d.tournaments || [])
    } catch { setError("Turniere konnten nicht geladen werden") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const heute = new Date().toISOString().slice(0, 10)
  const kommend = tournaments.filter(t => !t.date || t.date >= heute)
  const vorbei = tournaments.filter(t => t.date && t.date < heute).slice(0, 4)

  const freiGesamt = kommend.reduce((s, t) => {
    const an = t.tournament_registrations?.[0]?.count ?? 0
    return s + Math.max(0, (t.max_players || 0) - an)
  }, 0)

  return (
    <>
      <main className="p-dunkel" style={{ minHeight: "100dvh", fontFamily: INTER }}>

        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ppl-spielen.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
          <div aria-hidden className="p-hero-schleier" />

          <PlayerKopf />

          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">Turniere</h1>
            <p className="p-eyebrow">Turniere, Open Games<br />und Events in deiner Nähe.</p>

            <div className="p-streifen">
              <div>
                <span className="zahl">{kommend.length || "—"}</span>
                <span className="was">Kommend</span>
              </div>
              <div>
                <span className="zahl">{freiGesamt || "—"}</span>
                <span className="was">Plätze frei</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>

          {/* ── Naechste Events ── */}
          <section className="p-karte">
            <div className="p-kopf">
              <h2><IconKalender size={22}/>Nächste Events</h2>
              <Link href="/turniere/neu" className="p-mehr">Erstellen →</Link>
            </div>

            {loading && <p className="p-leer">Turniere werden geladen …</p>}

            {!loading && error && (
              <div style={{ padding: 18 }}>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: LEISE }}>{error}</p>
                <button onClick={load} style={knopfUmriss}>Nochmals</button>
              </div>
            )}

            {!loading && !error && kommend.length === 0 && (
              <p className="p-leer">
                Die nächsten Turniere stehen bald fest. Bis dahin:{" "}
                <Link href="/match" style={{ color: TEXT, fontWeight: 600 }}>Open Games ansehen →</Link>
              </p>
            )}

            {!loading && !error && kommend.map(t => {
              const angemeldet = t.tournament_registrations?.[0]?.count ?? 0
              const frei = Math.max(0, (t.max_players || 0) - angemeldet)
              const offen = t.status === "open"
              return (
                <div key={t.id} className="p-zeile hat-cta">
                  <span className="p-datum voll">
                    <span className="wt">{tagKurz(t.date)}</span>
                    <span className="tag">{tagZahl(t.date)}</span>
                    <span className="mon">{tagMon(t.date)}</span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/turniere/${t.id}`} style={{ color: TEXT, textDecoration: "none" }}>
                      <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{t.name}</b>
                    </Link>
                    <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
                      {t.format === "ko" ? "Turnier · K.-o." : "Turnier · Gruppen + K.o."}{t.skill_class ? ` · ${t.skill_class}` : ""}
                    </span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 13, fontWeight: 400, color: LEISE }}>
                      {t.city || "Ort offen"}{t.max_players ? ` · ${frei > 0 ? `${frei} Plätze frei` : "ausgebucht"}` : ""}
                    </span>
                  </span>

                  <span className="cta">
                    {offen
                      ? <Link href={`/turniere/${t.id}`} className="p-aktion">Anmelden</Link>
                      : <span className="p-pille">{STATUS[t.status] || t.status}</span>}
                  </span>
                </div>
              )
            })}
          </section>

          {/* ── Community: echte Bilder aus der Lounge ── */}
          <section className="p-karte p-abschnitt">
            <div className="p-kopf">
              <h2><IconCommunity size={22}/>Community</h2>
              <Link href="/feed" className="p-mehr">Feed →</Link>
            </div>
            <div style={{ padding: 18 }}>
              <div className="p-bilder">
                {["/ppl-lachen.jpg", "/ppl-home.jpg", "/ppl-tisch.jpg"].map(src => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" aria-hidden />
                ))}
              </div>
              <p style={{ margin: "14px 0 2px", fontSize: 15, fontWeight: 600, color: TEXT }}>
                Great games. Better people.
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 400, color: LEISE }}>
                Impressionen aus unseren Lounges.
              </p>
            </div>
          </section>

          {/* ── Zuletzt gespielt ── */}
          {vorbei.length > 0 && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf"><h2><IconMatches size={22}/>Zuletzt gespielt</h2></div>
              {vorbei.map(t => (
                <Link key={t.id} href={`/turniere/${t.id}`} className="p-zeile">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{t.name}</b>
                    <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
                      {datum(t.date)}{t.city ? ` · ${t.city}` : ""}
                    </span>
                  </span>
                  <IconChevron size={19} style={{ color: LEISE }} />
                </Link>
              ))}
            </section>
          )}

          <div className="p-knopfreihe">
            <Link href="/match" style={knopf}>Open Games</Link>
            <Link href="/liga" style={knopfUmriss}>Liga</Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
