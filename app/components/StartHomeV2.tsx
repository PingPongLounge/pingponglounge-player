"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import BottomNav from "./BottomNav"
import StartMenu from "./StartMenu"
import PendingConfirmBanner from "./PendingConfirmBanner"
import StreakBanner from "./StreakBanner"
import { ratingLabel } from "@/app/theme"

const BG = "#12151A", CARD = "#2A2F39", CELL = "#353B46", HERO = "#1C212B", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.88)", MUT = "rgba(255,255,255,.82)"
const LINE = "rgba(255,255,255,.09)"
const GRAD = "linear-gradient(135deg,#57CF79,#38BEB2)"
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
const OUTLINE = `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`
const cta: React.CSSProperties = { display: "block", textAlign: "center", marginTop: 18, background: OUTLINE, border: "1.5px solid transparent", color: "#FFF9F3", borderRadius: 13, padding: 12, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", textDecoration: "none" }
const ghost: React.CSSProperties = { display: "block", textAlign: "center", marginTop: 14, borderRadius: 13, padding: 11, fontSize: 13.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#FFF9F3", textDecoration: "none", background: OUTLINE, border: "1.5px solid transparent" }
const fact: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: `1px solid ${LINE}` }
const factK: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: MUT }
const factV: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: W }

export default function StartHomeV2(d: StartData) {
  const root = useRef<HTMLDivElement>(null)

  // Einmaliges Popup nach 10 gespielten Matches: Hinweis aufs Endjahresturnier.
  const [endjahr, setEndjahr] = useState(false)
  useEffect(() => {
    try { if (d.played >= 10 && !localStorage.getItem("endjahr_popup_v1")) setEndjahr(true) } catch { /* ignore */ }
  }, [])
  function closeEndjahr() { setEndjahr(false); try { localStorage.setItem("endjahr_popup_v1", "1") } catch { /* ignore */ } }

  // Einmaliges Popup nach 15 App-Öffnungen: erklärt PingPoints (was & wo einlösen).
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
              {/* Neon-Grafik statt Foto: Pingpong-Tisch in Perspektive + Ball-Bogen (Vektor, on-brand). */}
              <svg viewBox="0 0 390 132" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} aria-hidden>
                <defs>
                  <linearGradient id="htg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#57CF79" /><stop offset="1" stopColor="#38BEB2" /></linearGradient>
                  <filter id="hglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  <radialGradient id="hrg" cx="50%" cy="118%" r="75%"><stop offset="0" stopColor="rgba(87,207,121,.22)" /><stop offset="65%" stopColor="rgba(87,207,121,0)" /></radialGradient>
                </defs>
                <rect width="390" height="132" fill="#0C0E12" />
                <rect width="390" height="132" fill="url(#hrg)" />
                <g filter="url(#hglow)" stroke="url(#htg)" fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
                  <polygon points="130,44 258,44 346,116 44,116" />
                  <line x1="195" y1="44" x2="195" y2="116" />
                  <path d="M92,82 L88,70 L302,70 L298,82" />
                </g>
                <g stroke="url(#htg)" strokeWidth="0.8" opacity="0.4">
                  <line x1="130" y1="71" x2="131" y2="80" /><line x1="163" y1="71" x2="163" y2="80" /><line x1="195" y1="71" x2="195" y2="80" /><line x1="227" y1="71" x2="228" y2="80" /><line x1="262" y1="71" x2="263" y2="80" />
                </g>
                <path d="M58,106 Q195,14 322,60" stroke="url(#htg)" strokeWidth="1.6" fill="none" strokeDasharray="2 6" opacity="0.6" filter="url(#hglow)" />
                <circle cx="322" cy="60" r="5" fill="url(#htg)" filter="url(#hglow)" />
              </svg>
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
              <span style={{ fontSize: 15, fontWeight: 800, color: "#57CF79" }}>→</span>
            </Link>
          </div>

          {/* Quick-Actions: Kreise mit Verlauf-Umrandung. Tisch-Buchung ist KEIN
              eigener Knopf — sie läuft in den jeweiligen Flows (Open Game/Turnier)
              unterschwellig über Planyo. */}
          <div className="rev" style={{ display: "flex", justifyContent: "space-between", gap: 8, margin: "0 16px 18px" }}>
            {[
              { href: "/liga", icon: "liga", a: "Liga", b: "fordern" },
              { href: "/match", icon: "open-game", a: "Game", b: "suchen" },
              { href: "/turniere", icon: "turnier", a: "Event", b: "machen" },
              { href: "/training", icon: "paddles", a: "Lernen", b: "" },
            ].map(q => (
              <Link key={q.href} href={q.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <span style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box`, border: "1.5px solid transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={`/icons/${q.icon}.svg`} alt="" style={{ width: 25, height: 25 }} />
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: SUB, textAlign: "center", lineHeight: 1.2 }}>{q.a}{q.b && <><br />{q.b}</>}</span>
              </Link>
            ))}
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
            <div style={thead}><img src="/icons/open-game.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Open Games</span></div>
            <div style={csub}>Freundschaftliche Matches finden.</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", maxHeight: 216, overflowY: "auto" }}>
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
            <div style={thead}><img src="/icons/liga.svg" alt="" style={{ width: 26, height: 26 }} /><span style={ctitle}>Player League</span></div>
            <div style={csub}>Fordere heraus, steig auf.</div>
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
            <div style={csub}>Melde dich an oder erstelle selber eines.</div>
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
            <div style={csub}>Coaching, Drills und Camps.</div>
            <Link href="/training" style={cta}>Ansehen</Link>
          </div>

          {/* SHOP — eine ruhige Zeile am Ende, kein Warenkorb im Kopf. Der Grund
              zum Klicken steht dabei: hier werden die Punkte zu etwas. */}
          <Link href="/shop" className="rev" style={{ display: "flex", alignItems: "center", gap: 13, background: CARD, borderRadius: 22, padding: "15px 18px", boxShadow: SHADOW, margin: "0 16px 18px", textDecoration: "none" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: CELL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#57CF79" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: W }}>Shop</span>
              <span style={{ display: "block", fontSize: 11.5, color: MUT, marginTop: 2 }}>Schläger, Bälle, PPL-Merch — PingPoints einlösen</span>
            </span>
            <span style={{ color: MUT, fontSize: 15 }}>›</span>
          </Link>

        </div>
      </main>

      {/* Popup nach 10 Spielen: Endjahresturnier-Quali (einmalig) */}
      {endjahr && (
        <div onClick={closeEndjahr} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: CARD, borderRadius: 22, padding: "22px 20px", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6, ...gt }}>Gut gespielt!</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1, marginBottom: 10 }}>10 Spiele geschafft</div>
            <p style={{ fontSize: 14, color: SUB, fontWeight: 300, lineHeight: 1.5, marginBottom: 16 }}>Wusstest du: Die <b style={{ color: W, fontWeight: 700 }}>besten 10 Spieler pro League</b> registrieren sich automatisch fürs <b style={{ color: W, fontWeight: 700 }}>Endjahresturnier</b>. Bleib dran!</p>
            <button onClick={closeEndjahr} style={{ ...cta, marginTop: 0, cursor: "pointer", fontFamily: "inherit" }}>Los geht&apos;s</button>
          </div>
        </div>
      )}

      {/* Popup nach 15 App-Öffnungen: PingPoints erklären (einmalig) */}
      {ppInfo && !endjahr && (
        <div onClick={closePpInfo} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: CARD, borderRadius: 22, padding: "22px 20px", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6, ...gt }}>PingPoints</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: W, textTransform: "uppercase", lineHeight: 1, marginBottom: 10 }}>Deine Punkte sammeln sich</div>
            <p style={{ fontSize: 14, color: SUB, fontWeight: 300, lineHeight: 1.5, marginBottom: 16 }}>Du sammelst <b style={{ color: W, fontWeight: 700 }}>PingPoints</b> beim Spielen — z. B. 5 Punkte für je 10 Liga-Spiele. Einlösbar für <b style={{ color: W, fontWeight: 700 }}>Tischbuchungen &amp; Prämien</b> (1 Punkt = CHF 1).</p>
            <a href="/pingpoints" onClick={closePpInfo} style={{ ...cta, marginTop: 0, cursor: "pointer" }}>PingPoints ansehen</a>
          </div>
        </div>
      )}

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
