import Link from 'next/link'

export const metadata = {
  title: 'Player — Dein Tischtennis-Hub',
  description: 'Finde Mitspieler, spiel in der Liga und verfolge dein ELO-Ranking. by Ping Pong Lounge.',
}

const G = '#39FF14'
const DARK = '#0A0A0C'
const SURFACE = '#111214'
const BORDER = '#26282E'
const MUTED = '#6B6E7A'
const TEXT = '#E8E6E1'

function Logo({ width = '220px' }: { width?: string }) {
  return (
    <svg viewBox="0 0 360 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width, height: 'auto' }}>
      <path d="M 6 68 L 6 12 L 30 12 C 44 12 52 20 52 34 C 52 48 44 56 30 56 L 22 56 L 22 68 Z" fill={G}/>
      <circle cx="62" cy="64" r="7" fill={G}/>
      <text x="76" y="66" fontFamily="'League Spartan', system-ui, sans-serif" fontSize="58" fontWeight="900" letterSpacing="2" fill="none" stroke={G} strokeWidth="2.2" paintOrder="stroke">PLAYER</text>
    </svg>
  )
}

const FEATURES = [
  {
    title: 'Find a Match',
    sub: 'Offene Spiele in deiner Nähe finden — nach Level gefiltert, sofort beitreten.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
      </svg>
    ),
  },
  {
    title: 'Liga & Saisons',
    sub: 'Stadtweise Ligen, Live-Tabelle, Auf- und Abstieg — saisonbasiert in Zürich, Basel, Luzern und mehr.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    ),
  },
  {
    title: 'Turniere',
    sub: 'Anmelden, live mitspielen, Bracket per QR-Code — Ergebnis direkt am Tisch eingeben.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M9.5 20h5"/><path d="M12 14v4"/>
      </svg>
    ),
  },
  {
    title: 'ELO-Ranking',
    sub: 'Dein persönliches Rating wächst mit jedem Match. Locker → Hobby → Fortgeschritten → Competitive.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
      </svg>
    ),
  },
]

const STEPS = [
  { n: '1', title: 'Konto erstellen', sub: 'Mit Google oder Email — kein Passwort nötig. Dauert 60 Sekunden.' },
  { n: '2', title: 'Level bestimmen', sub: '7 kurze Fragen — wir finden deinen Level automatisch und vergeben ein Start-ELO.' },
  { n: '3', title: 'Spielen & aufsteigen', sub: 'Spiele finden, Liga beitreten, ELO sammeln. Alles direkt im Browser.' },
]

export default function LandingPage() {
  const wrap: React.CSSProperties = { maxWidth: '480px', margin: '0 auto', padding: '0 20px' }
  const divider: React.CSSProperties = { borderTop: `0.5px solid ${BORDER}` }

  return (
    <main style={{ background: DARK, minHeight: '100vh', color: TEXT }}>

      {/* ── HERO ── */}
      <section style={{ ...wrap, paddingTop: '64px', paddingBottom: '48px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '20px' }}>
          by Ping Pong Lounge
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <Logo width="230px" />
        </div>
        <p style={{ fontSize: '15px', color: MUTED, lineHeight: 1.6, marginBottom: '36px', maxWidth: '320px', margin: '0 auto 36px' }}>
          Finde Mitspieler · Spiel in der Liga<br />Verfolge dein ELO-Ranking
        </p>
        <Link href="/login" style={{ display: 'block', background: G, color: DARK, borderRadius: '10px', padding: '15px', fontSize: '14px', fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', marginBottom: '10px' }}>
          Kostenlos starten →
        </Link>
        <Link href="/login" style={{ display: 'block', background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: '10px', padding: '12px', fontSize: '12px', textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Bereits registriert? Einloggen
        </Link>
      </section>

      {/* ── STATS ── */}
      <div style={{ ...divider, background: SURFACE }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[
            { n: '6', l: 'Standorte' },
            { n: '4', l: 'Levels' },
            { n: 'CH', l: 'Schweiz' },
          ].map(s => (
            <div key={s.l} style={{ padding: '20px 8px', textAlign: 'center', borderRight: `0.5px solid ${BORDER}` }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: G, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px', letterSpacing: '0.04em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ ...wrap, paddingTop: '40px', paddingBottom: '40px', ...divider }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: G, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '24px' }}>Was du bekommst</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: SURFACE, border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{f.title}</p>
                <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ ...wrap, paddingTop: '40px', paddingBottom: '40px', ...divider }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: G, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '24px' }}>So einfach geht's</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: G, color: DARK, fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.n}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: TEXT, marginBottom: '3px' }}>{s.title}</p>
                <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section style={{ ...wrap, paddingTop: '48px', paddingBottom: '64px', textAlign: 'center', ...divider }}>
        <p style={{ fontSize: '22px', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Bereit zu spielen?</p>
        <p style={{ fontSize: '13px', color: MUTED, marginBottom: '28px' }}>Kostenlos · Kein Download · Direkt im Browser</p>
        <Link href="/login" style={{ display: 'inline-block', background: G, color: DARK, borderRadius: '10px', padding: '15px 40px', fontSize: '14px', fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Jetzt starten →
        </Link>
        <p style={{ fontSize: '11px', color: MUTED, marginTop: '20px' }}>
          <a href="https://pingponglounge.ch" target="_blank" rel="noopener" style={{ color: G, textDecoration: 'none', fontWeight: 700 }}>↗ pingponglounge.ch</a>
        </p>
      </section>

    </main>
  )
}
