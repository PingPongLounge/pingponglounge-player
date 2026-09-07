"use client"
/* PLAYER V2 — Startseite fuer Angemeldete (07.09.2026, Referenz).

   Rhythmus, verbindlich fuer alle V2-Screens:
     SCHWARZER HERO  ↘  OFF-WHITE INFORMATION  ↘  SCHWARZER INHALT
   Die Uebergaenge sind leicht schraege Kanten (20px ueber die volle Breite),
   kein Torn Paper. Bausteine kommen aus components/V2.tsx, Farben aus theme.ts.

   Alle Zahlen und Listen hier sind echte Daten aus entdecken/page.tsx —
   keine Platzhalter. Fehlt etwas, wird der Block weggelassen, nicht erfunden. */
import Link from "next/link"
import BottomNav from "./BottomNav"
import PendingConfirmBanner from "./PendingConfirmBanner"
import ProfilAvatar from "./ProfilAvatar"
import { KanteZuHell, KanteZuDunkel, Neon, Etikett, Titel, knopfPrimaer, knopfOutline, knopfOutlineHell } from "./V2"
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, LINE, MUT } from "@/app/theme"

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

const breit: React.CSSProperties = { maxWidth: 620, margin: "0 auto", padding: "0 22px" }

export default function StartHomeV2(d: StartData) {
  const winrate = d.played ? Math.round((d.wins / d.played) * 100) : 0
  const aktiv = d.aktivitaet || []

  const stat = (wert: string | number, label: string, akzent = false) => (
    <div key={label} style={{ minWidth: 0 }}>
      <strong style={{
        display: "block", fontFamily: ANTON, fontWeight: 400,
        fontSize: "clamp(30px,8.5vw,46px)", lineHeight: .95,
        color: akzent ? VIOLETT : SCHWARZ, fontVariantNumeric: "tabular-nums",
      }}>{wert}</strong>
      <small style={{
        display: "block", fontFamily: INTER, fontSize: 12, fontWeight: 800,
        letterSpacing: ".13em", textTransform: "uppercase",
        color: "rgba(8,8,8,.55)", marginTop: 7,
      }}>{label}</small>
    </div>
  )

  return (
    <>
      <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER, paddingBottom: 96 }}>
        <div style={breit}><PendingConfirmBanner /></div>

        {/* ══ SCHWARZER HERO ══════════════════════════════════════════ */}
        <header style={{ ...breit, paddingTop: 20, paddingBottom: 34 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 900, letterSpacing: ".1em" }}>
              PPL<span style={{ color: VIOLETT }}>.</span> <span style={{ color: VIOLETT }}>PLAYER</span>
            </span>
            <Neon text="Your turn" />
          </div>

          <div style={{ marginTop: 30 }}>
            <h1 style={{
              fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(52px,15vw,86px)",
              lineHeight: .88, textTransform: "uppercase", margin: 0, letterSpacing: ".005em",
            }}>Ready<br />to play?</h1>
            <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, margin: "16px 0 0", maxWidth: "42ch", lineHeight: 1.5 }}>
              Dein nächstes Match, dein Ranking und deine Community — auf einen Blick.
            </p>
          </div>

          {/* Der Mensch: Avatar, Name, Einordnung */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 30 }}>
            <ProfilAvatar src={d.avatarUrl} name={d.firstName} groesse={72} />
            <div style={{ minWidth: 0 }}>
              <strong style={{
                display: "block", fontFamily: ANTON, fontWeight: 400,
                fontSize: "clamp(26px,7vw,38px)", lineHeight: 1, textTransform: "uppercase",
              }}>{d.firstName}</strong>
              <span style={{ display: "block", fontFamily: INTER, fontSize: 15, color: MUT, marginTop: 7 }}>
                Level {d.lvl}{d.canton ? ` · ${d.canton}` : ""} · {d.elo} Rating
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
            <Link href="/match" style={{ ...knopfPrimaer, flex: "1 1 170px" }}>Match finden</Link>
            <Link href="/profil" style={{ ...knopfOutline, flex: "1 1 130px" }}>Profil</Link>
          </div>
        </header>

        {/* ══ OFF-WHITE: HEUTE WICHTIG ════════════════════════════════ */}
        <KanteZuHell />
        <section style={{ background: CREME, color: SCHWARZ }}>
          <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 22px 34px" }}>
            <Etikett text="Auf einen Blick" hell />
            <h2 style={{
              fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(30px,8vw,42px)",
              lineHeight: .94, textTransform: "uppercase", margin: "8px 0 26px", color: SCHWARZ,
            }}>Heute wichtig</h2>

            {/* Zahlen stehen direkt auf der Flaeche — keine Karten. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
              {[
                { w: d.elo, l: "Rating", a: false },
                { w: d.season.has && d.season.leagueRank ? `#${d.season.leagueRank}` : `#${d.rank}`, l: d.season.has && d.season.leagueRank ? "Liga" : "Schweiz", a: true },
                { w: d.played, l: "Matches", a: false },
                { w: `${winrate}%`, l: "Win Rate", a: false },
              ].map((x, i) => (
                <div key={x.l} style={{
                  paddingLeft: i === 0 ? 0 : 14,
                  borderLeft: i === 0 ? "none" : "1px solid rgba(8,8,8,.14)", minWidth: 0,
                }}>{stat(x.w, x.l, x.a)}</div>
              ))}
            </div>

            {/* Naechstes Match — nur wenn es eines gibt. */}
            <div style={{ marginTop: 30, borderTop: "1px solid rgba(8,8,8,.16)", paddingTop: 22 }}>
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

            {/* Liga-Fortschritt: der eine Satz, der sagt, wie weit es noch ist. */}
            {d.nextLabel && (
              <div style={{ marginTop: 26, borderTop: "1px solid rgba(8,8,8,.16)", paddingTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: INTER, fontSize: 15, color: "rgba(8,8,8,.66)" }}>
                  <span>{d.nextLabel}</span>
                  <b style={{ color: SCHWARZ }}>{d.pct}%</b>
                </div>
                <div style={{ height: 6, borderRadius: 100, background: "rgba(8,8,8,.12)", marginTop: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.pct}%`, background: VIOLETT, borderRadius: 100 }} />
                </div>
              </div>
            )}
          </div>
        </section>
        <KanteZuDunkel />

        {/* ══ SCHWARZ: WAS LÄUFT ══════════════════════════════════════ */}
        <section style={{ ...breit, paddingTop: 30 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
            <div>
              <Etikett text="Community" />
              <Titel>Was läuft</Titel>
            </div>
            <Link href="/feed" style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: CREME, textDecoration: "none", whiteSpace: "nowrap", paddingBottom: 4 }}>Feed →</Link>
          </div>

          {/* Ein echtes PPL-Bild traegt die Stimmung. */}
          <div style={{ position: "relative", marginTop: 20, borderRadius: 4, overflow: "hidden", aspectRatio: "16 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ppl-training.png" alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(8,8,8,.10) 0%, rgba(8,8,8,.30) 55%, rgba(8,8,8,.86) 100%)` }} />
            <div style={{ position: "absolute", left: 16, bottom: 14 }}><Neon text="Game on" groesse={14} kippen={-2} /></div>
          </div>

          <div style={{ marginTop: 22 }}>
            {aktiv.length ? aktiv.map(a => (
              <div key={`${a.art}-${a.id}`} style={{
                display: "flex", alignItems: "center", gap: 13,
                padding: "14px 0", borderTop: `1px solid ${LINE}`,
              }}>
                <ProfilAvatar src={a.avatar} name={a.name} groesse={44} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/spieler/${a.spielerId}`} style={{ display: "block", fontFamily: INTER, fontSize: 16, fontWeight: 700, color: CREME, textDecoration: "none" }}>{a.name}</Link>
                  <span style={{ display: "block", fontFamily: INTER, fontSize: 14, color: MUT, marginTop: 2 }}>{a.text}</span>
                </span>
                <Link href={a.art === "forderung" ? "/liga" : `/spieler/${a.spielerId}`} style={{
                  fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: ".08em",
                  textTransform: "uppercase", textDecoration: "none", whiteSpace: "nowrap",
                  padding: "10px 16px", borderRadius: 100,
                  background: a.art === "forderung" ? VIOLETT : "transparent",
                  color: CREME, border: a.art === "forderung" ? "none" : `1.5px solid rgba(244,241,235,.30)`,
                }}>{a.art === "forderung" ? "Annehmen" : "Profil"}</Link>
              </div>
            )) : (
              <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, padding: "14px 0", borderTop: `1px solid ${LINE}`, margin: 0 }}>
                Zurzeit keine offenen Forderungen. Fordere jemanden in der Liga.
              </p>
            )}
          </div>

          {/* Offene Spiele — bestehende Liste, neu gesetzt. */}
          {d.games.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 6 }}>
                <Etikett text="Offene Spiele" />
                <Link href="/match" style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: CREME, textDecoration: "none" }}>Alle →</Link>
              </div>
              {d.games.slice(0, 4).map(g => (
                <Link key={g.id} href={g.href} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 0", borderTop: `1px solid ${LINE}`, textDecoration: "none", color: CREME,
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{g.title}</b>
                    <span style={{ display: "block", fontFamily: INTER, fontSize: 14, color: MUT, marginTop: 2 }}>{g.day} {g.time} · {g.sub}</span>
                  </span>
                  <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: g.full ? MUT : VIOLETT, whiteSpace: "nowrap" }}>
                    {g.full ? "voll" : `${g.frei} frei`}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Naechstes Turnier — nur wenn es eines gibt. */}
          {d.tour && (
            <div style={{ marginTop: 30 }}>
              <Etikett text="Nächstes Turnier" />
              <Link href="/turniere" style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 0", borderTop: `1px solid ${LINE}`, marginTop: 6,
                textDecoration: "none", color: CREME,
              }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{d.tour.name}</b>
                  <span style={{ display: "block", fontFamily: INTER, fontSize: 14, color: MUT, marginTop: 2 }}>{d.tour.dateLabel} · {d.tour.formatLabel}</span>
                </span>
                <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: VIOLETT }}>→</span>
              </Link>
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}
