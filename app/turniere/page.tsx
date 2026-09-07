"use client"
/* PLAYER V2 — EVENTS (07.09.2026, Oliver).

   Die Seite beantwortet: "Was läuft demnächst und wo kann ich mitmachen?"
   Sie soll Lust machen, nicht wie eine Terminverwaltung wirken — deshalb
   traegt ein echtes PPL-Foto den Kopf, und die Liste steht auf Off-White,
   weil Datum, Ort und freie Plaetze gelesen werden muessen.

   Rhythmus: FOTO-HERO ↘ OFF-WHITE (naechste Events) ↘ SCHWARZ (Community).
   Daten und Funktionen unveraendert: /api/turniere, dieselben Felder. */
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import HeroKopf from "@/app/components/HeroKopf"
import { FotoHero, KanteZuHell, KanteZuDunkel, Etikett, Titel, knopfPrimaer, knopfOutline } from "@/app/components/V2"
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, LINE, MUT } from "@/app/theme"

type Tournament = {
  id: string; name: string; date: string; city: string; skill_class: string
  max_players: number; status: string; format: string
  tournament_registrations: { count: number }[]
}

const STATUS: Record<string, string> = { open: "offen", running: "läuft", finished: "beendet" }
const breit: React.CSSProperties = { maxWidth: 620, margin: "0 auto", padding: "0 22px" }

