"use client"
import { useEffect, useRef } from "react"
import Link from "next/link"
import BottomNav from "./BottomNav"
import StartMenu from "./StartMenu"

const BG = "#20242C", CARD = "#2A2F39", CELL = "#353B46", HERO = "#14171E", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.88)", MUT = "rgba(255,255,255,.55)"
const LINE = "rgba(255,255,255,.09)"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const SHADOW = "0 1px 4px rgba(0,0,0,.14)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

export type Game = { id: string; href: string; day: string; time: string; title: string; sub: string; frei: number; full: boolean; ratio: string }

export type StartData = {
  firstName: string; initials: string; lvl: string; rank: number; elo: number
  pct: number; nextLabel: string
  ppBalance: number; wins: number; played: number
  games: Game[]
  season: { has: boolean; label: string; city: string; leagueRank: number }
  tour: { name: string; dateLabel: string; formatLabel: string } | null
}

const card: React.CSSProperties = { background: CARD, borderRadius: 24, padding: 24, boxShadow: SHADOW, margin: "0 16px 18px" }
const eyebrow: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".24em", textTransform: "uppercase", color: MUT }
const ctitle: React.CSSProperties = { fontSize: 30, fontWeight: 900, letterSpacing: "-.01em", textTransform: "uppercase" }
const csub: React.CSSProperties = { fontSize: 14, color: SUB, fontWeight: 300, marginTop: 8, textAlign: "center" }
const thead: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6 }
const ehead: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }
const cta: React.CSSProperties = { display: "block", textAlign: "center", marginTop: 20, background: GRAD, color: "#06210F", borderRadius: 15, padding: 16, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", textDecoration: "none" }
const ghost: React.CSSProperties = { display: "block", textAlign: "center", marginTop: 18, border: "1.5px solid transparent", borderRadius: 15, padding: 15, fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#fff", textDecoration: "none", background: `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` }
const fact: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: `1px solid ${LINE}` }
const factK: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: MUT }
const factV: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: W }

