/* PLAYER V2 — das gemeinsame Bausystem (07.09.2026, verbindlich).
   Grundlage ist das Referenz-Mockup mit den fuenf Screens HOME / SPIELEN /
   LIGA / EVENTS / PROFIL. Kein zweites Designsystem: Farben und Schriften
   kommen aus app/theme.ts.

   Jede Hauptseite besteht aus genau zwei Bereichen:

     HERO      dunkel, echtes PPL-Foto, 45-55% der ersten Bildschirmhoehe.
               Darauf ein kleines violettes Etikett, darunter die sehr grosse
               weisse Anton-Zeile — das groesste Element der Seite — und ein
               bis zwei Zeilen Erklaerung. Keine Karten, keine Schreibschrift.

     INHALT    Off-White #F4F1EB. Hier geht es nicht um Stimmung, sondern um
               Orientierung, Daten, Entscheidungen. Editorial: Typografie,
               Linien, Abstaende, kleine Symbole, Avatare, klare Listen.

   Die beiden treffen mit einer GERADEN Kante aufeinander. Die schraegen
   Uebergaenge von vorher sind bewusst weg (Vorgabe Oliver 07.09.).

   Violett ist nur: Haupt-Aktion, aktive Navigation, aktiver Zustand,
   kleine Hervorhebung, Link und Pfeil.

   Ohne "use client" — laeuft in Server- wie Client-Seiten. */
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER } from "@/app/theme"

/* Die Off-White-Flaeche und das, was darauf liegt. */
export const FLAECHE = CREME          // #F4F1EB — der Inhaltsgrund
export const PANEL = "#FFFFFF"        // gruppierte Listen sitzen auf Weiss
export const LINIE = "rgba(8,8,8,.10)"
export const TEXT_LEISE = "rgba(8,8,8,.56)"

/* ---------- Hero ----------------------------------------------------------
   Foto, Verlauf, Etikett, Zeile, Erklaerung. Der Verlauf ist der einzige
   Grund, warum die weisse Schrift auf jedem Foto sicher lesbar bleibt:
   unten laeuft er in nahezu deckendes Schwarz aus, dort steht der Text. */
export function Hero({
  bild, pos = "50% 45%", etikett, titel, subline, kopf, alt = "",
}: {
  bild: string; pos?: string
  etikett: string; titel: React.ReactNode; subline?: React.ReactNode
  kopf?: React.ReactNode; alt?: string
}) {
  return (
    <header className="ppl-hero" style={{
      position: "relative", background: SCHWARZ, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bild} alt={alt} aria-hidden={alt ? undefined : true} className="ppl-hero-bild"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: pos }} />
      <div aria-hidden style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(8,8,8,.55) 0%, rgba(8,8,8,.18) 26%, rgba(8,8,8,.46) 55%, rgba(8,8,8,.86) 80%, rgba(8,8,8,.96) 100%)",
      }} />

      {kopf && <div style={{ position: "relative", zIndex: 2 }}>{kopf}</div>}

      <div className="ppl-breit" style={{
        position: "relative", zIndex: 2, marginTop: "auto",
        paddingTop: 24, paddingBottom: 26,
      }}>
        <div style={{
          fontFamily: INTER, fontSize: 12.5, fontWeight: 900, letterSpacing: ".18em",
          textTransform: "uppercase", color: VIOLETT, marginBottom: 8,
        }}>{etikett}</div>

        <h1 className="ppl-hero-titel" style={{
          fontFamily: ANTON, fontWeight: 400, textTransform: "uppercase",
          /* 08.09.2026: lineHeight stand auf .87. Anton ist so eng gebaut,
             dass sich die Zeilen bei mehrzeiligen Titeln beruehrt haben —
             "PLAY. MEET. REPEAT." klebte aufeinander. .96 laesst Luft,
             ohne dass der Block auseinanderfaellt. */
          letterSpacing: ".002em", lineHeight: .96, color: "#FFFFFF", margin: 0,
        }}>{titel}</h1>

        {subline && (
          <p style={{
            fontFamily: INTER, fontSize: 15.5, lineHeight: 1.45, margin: "14px 0 0",
            color: "rgba(255,255,255,.86)", maxWidth: "40ch",
          }}>{subline}</p>
        )}
      </div>
    </header>
  )
}

/* ---------- Inhaltsflaeche ------------------------------------------------
   Gerade Kante nach dem Hero, Off-White bis zum Seitenende. */
export function Inhalt({ children, oben = 26, unten = 34 }:
  { children: React.ReactNode; oben?: number; unten?: number }) {
  return (
    <section style={{ background: FLAECHE, color: SCHWARZ }}>
      <div className="ppl-breit" style={{ paddingTop: oben, paddingBottom: unten }}>
        {children}
      </div>
    </section>
  )
}

/* ---------- Abschnittskopf ------------------------------------------------
   Kleine dunkle Ueberschrift links, rechts optional "Alle ›" in Violett. */
