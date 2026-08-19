"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "./BottomNav"
import CampaignOverlay from "./CampaignOverlay"
import PendingConfirmBanner from "./PendingConfirmBanner"
import { BG, CARD, W, SUB, MUT, LINE, GREEN, INK, btn, btnOutline } from "@/app/theme"

const GRAD = "linear-gradient(135deg,#FF00C8,#2BD4C4)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

// Bleibt exportiert — /entdecken baut die Open-Game-Liste damit (auch wenn die
// minimale Startseite sie nicht mehr anzeigt, andere Stellen nutzen den Typ).
export type Game = { id: string; href: string; day: string; time: string; title: string; sub: string; frei: number; full: boolean; ratio: string }

export type StartData = {
  firstName: string; initials: string; lvl: string; rank: number; elo: number
  pct: number; nextLabel: string
  ppBalance: number; wins: number; played: number
  games: Game[]
  season: { has: boolean; label: string; city: string; leagueRank: number }
  tour: { name: string; dateLabel: string; formatLabel: string } | null
  nextGame?: { href: string; when: string; location: string } | null
}

export default function StartHomeV2(d: StartData) {
  // Einmaliges Popup nach 10 gespielten Matches: Hinweis aufs Endjahresturnier.
  const [endjahr, setEndjahr] = useState(false)
  useEffect(() => {
    try { if (d.played >= 10 && !localStorage.getItem("endjahr_popup_v1")) setEndjahr(true) } catch { /* ignore */ }
  }, [d.played])
  function closeEndjahr() { setEndjahr(false); try { localStorage.setItem("endjahr_popup_v1", "1") } catch { /* ignore */ } }

  // Einmaliges Popup nach 15 App-Öffnungen: erklärt PingPoints.
  const [ppInfo, setPpInfo] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem("pp_popup_v1")) return
      const n = (Number(localStorage.getItem("pp_logins") || "0") || 0) + 1
      localStorage.setItem("pp_logins", String(n))
      if (n >= 15) setPpInfo(true)
    } catch { /* ignore */ }
  }, [])
  function closePpInfo() { setPpInfo(false); try { localStorage.setItem("pp_popup_v1", "1") } catch { /* ignore */ } }

  const popupCard: React.CSSProperties = { width: "100%", maxWidth: 380, background: CARD, borderRadius: 22, padding: "22px 20px", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }
  const popupWrap: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }

  return (
    <>
      <main style={{ minHeight: "100vh", background: BG, padding: "16px 16px 110px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Offene Ergebnis-Bestätigungen zuoberst — direkt antippbar. */}
          <PendingConfirmBanner />

          {/* Hero-Foto — Schläger & Ball (kein Essen) */}
          <div style={{ height: 210, borderRadius: 20, overflow: "hidden", position: "relative", margin: "4px 0 22px" }}>
            <img src="/ppl-training.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,11,13,.1) 0%,rgba(10,11,13,.35) 55%,rgba(10,11,13,.95) 100%)" }} />
          </div>

          <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-1px", color: W, margin: "0 0 18px" }}>Lust zum Spielen?</h1>

          <Link href="/match" style={btn}>Spiel finden</Link>
          <Link href="/liga" style={{ ...btnOutline, marginTop: 12 }}>Liga fordern</Link>

          {/* Dein nächstes Spiel — nur wenn wirklich eine Buchung besteht */}
          {d.nextGame && (
            <Link href={d.nextGame.href} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, marginTop: 22, textDecoration: "none" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: GREEN, fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Dein nächstes Spiel</span>
                <b style={{ display: "block", fontSize: 16, color: W, marginTop: 3 }}>{d.nextGame.when}</b>
                <span style={{ color: MUT, fontSize: 13 }}>{d.nextGame.location}</span>
              </span>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          )}

          {/* Nächste Open Games */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "30px 0 12px" }}>
            <span style={{ color: MUT, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>Nächste Open Games</span>
            <Link href="/match" style={{ color: GREEN, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Alle</Link>
          </div>
          {d.games.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, color: MUT, fontSize: 14 }}>Aktuell keine offenen Spiele.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.games.slice(0, 3).map(g => (
                <Link key={g.id} href={g.href} style={{ display: "flex", alignItems: "center", gap: 14, background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px", textDecoration: "none", opacity: g.full ? .5 : 1 }}>
                  <span style={{ width: 58, flexShrink: 0 }}>
                    <span style={{ display: "block", color: GREEN, fontSize: 10, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>{g.day}</span>
                    <span style={{ display: "block", fontSize: 18, fontWeight: 900, color: W, marginTop: 2 }}>{g.time}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, borderLeft: `1px solid ${LINE}`, paddingLeft: 14 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: W, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</span>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: g.full ? MUT : GREEN, marginTop: 2 }}>{g.full ? "Ausgebucht" : `${g.frei} ${g.frei === 1 ? "Platz" : "Plätze"} frei`}</span>
                  </span>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              ))}
            </div>
          )}

          <Link href="/match/create" style={{ ...btnOutline, marginTop: 14 }}>Open Game erstellen</Link>
        </div>
      </main>

      {/* Popup nach 10 Spielen: Endjahresturnier-Quali (einmalig) */}
      {endjahr && (
        <div onClick={closeEndjahr} style={popupWrap}>
          <div onClick={e => e.stopPropagation()} style={popupCard}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6, ...gt }}>Gut gespielt!</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1, marginBottom: 10 }}>10 Spiele geschafft</div>
            <p style={{ fontSize: 14, color: SUB, fontWeight: 300, lineHeight: 1.5, marginBottom: 16 }}>Wusstest du: Die <b style={{ color: W, fontWeight: 700 }}>besten 10 Spieler pro League</b> registrieren sich automatisch fürs <b style={{ color: W, fontWeight: 700 }}>Endjahresturnier</b>. Bleib dran!</p>
            <button onClick={closeEndjahr} style={{ ...btn, cursor: "pointer", fontFamily: "inherit" }}>Los geht&apos;s</button>
          </div>
        </div>
      )}

      {/* Popup nach 15 App-Öffnungen: PingPoints erklären (einmalig) */}
      {ppInfo && !endjahr && (
        <div onClick={closePpInfo} style={popupWrap}>
          <div onClick={e => e.stopPropagation()} style={popupCard}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6, ...gt }}>PingPoints</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1, marginBottom: 10 }}>Deine Punkte sammeln sich</div>
            <p style={{ fontSize: 14, color: SUB, fontWeight: 300, lineHeight: 1.5, marginBottom: 16 }}>Du sammelst <b style={{ color: W, fontWeight: 700 }}>PingPoints</b> beim Spielen — z. B. 5 Punkte für je 10 Liga-Spiele. Einlösbar für <b style={{ color: W, fontWeight: 700 }}>Tischbuchungen &amp; Prämien</b> (1 Punkt = CHF 1).</p>
            <a href="/pingpoints" onClick={closePpInfo} style={{ ...btn, cursor: "pointer" }}>PingPoints ansehen</a>
          </div>
        </div>
      )}

      <CampaignOverlay />
      <BottomNav />
    </>
  )
}