function datum(d: string) {
  if (!d) return "Datum offen"
  const t = new Date(`${d}T12:00:00`)
  return t.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "long" })
}

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

  return (
    <>
      <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER }}>

        {/* ══ FOTO-HERO ══ */}
        <FotoHero bild="/ppl-events.jpg" pos="50% 44%" kopf={<HeroKopf />}>
          <Etikett text="Events" />
          <h1 style={{
            fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(56px,16vw,104px)",
            lineHeight: .86, textTransform: "uppercase", letterSpacing: ".005em", margin: "6px 0 0",
          }}>Play.<br />Meet.<br />Repeat.</h1>
        </FotoHero>

        {/* ══ OFF-WHITE: nächste Events ══ */}
        <KanteZuHell />
        <section style={{ background: CREME, color: SCHWARZ }}>
          <div className="ppl-breit" style={{ paddingTop: 28, paddingBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
              <div>
                <Etikett text={kommend.length ? `${kommend.length} ${kommend.length === 1 ? "Event" : "Events"}` : "Termine"} hell />
                <h2 style={{
                  fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(30px,8vw,42px)",
                  lineHeight: .94, textTransform: "uppercase", margin: "8px 0 0", color: SCHWARZ,
                }}>Nächste Events</h2>
              </div>
              <Link href="/turniere/neu" style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: SCHWARZ, textDecoration: "none", whiteSpace: "nowrap", paddingBottom: 4 }}>Erstellen →</Link>
            </div>

            {loading && <p style={{ fontSize: 16, color: "rgba(8,8,8,.6)", marginTop: 20 }}>Turniere werden geladen …</p>}

            {!loading && error && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 16, color: "rgba(8,8,8,.66)", margin: "0 0 14px" }}>{error}</p>
                <button onClick={load} style={{
                  fontFamily: INTER, fontSize: 14, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase",
                  padding: "13.5px 24px", borderRadius: 100, background: "transparent", color: SCHWARZ,
                  border: "1.5px solid rgba(8,8,8,.28)", cursor: "pointer",
                }}>Nochmals</button>
              </div>
            )}

            {!loading && !error && kommend.length === 0 && (
              <p style={{ fontSize: 16, color: "rgba(8,8,8,.66)", padding: "22px 0", borderTop: "1px solid rgba(8,8,8,.16)", marginTop: 16, marginBottom: 0 }}>
                Die nächsten Turniere stehen bald fest. Bis dahin: <Link href="/match" style={{ color: "#6B21D6", fontWeight: 700 }}>Open Games ansehen →</Link>
              </p>
            )}

            {!loading && !error && kommend.map(t => {
              const angemeldet = t.tournament_registrations?.[0]?.count ?? 0
              const frei = Math.max(0, (t.max_players || 0) - angemeldet)
              const offen = t.status === "open"
              return (
                <Link key={t.id} href={`/turniere/${t.id}`} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "18px 0",
                  borderTop: "1px solid rgba(8,8,8,.16)", textDecoration: "none", color: SCHWARZ,
                }}>
                  {/* Datum als typografischer Block statt als Karte */}
                  <span style={{ flexShrink: 0, width: 52, textAlign: "center" }}>
                    <b style={{ display: "block", fontFamily: ANTON, fontSize: 30, lineHeight: .9, color: SCHWARZ }}>
                      {t.date ? new Date(`${t.date}T12:00:00`).getDate() : "–"}
                    </b>
                    <span style={{ display: "block", fontFamily: INTER, fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(8,8,8,.5)", marginTop: 4 }}>
                      {t.date ? new Date(`${t.date}T12:00:00`).toLocaleDateString("de-CH", { month: "short" }) : ""}
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{t.name}</b>
                    <span style={{ display: "block", fontSize: 15, color: "rgba(8,8,8,.6)", marginTop: 3 }}>
                      {datum(t.date)}{t.city ? ` · ${t.city}` : ""}
                    </span>
                    <span style={{ display: "block", fontSize: 15, color: "rgba(8,8,8,.6)", marginTop: 1 }}>
                      {t.format === "ko" ? "K.-o.-Turnier" : "Gruppen + K.o."}
                      {t.skill_class ? ` · ${t.skill_class}` : ""}
                      {t.max_players ? ` · ${frei > 0 ? `${frei} frei` : "ausgebucht"}` : ""}
                    </span>
                  </span>
                  <span style={{
                    flexShrink: 0, fontFamily: INTER, fontSize: 11, fontWeight: 900, letterSpacing: ".09em",
                    textTransform: "uppercase", padding: "6px 12px", borderRadius: 100,
                    background: offen ? VIOLETT : "rgba(8,8,8,.10)", color: offen ? CREME : "rgba(8,8,8,.55)",
                  }}>{offen ? "Anmelden" : (STATUS[t.status] || t.status)}</span>
                </Link>
              )
            })}

            {/* Kurz und lesbar: wie es ablaeuft. */}
            <div style={{ marginTop: 28, borderTop: "1px solid rgba(8,8,8,.18)", paddingTop: 20 }}>
              <Etikett text="So läuft es" hell />
              <div style={{ marginTop: 10 }}>
                {[
                  ["01", "Turnier finden", "Datum, Ort und Klasse passen — anmelden."],
                  ["02", "Platz sichern", "Startgeld bezahlen, Platz ist reserviert."],
                  ["03", "Spielen", "Resultate zählen für dein Rating."],
                ].map(([nr, t, p]) => (
                  <div key={nr} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "9px 0" }}>
                    <span style={{ fontFamily: ANTON, fontSize: 16, color: "rgba(8,8,8,.34)", flexShrink: 0 }}>{nr}</span>
                    <span>
                      <b style={{ fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{t}</b>
                      <span style={{ fontFamily: INTER, fontSize: 16, color: "rgba(8,8,8,.62)" }}> — {p}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <KanteZuDunkel />

        {/* ══ SCHWARZ: Community ══ */}
        <section className="ppl-breit" style={{ paddingTop: 30 }}>
          <Etikett text="Community" />
          <Titel>Alle Level willkommen</Titel>
          <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, lineHeight: 1.55, margin: "14px 0 20px", maxWidth: "42ch" }}>
            Everyone plays everyone. Ob erstes Turnier oder zwanzigstes — gespielt wird gegen alle.
          </p>

          <div style={{ position: "relative", borderRadius: 4, overflow: "hidden", aspectRatio: "16 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-pokal.jpg" alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,8,8,.08) 0%, rgba(8,8,8,.28) 55%, rgba(8,8,8,.82) 100%)" }} />
          </div>

          {vorbei.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Etikett text="Zuletzt gespielt" />
              {vorbei.map(t => (
                <Link key={t.id} href={`/turniere/${t.id}`} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
                  borderTop: `1px solid ${LINE}`, textDecoration: "none", color: CREME, marginTop: 6,
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{t.name}</b>
                    <span style={{ display: "block", fontSize: 14, color: MUT, marginTop: 2 }}>{datum(t.date)}{t.city ? ` · ${t.city}` : ""}</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: MUT }}>→</span>
                </Link>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
            <Link href="/match" style={{ ...knopfPrimaer, flex: "1 1 170px" }}>Open Games</Link>
            <Link href="/liga" style={{ ...knopfOutline, flex: "1 1 130px" }}>Liga</Link>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