export function AbschnittKopf({ titel, mehr, href, dunkel = false }:
  { titel: string; mehr?: string; href?: string; dunkel?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      gap: 14, marginBottom: 12,
    }}>
      <h2 style={{
        fontFamily: INTER, fontSize: 12.5, fontWeight: 900, letterSpacing: ".14em",
        textTransform: "uppercase", margin: 0, color: dunkel ? CREME : SCHWARZ,
      }}>{titel}</h2>
      {mehr && href && (
        <a href={href} style={{
          fontFamily: INTER, fontSize: 13, fontWeight: 700, color: VIOLETT,
          textDecoration: "none", whiteSpace: "nowrap",
        }}>{mehr} ›</a>
      )}
    </div>
  )
}

/* ---------- Weisses Feld --------------------------------------------------
   Gruppierte Listen sitzen auf Weiss, damit die Off-White-Flaeche Struktur
   bekommt, ohne dass jede Zeile eine eigene Karte wird. */
export function Feld({ children, padding = 0 }: { children: React.ReactNode; padding?: number | string }) {
  return (
    <div style={{ background: PANEL, borderRadius: 16, overflow: "hidden", padding }}>
      {children}
    </div>
  )
}

/* ---------- Zahlenreihe ---------------------------------------------------
   Drei bis vier Zahlen nebeneinander, getrennt durch feine Linien. */
export type StatWert = { wert: string | number; label: string; akzent?: boolean }

