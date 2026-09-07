/* Editorial-Stats-Band (07.09.2026, Oliver): der eine bewusste helle Kontrast
   im Screen. Kein Karten-Raster mit vier Kaesten, sondern ein durchgehendes
   Off-White-Band; getrennt wird nur durch feine Linien.
   Ohne "use client" — laeuft in Server- wie Client-Seiten. */

const SCHWARZ = "#080808", CREME = "#F4F1EB", VIOLETT = "#8C3DFF"
const ANTON = "var(--font-anton), Impact, sans-serif"
const INTER = "var(--font-inter), system-ui, sans-serif"

export type Wert = { wert: string | number; label: string; akzent?: boolean }

export default function StatsBand({ werte }: { werte: Wert[] }) {
  return (
    <section style={{ background: CREME, color: SCHWARZ }}>
      <div style={{
        maxWidth: 620, margin: "0 auto", padding: "30px 22px 32px",
        display: "grid", gridTemplateColumns: `repeat(${werte.length}, 1fr)`, gap: 0,
      }}>
        {werte.map((w, i) => (
          <div key={w.label} style={{
            paddingLeft: i === 0 ? 0 : 14,
            borderLeft: i === 0 ? "none" : "1px solid rgba(8,8,8,.14)",
            minWidth: 0,
          }}>
            <strong style={{
              display: "block", fontFamily: ANTON, fontWeight: 400,
              fontSize: "clamp(30px,8.5vw,46px)", lineHeight: .95,
              color: w.akzent ? VIOLETT : SCHWARZ,
              fontVariantNumeric: "tabular-nums",
            }}>{w.wert}</strong>
            <small style={{
              display: "block", fontFamily: INTER, fontSize: 12, fontWeight: 800,
              letterSpacing: ".13em", textTransform: "uppercase",
              color: "rgba(8,8,8,.55)", marginTop: 8,
            }}>{w.label}</small>
          </div>
        ))}
      </div>
    </section>
  )
}
