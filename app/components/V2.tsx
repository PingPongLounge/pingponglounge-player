/* PLAYER V2 — gemeinsame Bausteine (07.09.2026, verbindlich).
   Kein zweites Designsystem: Farben und Schriften kommen aus app/theme.ts.

   Die Logik dahinter:
     SCHWARZ   Atmosphaere, Hero, Navigation, Community, Bilder, Aktionen
     OFF-WHITE Lesen und Verstehen: Rankings, Zahlen, Erklaerungen
     VIOLETT   Interaktion, aktive Elemente, Highlights

   Ohne "use client" — laeuft in Server- wie Client-Seiten. */
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER } from "@/app/theme"

/* ---------- Schraege Kante ------------------------------------------------
   Der Uebergang zwischen Schwarz und Off-White ist nie eine gerade Linie,
   sondern faellt ueber die volle Breite um HOEHE Pixel. Kein Torn Paper,
   keine Zacken — eine Kante, immer dieselbe Richtung (links hoeher).
   Umgesetzt als Block mit clip-path statt als Bild: skaliert auf jede
   Breite, kostet nichts und bleibt bei jeder Bildschirmgroesse sauber. */
const HOEHE = 20

export function KanteZuHell({ hoehe = HOEHE }: { hoehe?: number }) {
  // Schwarz oben → Off-White unten.
  return (
    <div aria-hidden style={{
      height: hoehe, background: CREME, marginTop: -1,
      clipPath: `polygon(0 0, 100% ${hoehe}px, 100% 100%, 0 100%)`,
    }} />
  )
}

export function KanteZuDunkel({ hoehe = HOEHE }: { hoehe?: number }) {
  // Off-White oben → Schwarz unten. Gleiche Richtung wie oben, damit die
  // Flaeche wie ein leicht gekipptes Blatt wirkt und nicht wie ein Zickzack.
  return (
    <div aria-hidden style={{
      height: hoehe, background: SCHWARZ, marginTop: -1,
      clipPath: `polygon(0 0, 100% ${hoehe}px, 100% 100%, 0 100%)`,
    }} />
  )
}

/** Off-White-Informationsflaeche mit schraegen Kanten oben und unten. */
export function HellFlaeche({ children, kanteOben = true, kanteUnten = true, padding = "30px 22px 34px" }:
  { children: React.ReactNode; kanteOben?: boolean; kanteUnten?: boolean; padding?: string }) {
  return (
    <>
      {kanteOben && <KanteZuHell />}
      <section style={{ background: CREME, color: SCHWARZ }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding }}>{children}</div>
      </section>
      {kanteUnten && <KanteZuDunkel />}
    </>
  )
}

/* ---------- Neon ----------------------------------------------------------
   Ein kleiner Schriftzug, wie er in der Lounge an der Wand haengt: Anton,
   leicht gekippt, mit Glow. Bewusst sparsam — hoechstens eines pro grossem
   schwarzem Bereich, und nie auf einer hellen Leseflaeche. */
export function Neon({ text, groesse = 15, kippen = -3 }:
  { text: string; groesse?: number; kippen?: number }) {
  return (
    <span aria-hidden style={{
      display: "inline-block",
      fontFamily: ANTON, fontSize: groesse, letterSpacing: ".14em",
      textTransform: "uppercase", color: "#EBDCFF",
      transform: `rotate(${kippen}deg)`,
      textShadow: `0 0 4px #FFF, 0 0 11px ${VIOLETT}, 0 0 26px ${VIOLETT}, 0 0 48px rgba(140,61,255,.55)`,
    }}>{text}</span>
  )
}

/* ---------- Etikett ueber einer Ueberschrift ------------------------------ */
export function Etikett({ text, hell = false }: { text: string; hell?: boolean }) {
  return (
    <div style={{
      fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: ".16em",
      textTransform: "uppercase", color: hell ? "rgba(8,8,8,.55)" : VIOLETT,
    }}>{text}</div>
  )
}

/* ---------- Display-Ueberschrift ------------------------------------------ */
export function Titel({ children, hell = false, gross = false }:
  { children: React.ReactNode; hell?: boolean; gross?: boolean }) {
  return (
    <h2 style={{
      fontFamily: ANTON, fontWeight: 400,
      fontSize: gross ? "clamp(44px,12vw,72px)" : "clamp(30px,8vw,42px)",
      lineHeight: .94, textTransform: "uppercase", letterSpacing: ".005em",
      margin: "8px 0 0", color: hell ? SCHWARZ : CREME,
    }}>{children}</h2>
  )
}

/* ---------- Knoepfe ------------------------------------------------------- */
const knopfBasis: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  borderRadius: 100, padding: "15px 24px", fontFamily: INTER, fontSize: 14,
  fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase",
  textDecoration: "none", cursor: "pointer", border: "none", whiteSpace: "nowrap",
}
export const knopfPrimaer: React.CSSProperties = { ...knopfBasis, background: VIOLETT, color: CREME }
export const knopfOutline: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: CREME,
  border: "1.5px solid rgba(244,241,235,.34)", padding: "13.5px 24px",
}
/** Auf heller Flaeche: dunkler Rahmen statt hellem. */
export const knopfOutlineHell: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: SCHWARZ,
  border: "1.5px solid rgba(8,8,8,.28)", padding: "13.5px 24px",
}
