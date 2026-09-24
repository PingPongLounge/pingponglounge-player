"use client"
/* PLAYER · HOME — die eingeloggte Startseite.

   Sie beantwortet eine Frage: "Was ist fuer mich jetzt wichtig?"

   24.09.2026: auf das Design-System V3 gezogen und damit auf denselben
   Stand wie die oeffentliche Startseite, die die visuelle Vorgabe ist —
   derselbe Kopf (Foto, PlayerKopf, eine Anton-Zeile, Eyebrow,
   Kennzahlenstreifen) und darunter .p-karte / .p-kopf / .p-zeile.
   Eingeloggte und Ausgeloggte sehen ab jetzt dieselbe Sprache.

   Alles hier sind echte Daten aus entdecken/page.tsx. Fehlt etwas, faellt
   der Block weg — es wird nichts erfunden. */
import Link from "next/link"
import BottomNav from "./BottomNav"
import PendingConfirmBanner from "./PendingConfirmBanner"
import ProfilAvatar from "./ProfilAvatar"
import PlayerKopf from "./PlayerKopf"
import { IconChevron } from "./Icons"
import { INTER, TEXT, LEISE, BG } from "@/app/design"

export type Game = { id: string; href: string; day: string; time: string; title: string; sub: string; frei: number; full: boolean; ratio: string }
export type Aktivitaet = { art: "forderung" | "neu"; id: string; spielerId: string; name: string; avatar: string | null; text: string }
export type LetztesMatch = { id: string; gegnerId: string; gegner: string; avatar: string | null; satz: string; sieg: boolean }
export type StartData = {
  firstName: string; initials: string; avatarUrl?: string | null; canton?: string | null
  lvl: string; rank: number; elo: number; pct: number; nextLabel: string
  ppBalance: number; wins: number; played: number; games: Game[]
  season: { has: boolean; label: string; city: string; leagueRank: number }
  tour: { name: string; dateLabel: string; formatLabel: string } | null
  nextGame?: { href: string; when: string; location: string } | null
  aktivitaet?: Aktivitaet[]
  letzteMatches?: LetztesMatch[]
}

