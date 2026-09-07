"use client"
/* PLAYER V2 — EVENTS (07.09.2026, Oliver).

   Die Seite beantwortet: "Was läuft demnächst und wo kann ich mitmachen?"
   Sie soll Lust machen, nicht wie eine Terminverwaltung wirken — deshalb
   traegt ein echtes PPL-Foto den Kopf, und die Liste steht auf Off-White,
   weil Datum, Ort und freie Plaetze gelesen werden muessen.

   Aufbau nach Referenz-Mockup: HERO (Foto, EVENTS, PLAY. MEET. REPEAT.),
   darunter mit gerader Kante die Off-White-Flaeche mit den naechsten
   Terminen, der Community und den vergangenen Turnieren.
   Daten und Funktionen unveraendert: /api/turniere, dieselben Felder. */
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import HeroKopf from "@/app/components/HeroKopf"
import {
  Hero, Inhalt, AbschnittKopf, Feld, ListenZeile, DatumBlock, Pille, Pfeil,
  knopfPrimaer, knopfKlein, knopfOutlineHell, TEXT_LEISE, FLAECHE,
} from "@/app/components/V2"
import { SCHWARZ, INTER } from "@/app/theme"

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
      <main style={{ minHeight: "100dvh", background: FLAECHE, color: SCHWARZ, fontFamily: INTER }}>

        <Hero
          bild="/ppl-events.jpg" pos="46% 34%"
          kopf={<HeroKopf />}
          etikett="Events"
          titel={<>Play.<br />Meet.<br />Repeat.</>}
          subline={<>Turniere, Open Games und<br />Community Events in deiner Nähe.</>}
        />

        <Inhalt>
          {/* ── Naechste Events ── */}
          <AbschnittKopf titel="Nächste Events" mehr="Erstellen" href="/turniere/neu" />

          {loading && <p style={{ fontSize: 15, color: TEXT_LEISE, margin: 0 }}>Turniere werden geladen …</p>}

          {!loading && error && (
            <Feld padding={16}>
              <p style={{ fontSize: 15, color: TEXT_LEISE, margin: "0 0 14px" }}>{error}</p>
              <button onClick={load} style={knopfOutlineHell}>Nochmals</button>
            </Feld>
          )}

          {!loading && !error && kommend.length === 0 && (
            <Feld padding={20}>
              <p style={{ fontSize: 15.5, color: TEXT_LEISE, margin: 0, lineHeight: 1.55 }}>
                Die nächsten Turniere stehen bald fest. Bis dahin:{" "}
                <Link href="/match" style={{ color: "#5B1FBF", fontWeight: 700 }}>Open Games ansehen →</Link>
              </p>
            </Feld>
          )}

          {!loading && !error && kommend.length > 0 && (
            <Feld>
              {kommend.map((t, i) => {
                const angemeldet = t.tournament_registrations?.[0]?.count ?? 0
                const frei = Math.max(0, (t.max_players || 0) - angemeldet)
                const offen = t.status === "open"
                const d = t.date ? new Date(`${t.date}T12:00:00`) : null
                return (
                  <ListenZeile
                    key={t.id}
                    erste={i === 0}
                    links={<DatumBlock tag={d ? d.getDate() : "–"} monat={d ? d.toLocaleDateString("de-CH", { month: "short" }).replace(".", "") : ""} />}
                    titel={<Link href={`/turniere/${t.id}`} style={{ color: SCHWARZ, textDecoration: "none" }}>{t.name}</Link>}
                    unter={`${t.format === "ko" ? "Turnier · K.-o." : "Turnier · Gruppen + K.o."}${t.skill_class ? ` · ${t.skill_class}` : ""}`}
                    meta={`${t.city || "Ort offen"}${t.max_players ? ` · ${frei > 0 ? `${frei} Plätze frei` : "ausgebucht"}` : ""}`}
                    rechts={offen
                      ? <Link href={`/turniere/${t.id}`} style={knopfKlein}>Anmelden</Link>
                      : <Pille text={STATUS[t.status] || t.status} />}
                  />
                )
              })}
            </Feld>
          )}

          {/* ── Community: echte Bilder aus der Lounge ── */}
          <div style={{ marginTop: 28 }}>
            <AbschnittKopf titel="Community" mehr="Feed" href="/feed" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {["/ppl-lachen.jpg", "/ppl-home.jpg", "/ppl-tisch.jpg"].map(src => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" aria-hidden style={{
                  width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, display: "block",
                }} />
              ))}
            </div>
            <p style={{ fontFamily: INTER, fontSize: 15, color: SCHWARZ, fontWeight: 700, margin: "12px 0 2px" }}>
              Great games. Better people.
            </p>
            <p style={{ fontFamily: INTER, fontSize: 13.5, color: TEXT_LEISE, margin: 0 }}>
              Impressionen aus unseren Lounges.
            </p>
          </div>

          {/* ── Zuletzt gespielt ── */}
          {vorbei.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <AbschnittKopf titel="Zuletzt gespielt" />
              <Feld>
                {vorbei.map((t, i) => (
                  <Link key={t.id} href={`/turniere/${t.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <ListenZeile erste={i === 0} titel={t.name} unter={`${datum(t.date)}${t.city ? ` · ${t.city}` : ""}`} rechts={<Pfeil />} />
                  </Link>
                ))}
              </Feld>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26, maxWidth: 480 }}>
            <Link href="/match" style={{ ...knopfPrimaer, flex: "1 1 170px" }}>Open Games</Link>
            <Link href="/liga" style={{ ...knopfOutlineHell, flex: "1 1 130px" }}>Liga</Link>
          </div>
        </Inhalt>
      </main>
      <BottomNav />
    </>
  )
}
