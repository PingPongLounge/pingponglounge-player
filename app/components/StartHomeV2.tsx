"use client"
/* PLAYER V2 — Startseite fuer Angemeldete (07.09.2026, nach Referenzbild).

   Aufbau, verbindlich fuer alle V2-Screens:
     FOTO (echte Leute, ~1/3 Bildschirm, laeuft in Schwarz aus)
       ↓  GROSSER TITEL + Name + zwei Aktionen        auf Schwarz
       ↘  OFF-WHITE: die Zahlen und das naechste Match
       ↘  SCHWARZ: Community, offene Spiele, Turnier

   Der Titel sitzt bewusst UNTER dem Foto, nicht darauf: auf deckendem
   Schwarz ist er lesbar, und das Bild bleibt ein Bild.

   Alle Zahlen und Listen sind echte Daten aus entdecken/page.tsx —
   keine Platzhalter. Fehlt etwas, wird der Block weggelassen, nicht erfunden. */
import Link from "next/link"
import BottomNav from "./BottomNav"
import PendingConfirmBanner from "./PendingConfirmBanner"
import ProfilAvatar from "./ProfilAvatar"
import HeroKopf from "./HeroKopf"
import {
  FotoHero, KanteZuHell, KanteZuDunkel, Etikett, Titel,
  StatsReihe, ListenZeile, knopfPrimaer, knopfOutline, knopfOutlineHell,
  knopfKlein, knopfKleinOutline,
} from "./V2"
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, MUT } from "@/app/theme"

export type Game = { id: string; href: string; day: string; time: string; title: string; sub: string; frei: number; full: boolean; ratio: string }
export type Aktivitaet = { art: "forderung" | "neu"; id: string; spielerId: string; name: string; avatar: string | null; text: string }
export type StartData = {
  firstName: string; initials: string; avatarUrl?: string | null; canton?: string | null
  lvl: string; rank: number; elo: number; pct: number; nextLabel: string
  ppBalance: number; wins: number; played: number; games: Game[]
  season: { has: boolean; label: string; city: string; leagueRank: number }
  tour: { name: string; dateLabel: string; formatLabel: string } | null
  nextGame?: { href: string; when: string; location: string } | null
  aktivitaet?: Aktivitaet[]
}

