import BottomNav from '@/app/components/BottomNav'
import {
  BG, CARD, CELL, W, SUB, MUT, GRAD, GREEN, CYAN,
  gt, card, cardPad, cardActive, cell, cellKey, cellVal, chip, chipBtn,
  btn, btnInCard, btnGhost, btnDanger, input, label,
  h1, h2, body, meta, eyebrow, levelBadge, statusPill,
} from '@/app/theme'

const sec: React.CSSProperties = { margin: '28px 0 10px', fontSize: 13, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: MUT }
const swatch = (c: string, name: string) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ width: '100%', height: 54, borderRadius: 12, background: c }} />
    <div style={{ fontSize: 11, color: SUB, marginTop: 6, fontWeight: 600 }}>{name}</div>
    <div style={{ fontSize: 10, color: MUT }}>{c}</div>
  </div>
)

export default function StyleguidePage() {
  return (
    <main style={{ minHeight: '100vh', background: BG, padding: '20px 16px 100px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 11, color: MUT, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase' }}>PPL Player</div>
        <h1 style={{ ...h1, marginTop: 6 }}>Styleguide</h1>
        <p style={{ ...body, marginTop: 8 }}>Verbindliche Bausteine. Alle Seiten nutzen diese Tokens aus <code style={{ color: SUB }}>app/theme.ts</code> — so sehen Kästchen überall gleich aus.</p>

        {/* Farben */}
        <div style={sec}>Farben</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {swatch(BG, 'BG')}{swatch(CARD, 'Karte')}{swatch(CELL, 'Zelle')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div style={{ textAlign: 'center' }}><div style={{ height: 54, borderRadius: 12, background: GRAD }} /><div style={{ fontSize: 11, color: SUB, marginTop: 6, fontWeight: 600 }}>Verlauf (nur Logo + Rang)</div></div>
          <div style={{ display: 'flex', gap: 10 }}>{swatch(GREEN, 'Grün')}{swatch(CYAN, 'Cyan')}</div>
        </div>

        {/* Event-Farben */}
        <div style={sec}>Event-Farben</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          {swatch('#FF00C8', 'Open Game')}{swatch('#7A3CFF', 'Turnier')}{swatch('#2BD4C4', 'Training')}{swatch('#FF00C8', 'Single Night')}
        </div>

        {/* Bilder */}
        <div style={sec}>Bilder</div>
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', height: 200 }}>
          <img src="/ppl-single-night.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(5,6,7,.15) 0%,rgba(5,6,7,.5) 50%,rgba(5,6,7,.96) 100%)' }} />
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            <div style={eyebrow}>Spielen &amp; kennenlernen</div>
            <div style={{ ...h2, fontSize: 24, marginTop: 6 }}>Single Night</div>
          </div>
        </div>
        <p style={{ ...meta, marginTop: 8 }}>Foto dunkel halten, Verlauf nach unten für Lesbarkeit, Radius 20. Eyebrow neon, Titel weiss.</p>

        {/* Typo */}
        <div style={sec}>Typografie</div>
        <div style={{ ...cardPad }}>
          <div style={{ fontSize: 40, fontWeight: 900, ...gt }}>#7</div>
          <div style={{ fontSize: 11, color: MUT }}>Rang-Zahl — der einzige Verlauf-Text</div>
          <h2 style={{ ...h2, marginTop: 14 }}>Überschrift</h2>
          <p style={{ ...body, marginTop: 6 }}>Fliesstext leicht (300) aber weiss. Überschriften extra fett (900), GROSS.</p>
          <div style={{ ...eyebrow, marginTop: 10 }}>Eyebrow / Datum</div>
          <div style={meta}>Meta-Zeile</div>
        </div>

        {/* Kästchen */}
        <div style={sec}>Kästchen (Standard)</div>
        <div style={{ ...cardPad, marginBottom: 10 }}>
          <div style={eyebrow}>So sieht jedes Kästchen aus</div>
          <h2 style={{ ...h2, fontSize: 22, marginTop: 4 }}>Karte</h2>
          <p style={{ ...body, marginTop: 6 }}>Fläche, randlos, Radius 18.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div style={cell}><div style={cellKey}>Wann</div><div style={cellVal}>Do · 19:00</div></div>
            <div style={cell}><div style={cellKey}>Wo</div><div style={cellVal}>Glattbrugg</div></div>
          </div>
        </div>
        <div style={{ ...cardActive, padding: 18 }}>
          <div style={eyebrow}>Aktiv / ausgewählt</div>
          <h2 style={{ ...h2, fontSize: 22, marginTop: 4 }}>Karte aktiv</h2>
          <p style={{ ...body, marginTop: 6 }}>Gleiches Kästchen, ausgewählt — grüner Rand + heller.</p>
        </div>

        {/* Chips */}
        <div style={sec}>Chips</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={chip}>Rookie</span><span style={chip}>1 Platz frei</span><span style={chip}>CHF 8</span>
          <span style={chipBtn(true)}>Aktiv</span><span style={chipBtn(false)}>Inaktiv</span>
        </div>

        {/* Badges */}
        <div style={sec}>Level- & Status-Badges</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={levelBadge('Rookie')}>Rookie</span>
          <span style={levelBadge('Challenger')}>Challenger</span>
          <span style={levelBadge('Advanced')}>Advanced</span>
          <span style={levelBadge('Elite')}>Elite</span>
          <span style={statusPill}>offen</span>
        </div>

        {/* Buttons */}
        <div style={sec}>Buttons</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={btn}>Primär (gefüllt Neon)</span>
          <div style={cardPad}><span style={btnInCard}>In Karte</span></div>
          <span style={btnGhost}>Sekundär</span>
          <span style={btnDanger}>Löschen</span>
        </div>

        {/* Formular */}
        <div style={sec}>Formular</div>
        <label style={label}>Feld-Label</label>
        <input style={input} placeholder="Eingabe…" readOnly />
      </div>
      <BottomNav />
    </main>
  )
}