export function StatsReihe({ werte, hell = true, padding = "16px 0" }:
  { werte: StatWert[]; hell?: boolean; padding?: string }) {
  const linie = hell ? LINIE : "rgba(244,241,235,.14)"
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${werte.length},1fr)`, padding }}>
      {werte.map((x, i) => (
        <div key={x.label} style={{
          textAlign: "center", minWidth: 0,
          borderLeft: i === 0 ? "none" : `1px solid ${linie}`,
        }}>
          <div style={{
            fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(22px,6.2vw,30px)",
            lineHeight: 1, fontVariantNumeric: "tabular-nums",
            color: x.akzent ? VIOLETT : (hell ? SCHWARZ : CREME),
          }}>{x.wert}</div>
          <div style={{
            fontFamily: INTER, fontSize: 11, fontWeight: 700, marginTop: 6,
            color: hell ? TEXT_LEISE : "rgba(244,241,235,.55)",
          }}>{x.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Aktionszeile --------------------------------------------------
   Referenz SPIELEN: Symbol links, Titel und ein Satz, Pfeil rechts.
   Bewusst untereinander statt als Raster — die Reihenfolge ist die
   Empfehlung, und eine 2x2-Matrix zwingt zu einer Wahl ohne Rangfolge. */
export function AktionsZeile({ symbol, titel, unter, erste = false }:
  { symbol: React.ReactNode; titel: string; unter: string; erste?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 15, padding: "17px 16px",
      borderTop: erste ? "none" : `1px solid ${LINIE}`,
    }}>
      <span aria-hidden style={{
        width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", color: SCHWARZ,
      }}>{symbol}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{
          display: "block", fontFamily: INTER, fontSize: 14.5, fontWeight: 900,
          letterSpacing: ".05em", textTransform: "uppercase", color: SCHWARZ,
        }}>{titel}</b>
        <span style={{ display: "block", fontFamily: INTER, fontSize: 13.5, color: TEXT_LEISE, marginTop: 3 }}>{unter}</span>
      </span>
      <Pfeil />
    </div>
  )
}

export function Pfeil({ farbe = "rgba(8,8,8,.34)" }: { farbe?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={farbe}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

/* ---------- Listenzeile ---------------------------------------------------
   Ein Muster fuer alle Listen: links ein Bild, ein Datum oder eine Ziffer,
   in der Mitte Titel und Meta, rechts eine Zahl oder eine Aktion. */
export function ListenZeile({ links, titel, unter, meta, rechts, erste = false, aktiv = false }: {
  links?: React.ReactNode; titel: React.ReactNode; unter?: React.ReactNode
  meta?: React.ReactNode; rechts?: React.ReactNode; erste?: boolean; aktiv?: boolean
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 13, padding: "13px 16px",
      borderTop: erste ? "none" : `1px solid ${LINIE}`,
      background: aktiv ? "rgba(140,61,255,.10)" : "transparent",
    }}>
      {links}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Zwei Zeilen statt Abschneiden: "Ping Pong Lounge Open Glattbrugg" wurde neben
            dem ANMELDEN-Knopf abgeschnitten — der Ort, also genau
            das Unterscheidende, fiel weg. */}
        <div style={{
          fontFamily: INTER, fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: SCHWARZ,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{titel}</div>
        {unter && <div style={{ fontFamily: INTER, fontSize: 13, color: TEXT_LEISE, marginTop: 3, lineHeight: 1.35 }}>{unter}</div>}
        {meta && <div style={{ fontFamily: INTER, fontSize: 13, color: TEXT_LEISE, marginTop: 1, lineHeight: 1.35 }}>{meta}</div>}
      </div>
      {rechts && <div style={{ flexShrink: 0 }}>{rechts}</div>}
    </div>
  )
}

/** Quadratisches Vorschaubild fuer eine Listenzeile. */
export function ZeilenBild({ src, groesse = 44 }: { src: string; groesse?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden style={{
      width: groesse * 1.35, height: groesse, borderRadius: 8, objectFit: "cover", flexShrink: 0,
    }} />
  )
}

/* ---------- Datumsblock ---------------------------------------------------
   Referenz EVENTS: Tag gross, Monat klein darunter, links neben der Zeile. */
export function DatumBlock({ tag, monat }: { tag: string | number; monat: string }) {
  return (
    <div aria-hidden style={{ textAlign: "center", width: 42, flexShrink: 0 }}>
      <div style={{
        fontFamily: ANTON, fontWeight: 400, fontSize: 26, lineHeight: .95,
        color: SCHWARZ, fontVariantNumeric: "tabular-nums",
      }}>{tag}</div>
      <div style={{
        fontFamily: INTER, fontSize: 10.5, fontWeight: 900, letterSpacing: ".12em",
        textTransform: "uppercase", marginTop: 3, color: TEXT_LEISE,
      }}>{monat}</div>
    </div>
  )
}

/* ---------- Grosse Kennzahl ----------------------------------------------
   Referenz LIGA: die Platzziffer ist das groesste Element der Inhaltsflaeche. */
export function GrosseZahl({ wert, rechts }:
  { wert: string | number; rechts?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <strong style={{
        fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(52px,15vw,76px)",
        lineHeight: .88, letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums", color: SCHWARZ,
      }}>{wert}</strong>
      {rechts}
    </div>
  )
}

/* ---------- Pillen und Knoepfe ------------------------------------------- */
export function Pille({ text, ton = "neutral" }: { text: string; ton?: "neutral" | "violett" | "gut" | "warn" }) {
  const stil = ton === "violett" ? { background: "rgba(140,61,255,.12)", color: "#5B1FBF" }
    : ton === "gut" ? { background: "rgba(22,142,90,.12)", color: "#12764B" }
    : ton === "warn" ? { background: "rgba(229,72,77,.12)", color: "#C0353A" }
    : { background: "rgba(8,8,8,.06)", color: TEXT_LEISE }
  return (
    <span style={{
      ...stil, display: "inline-block", borderRadius: 999, padding: "4px 10px",
      fontFamily: INTER, fontSize: 11, fontWeight: 900, letterSpacing: ".06em",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{text}</span>
  )
}

const knopfBasis: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  borderRadius: 100, fontFamily: INTER, fontWeight: 900, letterSpacing: ".08em",
  textTransform: "uppercase", textDecoration: "none", cursor: "pointer",
  border: "none", whiteSpace: "nowrap",
}
export const knopfPrimaer: React.CSSProperties = { ...knopfBasis, background: VIOLETT, color: "#FFFFFF", padding: "15px 24px", fontSize: 13.5 }
export const knopfKlein: React.CSSProperties = { ...knopfBasis, background: VIOLETT, color: "#FFFFFF", padding: "8px 14px", fontSize: 11 }
export const knopfOutlineHell: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: SCHWARZ,
  border: "1.5px solid rgba(8,8,8,.24)", padding: "13.5px 24px", fontSize: 13.5,
}
/** Auf dunklem Grund (im Hero oder in schwarzen Bereichen). */
export const knopfOutline: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: CREME,
  border: "1.5px solid rgba(244,241,235,.32)", padding: "13.5px 24px", fontSize: 13.5,
}

/* ---------- Strichsymbole -------------------------------------------------
   Ein Stil fuer die ganze App: 24er Raster, 1.8 Strichstaerke, keine Emojis. */
export function Symbol({ art, groesse = 24, farbe = "currentColor" }:
  { art: "suche" | "spieler" | "plus" | "verlauf" | "pokal" | "freunde" | "zahnrad" | "kalender" | "blitz"; groesse?: number; farbe?: string }) {
  const p: Record<string, React.ReactNode> = {
    suche: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
    spieler: <><circle cx="12" cy="8.2" r="3.6" /><path d="M5.5 20c1.3-3.4 3.8-5.1 6.5-5.1s5.2 1.7 6.5 5.1" /></>,
    plus: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></>,
    verlauf: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    pokal: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10M17 6h2.5v1.5A3 3 0 0 1 16.5 10" /><path d="M12 14v3M9 20h6" /></>,
    freunde: <><circle cx="9.5" cy="8.5" r="3.2" /><path d="M3.5 19c1.1-2.9 3.3-4.4 6-4.4s4.9 1.5 6 4.4" /><path d="M16.5 6.2a3.2 3.2 0 0 1 0 6.1M17.5 14.9c2 .6 3.4 1.9 4.2 4.1" /></>,
    zahnrad: <><circle cx="12" cy="12" r="3.1" /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></>,
    kalender: <><rect x="4" y="6" width="16" height="14" rx="2.5" /><path d="M8 3.5V7M16 3.5V7M4 11h16" /></>,
    blitz: <><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></>,
  }
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 24 24" fill="none" stroke={farbe}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p[art]}</svg>
  )
}