export default function StartHomeV2(d: StartData) {
  const winrate = d.played ? Math.round((d.wins / d.played) * 100) : 0
  const aktiv = d.aktivitaet || []

  return (
    <>
      <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER }}>

        {/* ══ FOTO-HERO ═══════════════════════════════════════════════ */}
        <FotoHero bild="/ppl-lachen.jpg" pos="62% 38%" kopf={<HeroKopf />}>
          <h1 style={{
            fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(56px,16vw,104px)",
            lineHeight: .86, textTransform: "uppercase", letterSpacing: ".005em", margin: "6px 0 0",
          }}>Ready<br />to play?</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
            <ProfilAvatar src={d.avatarUrl} name={d.firstName} groesse={64} />
            <div style={{ minWidth: 0 }}>
              <strong style={{
                display: "block", fontFamily: ANTON, fontWeight: 400,
                fontSize: "clamp(26px,7vw,38px)", lineHeight: 1, textTransform: "uppercase",
              }}>{d.firstName}</strong>
              <span style={{ display: "block", fontFamily: INTER, fontSize: 14.5, color: MUT, marginTop: 6 }}>
                Level {d.lvl}{d.canton ? ` · ${d.canton}` : ""} · {d.elo} Rating
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <Link href="/match" style={{ ...knopfPrimaer, flex: "1 1 170px" }}>Match finden</Link>
            <Link href="/profil" style={{ ...knopfOutline, flex: "1 1 130px" }}>Profil</Link>
          </div>

          <div style={{ marginTop: 18 }}><PendingConfirmBanner /></div>
        </FotoHero>

        {/* ══ OFF-WHITE: DIE ZAHLEN ═══════════════════════════════════ */}
        <KanteZuHell />
        <section style={{ background: CREME, color: SCHWARZ }}>
          <div className="ppl-breit" style={{ paddingTop: 28, paddingBottom: 34 }}>
            <Etikett text="Auf einen Blick" hell />
            <h2 style={{
              fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(30px,8vw,42px)",
              lineHeight: .94, textTransform: "uppercase", margin: "8px 0 26px", color: SCHWARZ,
            }}>Heute wichtig</h2>

            <StatsReihe hell werte={[
              { wert: d.elo, label: "Rating" },
              {
                wert: d.season.has && d.season.leagueRank ? `#${d.season.leagueRank}` : `#${d.rank}`,
                label: d.season.has && d.season.leagueRank ? "Liga" : "Schweiz", akzent: true,
              },
              { wert: d.played, label: "Matches" },
              { wert: `${winrate}%`, label: "Win Rate" },
            ]} />

            {/* Naechstes Match und Liga-Fortschritt stehen auf dem Desktop
                nebeneinander — sonst bleibt die breite Spalte halb leer. */}
            <div className="ppl-g2" style={{ marginTop: 30 }}>
              <div style={{ borderTop: "1px solid rgba(8,8,8,.16)", paddingTop: 22 }}>
                <Etikett text="Nächstes Match" hell />
                {d.nextGame ? (
                  <>
                    <strong style={{
                      display: "block", fontFamily: ANTON, fontWeight: 400,
                      fontSize: "clamp(26px,7vw,38px)", lineHeight: 1,
                      textTransform: "uppercase", margin: "10px 0 6px", color: SCHWARZ,
                    }}>{d.nextGame.location}</strong>
                    <div style={{ fontFamily: INTER, fontSize: 16, color: "rgba(8,8,8,.66)" }}>{d.nextGame.when}</div>
                    <Link href={d.nextGame.href} style={{ ...knopfOutlineHell, marginTop: 18 }}>Details</Link>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: INTER, fontSize: 16, color: "rgba(8,8,8,.66)", margin: "10px 0 0" }}>
                      Kein Spiel eingetragen.
                    </div>
                    <Link href="/match" style={{ ...knopfOutlineHell, marginTop: 18 }}>Open Game suchen</Link>
                  </>
                )}
              </div>

              {d.nextLabel && (
                <div style={{ borderTop: "1px solid rgba(8,8,8,.16)", paddingTop: 22 }}>
                  <Etikett text="Nächstes Level" hell />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: INTER, fontSize: 15, color: "rgba(8,8,8,.66)", marginTop: 14 }}>
                    <span>{d.nextLabel}</span>
                    <b style={{ color: SCHWARZ }}>{d.pct}%</b>
                  </div>
                  <div style={{ height: 6, borderRadius: 100, background: "rgba(8,8,8,.12)", marginTop: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${d.pct}%`, background: VIOLETT, borderRadius: 100 }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        <KanteZuDunkel />

        {/* ══ SCHWARZ: WAS LÄUFT ══════════════════════════════════════ */}
        <section className="ppl-breit" style={{ paddingTop: 30 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
            <div>
              <Etikett text="Community" />
              <Titel>Was läuft</Titel>
            </div>
            <Link href="/feed" style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: CREME, textDecoration: "none", whiteSpace: "nowrap", paddingBottom: 4 }}>Feed →</Link>
          </div>

          <div style={{ marginTop: 18 }}>
            {aktiv.length ? aktiv.map((a, i) => (
              <ListenZeile
                key={`${a.art}-${a.id}`}
                erste={i === 0}
                links={<ProfilAvatar src={a.avatar} name={a.name} groesse={44} />}
                titel={<Link href={`/spieler/${a.spielerId}`} style={{ color: CREME, textDecoration: "none" }}>{a.name}</Link>}
                unter={a.text}
                rechts={
                  <Link href={a.art === "forderung" ? "/liga" : `/spieler/${a.spielerId}`}
                    style={a.art === "forderung" ? knopfKlein : knopfKleinOutline}>
                    {a.art === "forderung" ? "Annehmen" : "Profil"}
                  </Link>
                }
              />
            )) : (
              <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, padding: "16px 0", margin: 0 }}>
                Zurzeit keine offenen Forderungen. Fordere jemanden in der Liga.
              </p>
            )}
          </div>

          {/* Offene Spiele — bestehende Liste, im Zeilenmuster der Referenz. */}
          {d.games.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 8 }}>
                <Etikett text="Offene Spiele" />
                <Link href="/match" style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: CREME, textDecoration: "none" }}>Alle →</Link>
              </div>
              <div className="ppl-liste2">
                {d.games.slice(0, 4).map((g, i) => (
                  <Link key={g.id} href={g.href} style={{ textDecoration: "none", display: "block" }}>
                    <ListenZeile
                      erste={i === 0}
                      titel={g.title}
                      unter={`${g.day} ${g.time} · ${g.sub}`}
                      rechts={
                        <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: g.full ? MUT : VIOLETT, whiteSpace: "nowrap" }}>
                          {g.full ? "voll" : `${g.frei} frei`}
                        </span>
                      }
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Naechstes Turnier — nur wenn es eines gibt. */}
          {d.tour && (
            <div style={{ marginTop: 32 }}>
              <Etikett text="Nächstes Turnier" />
              <Link href="/turniere" style={{ textDecoration: "none", display: "block", marginTop: 8 }}>
                <ListenZeile
                  erste
                  titel={d.tour.name}
                  unter={`${d.tour.dateLabel} · ${d.tour.formatLabel}`}
                  rechts={<span style={{ fontFamily: INTER, fontSize: 16, fontWeight: 800, color: VIOLETT }}>→</span>}
                />
              </Link>
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}
