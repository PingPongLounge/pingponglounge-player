"use client"
/* PLAYER V2 — HOME (07.09.2026, nach dem Referenz-Mockup).

   HOME beantwortet eine Frage: "Was ist fuer mich jetzt wichtig?"

     HERO      Venue-Bild, Etikett HOME, YOUR GAME., zwei Zeilen Erklaerung
     INHALT    Dein naechstes Match · vier Zahlen · deine letzten Matches
               danach, wenn vorhanden: was in der Community laeuft

   Alles hier sind echte Daten aus entdecken/page.tsx. Fehlt etwas, faellt
   der Block weg — es wird nichts erfunden. */
import Link from "next/link"
import BottomNav from "./BottomNav"
import PendingConfirmBanner from "./PendingConfirmBanner"
import ProfilAvatar from "./ProfilAvatar"
import HeroKopf from "./HeroKopf"
import {
  Hero, Inhalt, Feld, StatsKacheln, ListenZeile, Pfeil, Pille,
  knopfKlein, TEXT_LEISE, FLAECHE,
} from "./V2"
import { SCHWARZ, VIOLETT, INTER } from "@/app/theme"

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

  return (
    <>
      <main style={{ minHeight: "100dvh", background: FLAECHE, color: SCHWARZ, fontFamily: INTER }}>

        {/* 16.09.2026 (Oliver): Auf der Startseite steht der Name und der
            Claim — sonst nichts. Kein Etikett, kein YOUR GAME, keine
            Erklaerzeile. Was zu tun ist, steht in den Kaestchen darunter. */}
        <Hero
          kopf={<HeroKopf />}
          titel={<>Player<span style={{ color: VIOLETT }}>.</span></>}
          subline={<>Die Ping Pong Liga<br />der Schweiz.</>}
        />

        <Inhalt>
          <div style={{ marginBottom: 22 }}><PendingConfirmBanner /></div>

          {/* ── Dein naechstes Match + die vier Zahlen ── */}
          <Feld titel="Dein nächstes Match" mehr={d.games.length ? "Alle" : undefined} href={d.games.length ? "/match" : undefined}>
            {d.nextGame ? (
              <Link href={d.nextGame.href} style={{ textDecoration: "none", display: "block" }}>
                <ListenZeile
                  erste
                  links={<ProfilAvatar src={d.avatarUrl} name={d.firstName} groesse={46} />}
                  titel={d.nextGame.location}
                  unter={d.nextGame.when}
                  rechts={<Pfeil />}
                />
              </Link>
            ) : (
              <Link href="/match" style={{ textDecoration: "none", display: "block" }}>
                <ListenZeile
                  erste
                  titel="Noch kein Spiel eingetragen"
                  unter="Offene Spiele in deiner Nähe ansehen"
                  rechts={<Pfeil />}
                />
              </Link>
            )}
          </Feld>

          {/* ── Dein Stand: vier Kaestchen, jedes fuehrt irgendwohin ── */}
          <div style={{ marginTop: 26 }}>
            <h2 style={{
              fontFamily: INTER, fontSize: 17, fontWeight: 900, letterSpacing: ".04em",
              textTransform: "uppercase", margin: "0 0 12px", color: SCHWARZ,
            }}>Dein Stand</h2>
            <StatsKacheln werte={[
              { wert: d.elo, label: "Rating", ziel: "/profil", zielLabel: "Profil" },
              {
                wert: d.season.has && d.season.leagueRank ? `#${d.season.leagueRank}` : `#${d.rank}`,
                label: d.season.has && d.season.leagueRank ? "Liga" : "Schweiz",
                akzent: true, ziel: "/liga", zielLabel: "Liga",
              },
              { wert: d.played, label: "Matches", ziel: "/matchhistorie", zielLabel: "Historie" },
              { wert: `${winrate}%`, label: "Win Rate", ziel: "/profil", zielLabel: "Profil" },
            ]} />
          </div>

          {/* ── Deine letzten Matches ── */}
          {letzte.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <Feld titel="Deine letzten Matches" mehr="Alle" href="/matchhistorie">
                {letzte.map((m, i) => (
                  <Link key={m.id} href={`/spieler/${m.gegnerId}`} style={{ textDecoration: "none", display: "block" }}>
                    <ListenZeile
                      erste={i === 0}
                      links={<ProfilAvatar src={m.avatar} name={m.gegner} groesse={38} />}
                      titel={`vs. ${m.gegner}`}
                      rechts={
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                          {m.satz && <b style={{ fontFamily: INTER, fontSize: 15, fontWeight: 800, color: SCHWARZ, fontVariantNumeric: "tabular-nums" }}>{m.satz}</b>}
                          <Pille text={m.sieg ? "Sieg" : "Niederlage"} ton={m.sieg ? "gut" : "warn"} />
                        </span>
                      }
                    />
                  </Link>
                ))}
              </Feld>
            </div>
          )}

          {/* ── Offene Forderungen und neue Leute in der Liga ── */}
          {aktiv.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <Feld titel="Was läuft" mehr="Feed" href="/feed">
                {aktiv.map((a, i) => (
                  <ListenZeile
                    key={`${a.art}-${a.id}`}
                    erste={i === 0}
                    links={<ProfilAvatar src={a.avatar} name={a.name} groesse={38} />}
                    titel={a.name}
                    unter={a.text}
                    rechts={
                      <Link href={a.art === "forderung" ? "/liga" : `/spieler/${a.spielerId}`}
                        style={a.art === "forderung" ? knopfKlein : { textDecoration: "none" }}>
                        {a.art === "forderung" ? "Annehmen" : <Pfeil />}
                      </Link>
                    }
                  />
                ))}
              </Feld>
            </div>
          )}

          {/* ── Offene Spiele ── */}
          {d.games.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <Feld titel="Heute wird gespielt" mehr="Alle" href="/match">
                {d.games.slice(0, 3).map((g, i) => (
                  <Link key={g.id} href={g.href} style={{ textDecoration: "none", display: "block" }}>
                    <ListenZeile
                      erste={i === 0}
                      titel={g.title}
                      unter={`${g.day} ${g.time} · ${g.sub}`}
                      rechts={<span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: g.full ? TEXT_LEISE : "#0E3AAE", whiteSpace: "nowrap" }}>{g.ratio}</span>}
                    />
                  </Link>
                ))}
              </Feld>
            </div>
          )}

          {/* ── Naechstes Turnier ── */}
          {d.tour && (
            <div style={{ marginTop: 26 }}>
              <Feld titel="Nächstes Turnier" mehr="Alle" href="/turniere">
                <Link href="/turniere" style={{ textDecoration: "none", display: "block" }}>
                  <ListenZeile erste titel={d.tour.name} unter={`${d.tour.dateLabel} · ${d.tour.formatLabel}`} rechts={<Pfeil />} />
                </Link>
              </Feld>
            </div>
          )}
        </Inhalt>
      </main>
      <BottomNav />
    </>
  )
}
