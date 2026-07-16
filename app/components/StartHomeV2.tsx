"use client"
import { useEffect, useRef } from "react"
import Link from "next/link"
import BottomNav from "./BottomNav"
import StartMenu from "./StartMenu"
import PendingConfirmBanner from "./PendingConfirmBanner"
import StreakBanner from "./StreakBanner"
import { ratingLabel } from "@/app/theme"

const BG = "#20242C", CARD = "#2A2F39", CELL = "#353B46", HERO = "#14171E", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.88)", MUT = "rgba(255,255,255,.82)"
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

          {/* Kein zweiter Kopf mehr: Avatar, Menü und Beta stehen jetzt oben im
              Header. "Hi, …" kostete eine Zeile und sagte nichts — der Name steht
              im Avatar, der Rang eine Zeile weiter unten. */}

          {/* Offene Bestätigungen zuoberst — bevor irgendwas anderes kommt. */}
          <div style={{ margin: "0 16px" }}><PendingConfirmBanner /></div>

          {/* RANG — derselbe Block wie in der Liga: Bild oben, darunter die Zeilen,
              getrennt durch Linien. Vorher eine schwarze Box ohne ein einziges Bild. */}
          <div className="rev" style={{ margin: "0 16px 18px", borderRadius: 24, overflow: "hidden", boxShadow: SHADOW, background: HERO }}>
            <div style={{ position: "relative", height: 132 }}>
              <img src="/spotlight.jpg" alt="" style={{ width: "100%", height: 132, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(20,23,30,.1) 0%,rgba(20,23,30,.55) 55%,rgba(20,23,30,.92) 100%)" }} />
              <div style={{ position: "absolute", left: 20, right: 20, bottom: 13 }}>
                <div style={{ fontSize: 34, fontWeight: 900, lineHeight: .9, textTransform: "uppercase", letterSpacing: "-.02em", color: W }}>Dein Rang</div>
                <div style={{ fontSize: 12, color: SUB, fontWeight: 400, marginTop: 5 }}>{d.season.has ? `${d.season.label} · ${d.season.city}` : "Noch keine Liga"}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 44, fontWeight: 900, lineHeight: .85, letterSpacing: "-.03em", ...gt }}>#{d.rank}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: MUT }}>Deine Position</div>
                <div style={{ fontSize: 15, color: SUB, fontWeight: 500, marginTop: 3 }}>Rating {ratingLabel(d.elo)}</div>
              </div>
            </div>

            <div style={{ padding: "13px 20px 16px", borderTop: `1px solid ${LINE}` }}>
              <div style={{ height: 4, background: "rgba(255,255,255,.14)", borderRadius: 8, overflow: "hidden" }}>
                <div data-bar={String(d.pct)} style={{ height: "100%", width: 0, background: GRAD, transition: "width 1.1s cubic-bezier(.2,.7,.2,1)" }} />
              </div>
              <div style={{ fontSize: 11.5, color: MUT, marginTop: 7 }}>{d.nextLabel}</div>
            </div>

            <Link href="/match" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderTop: `1px solid ${LINE}`, textDecoration: "none" }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".02em", ...gt }}>Jetzt spielen</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#39FF14" }}>→</span>
            </Link>
          </div>

          {/* Ansporn: Siegesserie feiern / nach Niederlage aufs Training zeigen */}
          <div style={{ margin: "0 16px 18px" }}><StreakBanner /></div>

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

          {/* LIGA */}
          <div className="rev" style={card}>
            <div style={thead}><img src="/icons/liga.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Liga</span></div>
            <div style={{ marginTop: 16 }}>
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
            {!d.tour && <div style={csub}>Bald geht das nächste los.</div>}
            {d.tour && (
              <div style={{ marginTop: 16 }}>
                <div style={fact}><span style={factK}>Wann</span><span style={factV}>{d.tour.dateLabel}</span></div>
                <div style={fact}><span style={factK}>Format</span><span style={factV}>{d.tour.formatLabel}</span></div>
              </div>
            )}
            <Link href="/turniere" style={cta}>{d.tour ? "Anmelden" : "Turniere ansehen"}</Link>
          </div>

          {/* TRAINING */}
          <div className="rev" style={card}>
            <div style={thead}><img src="/icons/paddles.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Training</span></div>
            <div style={csub}>Coaching & Drills · jeden Donnerstag.</div>
            <Link href="/training" style={cta}>Ansehen</Link>
          </div>

          {/* SHOP — eine ruhige Zeile am Ende, kein Warenkorb im Kopf. Der Grund
              zum Klicken steht dabei: hier werden die Punkte zu etwas. */}
          <Link href="/shop" className="rev" style={{ display: "flex", alignItems: "center", gap: 13, background: CARD, borderRadius: 22, padding: "15px 18px", boxShadow: SHADOW, margin: "0 16px 18px", textDecoration: "none" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: CELL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: W }}>Shop</span>
              <span style={{ display: "block", fontSize: 11.5, color: MUT, marginTop: 2 }}>Schläger, Bälle, PPL-Merch — PingPoints einlösen</span>
            </span>
            <span style={{ color: MUT, fontSize: 15 }}>›</span>
          </Link>

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