export default function StartHomeV2(d: StartData) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return
        const t = e.target as HTMLElement
        t.style.opacity = "1"; t.style.transform = "none"
        t.querySelectorAll<HTMLElement>("[data-count]").forEach(c => {
          if (c.dataset.done) return
          c.dataset.done = "1"
          const target = Number(c.dataset.count || "0"); const t0 = performance.now()
          const step = (now: number) => {
            const p = Math.min(1, (now - t0) / 1000)
            c.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("de-CH")
            if (p < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        })
        t.querySelectorAll<HTMLElement>("[data-bar]").forEach(b => {
          requestAnimationFrame(() => { b.style.width = (b.dataset.bar || "0") + "%" })
        })
      })
    }, { threshold: .15 })
    el.querySelectorAll<HTMLElement>(".rev").forEach(n => {
      n.style.opacity = "0"; n.style.transform = "translateY(26px)"; n.style.transition = "opacity .55s ease, transform .65s cubic-bezier(.2,.7,.2,1)"
      io.observe(n)
    })
    return () => io.disconnect()
  }, [])

  return (
    <>
      <main style={{ minHeight: "100vh", background: BG, paddingBottom: 110 }}>
        <div ref={root} style={{ maxWidth: 480, margin: "0 auto", padding: "18px 0 90px" }}>

          {/* Kopf */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 13, padding: "0 18px", marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: W }}>Hi, {d.firstName} 👋</div>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#06210F", background: GRAD, borderRadius: 999, padding: "2px 7px" }}>Beta</span>
              </div>
              <div style={{ fontSize: 13, color: MUT, fontWeight: 500, marginTop: 1 }}>{d.lvl} · #{d.rank}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a href="https://pingponglounge.ch/shop" target="_blank" rel="noopener noreferrer" aria-label="Shop" style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${CELL}`, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /></svg>
              </a>
              <StartMenu inline avatar={d.initials} name={d.firstName} sub={`${d.lvl} · #${d.rank}`} />
            </div>
          </div>

          {/* RANG */}
          <div className="rev" style={{ ...card, background: HERO, textAlign: "center" }}>
            <div style={ehead}><img src="/icons/levelup.svg" alt="" style={{ width: 18, height: 18 }} /><span style={eyebrow}>Dein Rang</span></div>
            <div style={{ fontSize: 108, fontWeight: 900, lineHeight: .82, letterSpacing: "-.04em", margin: "8px 0 4px", ...gt }}>#{d.rank}</div>
            <div style={{ fontSize: 15, color: SUB, fontWeight: 300 }}>{d.lvl} · ELO {d.elo}</div>
            <div style={{ height: 8, background: "rgba(255,255,255,.14)", borderRadius: 8, overflow: "hidden", margin: "22px 0 9px" }}>
              <div data-bar={String(d.pct)} style={{ height: "100%", width: 0, background: GRAD, transition: "width 1.1s cubic-bezier(.2,.7,.2,1)" }} />
            </div>
            <div style={{ fontSize: 13, color: MUT }}>{d.nextLabel}</div>
            <Link href="/match" style={cta}>Jetzt spielen</Link>
          </div>

          {/* STATS */}
          <div className="rev" style={card}>
            <div style={{ ...ehead, marginBottom: 18 }}><img src="/icons/stats.svg" alt="" style={{ width: 18, height: 18 }} /><span style={eyebrow}>Deine Saison</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              <Stat value={d.ppBalance} label="PingPoints" grad />
              <Stat value={d.wins} label="Siege" divider />
              <Stat value={d.played} label="Spiele" divider />
            </div>
          </div>

          {/* OPEN GAME */}
          <div className="rev" style={card}>
            <div style={thead}><img src="/icons/open-game.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Open Game</span></div>
            <div style={csub}>Spiel wann du willst — tritt bei oder erstell dein eigenes.</div>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", maxHeight: 216, overflowY: "auto" }}>
              {d.games.length === 0 && (
                <div style={{ textAlign: "center", color: MUT, fontSize: 13, fontWeight: 500, padding: "18px 0" }}>Aktuell keine offenen Spiele — erstelle das erste.</div>
              )}
              {d.games.map((g, i) => (
                <Link key={g.id} href={g.href} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}`, textDecoration: "none", opacity: g.full ? .45 : 1 }}>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 46, flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: W }}>{g.day}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: MUT, marginTop: 3 }}>{g.time}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: W }}>{g.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: MUT, fontWeight: 500, marginTop: 2 }}>{g.sub}</span>
                  </span>
                  <span style={{ flexShrink: 0, textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: 16, fontWeight: 900, ...(g.full ? { color: W } : gt) }}>{g.ratio}</span>
                    <span style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUT }}>{g.full ? "voll" : "frei"}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/match" style={ghost}>Alle Open Games</Link>
          </div>

          {/* TRAINING */}
          <div className="rev" style={card}>
            <div style={thead}><img src="/icons/paddles.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Training</span></div>
            <div style={csub}>Coaching, Drills & Kurse — buch dich direkt in ein Training ein.</div>
            <Link href="/training" style={cta}>Trainings ansehen</Link>
          </div>

          {/* LIGA */}
          <div className="rev" style={card}>
            <div style={thead}><img src="/icons/liga.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Liga</span></div>
            <div style={csub}>Spiel in deiner Klasse, sammle Punkte, steig auf.</div>
            <div style={{ marginTop: 14 }}>
              {d.season.has ? (
                <>
                  <div style={fact}><span style={factK}>Klasse</span><span style={factV}>{d.season.label}</span></div>
                  <div style={fact}><span style={factK}>Stadt</span><span style={factV}>{d.season.city}</span></div>
                  <div style={fact}><span style={factK}>Dein Platz</span><span style={{ ...factV, ...gt }}>#{d.season.leagueRank}</span></div>
                </>
              ) : (
                <div style={fact}><span style={factK}>Status</span><span style={factV}>Noch nicht dabei</span></div>
              )}
            </div>
            <Link href="/liga" style={ghost}>Zur Liga</Link>
          </div>

          {/* TURNIER */}
          <div className="rev" style={card}>
            <div style={thead}><img src="/icons/turnier.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>{d.tour ? d.tour.name : "Turniere"}</span></div>
            <div style={csub}>{d.tour ? "Das nächste Turnier — melde dich an, solang Plätze frei sind." : "Bald geht das nächste Turnier los."}</div>
            {d.tour && (
              <div style={{ marginTop: 14 }}>
                <div style={fact}><span style={factK}>Wann</span><span style={factV}>{d.tour.dateLabel}</span></div>
                <div style={fact}><span style={factK}>Format</span><span style={factV}>{d.tour.formatLabel}</span></div>
              </div>
            )}
            <Link href="/turniere" style={cta}>{d.tour ? "Anmelden" : "Turniere ansehen"}</Link>
          </div>

        </div>
      </main>
      <BottomNav />
    </>
  )
}

function Stat({ value, label, grad, divider }: { value: number; label: string; grad?: boolean; divider?: boolean }) {
  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      {divider && <span style={{ position: "absolute", left: 0, top: "14%", height: "72%", width: 1, background: "rgba(255,255,255,.1)" }} />}
      <div data-count={String(value)} style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, ...(grad ? gt : { color: W }) }}>0</div>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: MUT, marginTop: 8 }}>{label}</div>
    </div>
  )
}