export default function StartHomeV2(d: StartData) {
  const winrate = d.played ? Math.round((d.wins / d.played) * 100) : 0
  const aktiv = d.aktivitaet || []
  const letzte = d.letzteMatches || []
  const ligaRang = d.season.has && d.season.leagueRank ? d.season.leagueRank : d.rank
  const ligaLabel = d.season.has && d.season.leagueRank ? "Liga" : "Schweiz"

  return (
    <>
      <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>

        {/* 16.09.2026 (Oliver): Auf der Startseite steht der Name und der
            Claim — sonst nichts. Was zu tun ist, steht in den Kaestchen
            darunter. Derselbe Kopf wie auf der oeffentlichen Startseite. */}
        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/player-hero.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 62%" }} />
          <div aria-hidden className="p-hero-schleier" />

          <PlayerKopf />

          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">Player</h1>
            <p className="p-eyebrow">Die Ping Pong Liga<br />der Schweiz.</p>

            <div className="p-streifen">
              <div>
                <span className="zahl">{d.elo}</span>
                <span className="was">Rating</span>
              </div>
              <div>
                <span className="zahl">#{ligaRang}</span>
                <span className="was">{ligaLabel}</span>
              </div>
              <div>
                <span className="zahl">{winrate}%</span>
                <span className="was">Win Rate</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>
          <PendingConfirmBanner />

          {/* ── Dein naechstes Match ── */}
          <section className="p-karte">
            <div className="p-kopf">
              <h2>Dein nächstes Match</h2>
              {d.games.length > 0 && <Link href="/match" className="p-mehr">Alle →</Link>}
            </div>
            {d.nextGame ? (
              <Link href={d.nextGame.href} className="p-zeile">
                <ProfilAvatar src={d.avatarUrl} name={d.firstName} groesse={46} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{d.nextGame.location}</b>
                  <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>{d.nextGame.when}</span>
                </span>
                <IconChevron size={19} style={{ color: LEISE }} />
              </Link>
            ) : (
              <Link href="/match" className="p-zeile">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>Noch kein Spiel eingetragen</b>
                  <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>Offene Spiele in deiner Nähe ansehen</span>
                </span>
                <IconChevron size={19} style={{ color: LEISE }} />
              </Link>
            )}
          </section>

          {/* ── Dein Stand: vier Kaestchen, jedes fuehrt irgendwohin ── */}
          <section className="p-karte p-abschnitt">
            <div className="p-kopf"><h2>Dein Stand</h2></div>
            <div className="p-kacheln">
              <Link href="/profil" className="p-kachel">
                <span className="zahl">{d.elo}</span><span className="was">Rating</span>
              </Link>
              <Link href="/liga" className="p-kachel">
                <span className="zahl">#{ligaRang}</span><span className="was">{ligaLabel}</span>
              </Link>
              <Link href="/matchhistorie" className="p-kachel">
                <span className="zahl">{d.played}</span><span className="was">Matches</span>
              </Link>
              <Link href="/profil" className="p-kachel">
                <span className="zahl">{winrate}%</span><span className="was">Win Rate</span>
              </Link>
            </div>
          </section>

          {/* ── Deine letzten Matches ── */}
          {letzte.length > 0 && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf">
                <h2>Deine letzten Matches</h2>
                <Link href="/matchhistorie" className="p-mehr">Alle →</Link>
              </div>
              {letzte.map(m => (
                <Link key={m.id} href={`/spieler/${m.gegnerId}`} className="p-zeile">
                  <ProfilAvatar src={m.avatar} name={m.gegner} groesse={38} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>vs. {m.gegner}</b>
                  </span>
                  {m.satz && (
                    <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{m.satz}</span>
                  )}
                  <span className={m.sieg ? "p-pille gut" : "p-pille"}>{m.sieg ? "Sieg" : "Niederlage"}</span>
                </Link>
              ))}
            </section>
          )}

          {/* ── Offene Forderungen und neue Leute in der Liga ── */}
          {aktiv.length > 0 && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf">
                <h2>Was läuft</h2>
                <Link href="/feed" className="p-mehr">Feed →</Link>
              </div>
              {aktiv.map(a => (
                <div key={`${a.art}-${a.id}`} className="p-zeile hat-cta">
                  <ProfilAvatar src={a.avatar} name={a.name} groesse={38} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{a.name}</b>
                    <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>{a.text}</span>
                  </span>
                  <span className="cta">
                    {a.art === "forderung"
                      ? <Link href="/liga" className="p-aktion">Annehmen</Link>
                      : <Link href={`/spieler/${a.spielerId}`} aria-label={`Profil von ${a.name}`}><IconChevron size={19} style={{ color: LEISE }} /></Link>}
                  </span>
                </div>
              ))}
            </section>
          )}

          {/* ── Offene Spiele ── */}
          {d.games.length > 0 && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf">
                <h2>Heute wird gespielt</h2>
                <Link href="/match" className="p-mehr">Alle →</Link>
              </div>
              {d.games.slice(0, 3).map(g => (
                <Link key={g.id} href={g.href} className="p-zeile">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{g.title}</b>
                    <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>{g.day} {g.time} · {g.sub}</span>
                  </span>
                  <span style={{
                    flexShrink: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
                    color: g.full ? LEISE : "var(--p-akzent)",
                  }}>{g.ratio}</span>
                </Link>
              ))}
            </section>
          )}

          {/* ── Naechstes Turnier ── */}
          {d.tour && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf">
                <h2>Nächstes Turnier</h2>
                <Link href="/turniere" className="p-mehr">Alle →</Link>
              </div>
              <Link href="/turniere" className="p-zeile">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{d.tour.name}</b>
                  <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>{d.tour.dateLabel} · {d.tour.formatLabel}</span>
                </span>
                <IconChevron size={19} style={{ color: LEISE }} />
              </Link>
            </section>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
