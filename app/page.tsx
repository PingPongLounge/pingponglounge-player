import Link from "next/link"
import PlayerLogo from "./components/PlayerLogo"

const DARK   = "#1A1B1F"
const SURFACE= "#111214"
const BORDER = "#26282E"
const TEXT   = "#E8E6E1"
const MUTED  = "#7B7E8A"
const G      = "#39FF14"

const FEATURES = [
  { title: "Find a Match", sub: "Finde spontan Mitspieler in deiner Nähe und deinem Level.", path: <><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></> },
  { title: "Liga", sub: "Stadtweise Saisons — Zürich, Basel, Luzern, St.Gallen. Round Robin, Live-Tabelle, ELO.", path: <><path d="M3 3h18v4H3z"/><path d="M3 10h18v4H3z"/><path d="M3 17h18v4H3z"/></> },
  { title: "Turniere", sub: "Community Turniere mit Gruppenphase, QR-Bracket und Echtzeit-Resultaten.", path: <><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M9.5 20h5"/><path d="M12 14v4"/></> },
  { title: "ELO-Ranking", sub: "Dein persönliches Rating steigt mit jedem Sieg — transparent und fair.", path: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></> },
]

export default function LandingPage() {
  const s = {
    section: { maxWidth: "480px", margin: "0 auto", padding: "0 20px" } as React.CSSProperties,
    divider: { borderTop: "0.5px solid " + BORDER } as React.CSSProperties,
    eyebrow: { fontSize: "10px", fontWeight: 700, color: G, letterSpacing: "0.18em", textTransform: "uppercase" as const, marginBottom: "20px" },
  }

  return (
    <main style={{ background: DARK, minHeight: "100vh", color: TEXT }}>

      {/* HERO */}
      <section style={{ ...s.section, paddingTop: "64px", paddingBottom: "48px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <PlayerLogo showTagline />
        </div>
        <p style={{ fontSize: "16px", color: MUTED, lineHeight: 1.7, maxWidth: "300px", margin: "0 auto 36px" }}>
          Finde Mitspieler · Spiel in der Liga<br/>Verfolge dein ELO-Ranking
        </p>
        <Link href="/login" style={{ display: "block", background: G, color: DARK, borderRadius: "10px", padding: "15px", fontSize: "14px", fontWeight: 700, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", marginBottom: "10px" }}>
          Kostenlos starten →
        </Link>
        <Link href="/login" style={{ display: "block", background: "none", border: "1px solid " + BORDER, color: MUTED, borderRadius: "10px", padding: "12px", fontSize: "12px", textAlign: "center", letterSpacing: "0.04em", textTransform: "uppercase", textDecoration: "none" }}>
          Bereits registriert? Einloggen
        </Link>
      </section>

      {/* STATS */}
      <div style={{ ...s.divider, background: SURFACE }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {[{ n: "6", l: "Standorte" }, { n: "4", l: "Levels" }, { n: "CH", l: "Schweiz" }].map((st, i) => (
            <div key={st.l} style={{ padding: "20px 8px", textAlign: "center", borderRight: i < 2 ? "0.5px solid " + BORDER : "none" }}>
              <div style={{ fontSize: "24px", fontWeight: 900, color: G, lineHeight: 1 }}>{st.n}</div>
              <div style={{ fontSize: "11px", color: MUTED, marginTop: "4px" }}>{st.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section style={{ ...s.section, paddingTop: "40px", paddingBottom: "40px", ...s.divider }}>
        <p style={s.eyebrow}>Was du bekommst</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: SURFACE, border: "0.5px solid " + BORDER, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {f.path}
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{f.title}</p>
                <p style={{ fontSize: "14px", color: MUTED, lineHeight: 1.6 }}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ ...s.section, paddingTop: "40px", paddingBottom: "40px", ...s.divider }}>
        <p style={s.eyebrow}>So einfach geht's</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {[
            { n: "1", title: "Konto erstellen", sub: "Mit Google oder Email — kein Passwort nötig. Dauert 60 Sekunden." },
            { n: "2", title: "Level bestimmen", sub: "7 kurze Fragen — wir finden deinen Level automatisch und vergeben ein Start-ELO." },
            { n: "3", title: "Spielen & aufsteigen", sub: "Spiele finden, Liga beitreten, ELO sammeln. Alles direkt im Browser." },
          ].map(step => (
            <div key={step.n} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: G, color: DARK, fontSize: "13px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.n}</div>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: TEXT, marginBottom: "3px" }}>{step.title}</p>
                <p style={{ fontSize: "14px", color: MUTED, lineHeight: 1.6 }}>{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REFERRAL */}
      <section style={{ ...s.section, paddingTop: "32px", paddingBottom: "32px", ...s.divider }}>
        <div style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: "14px", padding: "24px", display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(57,255,20,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: TEXT, marginBottom: "4px" }}>2 Gratisstunden bei Anmeldung</p>
            <p style={{ fontSize: "14px", color: MUTED, lineHeight: 1.6 }}>Und nochmals 2 Stunden für jeden Freund den du einlädst.</p>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={{ ...s.section, paddingTop: "48px", paddingBottom: "64px", textAlign: "center", ...s.divider }}>
        <p style={{ fontSize: "22px", fontWeight: 900, color: TEXT, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Bereit zu spielen?</p>
        <p style={{ fontSize: "15px", color: MUTED, marginBottom: "28px" }}>Kostenlos · Kein Download · Direkt im Browser</p>
        <Link href="/login" style={{ display: "inline-block", background: G, color: DARK, borderRadius: "10px", padding: "15px 40px", fontSize: "14px", fontWeight: 700, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none" }}>
          Jetzt starten →
        </Link>
        <p style={{ fontSize: "11px", color: MUTED, marginTop: "20px" }}>
          <a href="https://pingponglounge.ch" target="_blank" rel="noopener" style={{ color: G, textDecoration: "none", fontWeight: 700 }}>↗ pingponglounge.ch</a>
        </p>
      </section>

    </main>
  )
}
