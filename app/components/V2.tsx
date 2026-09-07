/* PLAYER V2 — gemeinsame Bausteine (07.09.2026, verbindlich).
   Grundlage ist ab jetzt das Referenzbild von Oliver. Kein zweites
   Designsystem: Farben und Schriften kommen aus app/theme.ts.

   Die Logik dahinter:
     SCHWARZ   Atmosphaere, Hero, Navigation, Community, Bilder, Aktionen
     OFF-WHITE Lesen und Verstehen: Rankings, Zahlen, Erklaerungen
     VIOLETT   Interaktion, aktive Elemente, Highlights

   Was die Referenz gegenueber dem bisherigen Stand aendert:
     1. Jeder Bereich beginnt mit einem echten Foto von echten Leuten,
        rund ein Drittel des ersten Bildschirms.
     2. Darunter, auf deckendem Schwarz, EIN grosser Anton-Titel — mehr
        braucht es nicht.
     3. Zahlen stehen als Reihe, nicht als Kaertchen.
     4. Listen sind Zeilen mit Bild links und Pille rechts.

   07.09.2026, Oliver: "lass die Neon Signs weg, mach Titel wieder
   groesser." Die Neon-Schreibschrift (Kaushan) ist damit raus — im
   Player traegt der Anton-Titel den Kopf allein.

   Ohne "use client" — laeuft in Server- wie Client-Seiten. */
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER } from "@/app/theme"

/* ---------- Schraege Kante ------------------------------------------------
   Der Uebergang zwischen Schwarz und Off-White ist nie eine gerade Linie,
   sondern faellt ueber die volle Breite um HOEHE Pixel. Kein Torn Paper,
   keine Zacken — eine Kante, immer dieselbe Richtung (links hoeher). */
const HOEHE = 20

export function KanteZuHell({ hoehe = HOEHE }: { hoehe?: number }) {
  return (
    <div aria-hidden style={{
      height: hoehe, background: CREME, marginTop: -1,
      clipPath: `polygon(0 0, 100% ${hoehe}px, 100% 100%, 0 100%)`,
    }} />
  )
}

export function KanteZuDunkel({ hoehe = HOEHE }: { hoehe?: number }) {
  return (
    <div aria-hidden style={{
      height: hoehe, background: SCHWARZ, marginTop: -1,
      clipPath: `polygon(0 0, 100% ${hoehe}px, 100% 100%, 0 100%)`,
    }} />
  )
}

/** Off-White-Informationsflaeche mit schraegen Kanten oben und unten. */
export function HellFlaeche({ children, kanteOben = true, kanteUnten = true, padding = "30px 0 34px", eng = false }:
  { children: React.ReactNode; kanteOben?: boolean; kanteUnten?: boolean; padding?: string; eng?: boolean }) {
  return (
    <>
      {kanteOben && <KanteZuHell />}
      <section style={{ background: CREME, color: SCHWARZ }}>
        <div className={eng ? "ppl-eng" : "ppl-breit"} style={{ padding }}>{children}</div>
      </section>
      {kanteUnten && <KanteZuDunkel />}
    </>
  )
}

/* ---------- Foto-Hero -----------------------------------------------------
   Ein echtes Bild aus der Lounge, rund ein Drittel des ersten Bildschirms,
   das nach unten in deckendes Schwarz laeuft. Darauf liegt nur die schmale
   Kopfzeile (PPL. links, Glocke rechts) — Text kommt erst darunter. */
export function FotoHero({
  bild, pos = "50% 40%", hoehe, kopf, children, alt = "",
}: {
  bild: string; pos?: string; hoehe?: string
  kopf?: React.ReactNode; children?: React.ReactNode; alt?: string
}) {
  return (
    <header style={{ position: "relative", background: SCHWARZ }}>
      {/* Hoehe kommt aus globals.css (.ppl-fotohero): Handy rund ein Drittel
          des Bildschirms, Desktop deutlich mehr — sonst wirkt das Bild dort
          wie ein Streifen. hoehe= ueberschreibt das nur im Ausnahmefall. */}
      <div className="ppl-fotohero" style={{ position: "relative", overflow: "hidden", ...(hoehe ? { height: hoehe } : null) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bild} alt={alt} aria-hidden={alt ? undefined : true} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: pos,
        }} />
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(8,8,8,.42) 0%, rgba(8,8,8,.14) 24%, rgba(8,8,8,.50) 60%, rgba(8,8,8,.94) 84%, #080808 96%)",
        }} />
        {kopf && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>{kopf}</div>
        )}
      </div>
      {children && (
        <div className="ppl-breit" style={{ position: "relative", paddingTop: 4, paddingBottom: 30 }}>
          {children}
        </div>
      )}
    </header>
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

/* ---------- Zahlenreihe ---------------------------------------------------
   Referenz: drei bis vier Zahlen nebeneinander, direkt auf der Flaeche,
   getrennt durch eine feine Linie. Keine Kaertchen. */
export type StatWert = { wert: string | number; label: string; akzent?: boolean }

export function StatsReihe({ werte, hell = false }: { werte: StatWert[]; hell?: boolean }) {
  const linie = hell ? "1px solid rgba(8,8,8,.14)" : "1px solid rgba(244,241,235,.14)"
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${werte.length},1fr)` }}>
      {werte.map((x, i) => (
        <div key={x.label} style={{
          paddingLeft: i === 0 ? 0 : 14, borderLeft: i === 0 ? "none" : linie, minWidth: 0,
        }}>
          <strong style={{
            display: "block", fontFamily: ANTON, fontWeight: 400,
            fontSize: "clamp(26px,7.5vw,42px)", lineHeight: .95,
            fontVariantNumeric: "tabular-nums",
            color: x.akzent ? VIOLETT : (hell ? SCHWARZ : CREME),
          }}>{x.wert}</strong>
          <small style={{
            display: "block", fontFamily: INTER, fontSize: 11.5, fontWeight: 800,
            letterSpacing: ".13em", textTransform: "uppercase", marginTop: 7,
            color: hell ? "rgba(8,8,8,.55)" : "rgba(244,241,235,.55)",
          }}>{x.label}</small>
        </div>
      ))}
    </div>
  )
}

/* ---------- Grosse Kennzahl ----------------------------------------------
   Referenz Liga: eine riesige Platzziffer, daneben die Veraenderung. */
export function GrosseZahl({ wert, label, delta, hell = false }:
  { wert: string | number; label: string; delta?: { richtung: "hoch" | "runter" | "gleich"; text: string }; hell?: boolean }) {
  const farbe = delta?.richtung === "hoch" ? VIOLETT
    : delta?.richtung === "runter" ? "rgba(229,72,77,.95)"
    : (hell ? "rgba(8,8,8,.55)" : "rgba(244,241,235,.55)")
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <strong style={{
          display: "block", fontFamily: ANTON, fontWeight: 400,
          fontSize: "clamp(74px,23vw,132px)", lineHeight: .82,
          letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums",
          color: hell ? SCHWARZ : CREME,
        }}>{wert}</strong>
        <small style={{
          display: "block", fontFamily: INTER, fontSize: 12, fontWeight: 800,
          letterSpacing: ".15em", textTransform: "uppercase", marginTop: 10,
          color: hell ? "rgba(8,8,8,.55)" : "rgba(244,241,235,.55)",
        }}>{label}</small>
      </div>
      {delta && (
        <span style={{
          fontFamily: INTER, fontSize: 14, fontWeight: 800, color: farbe,
          paddingBottom: 6, display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <span aria-hidden style={{ fontSize: 12 }}>
            {delta.richtung === "hoch" ? "▲" : delta.richtung === "runter" ? "▼" : "—"}
          </span>
          {delta.text}
        </span>
      )}
    </div>
  )
}

/* ---------- Datumsblock ---------------------------------------------------
   Referenz Events: Tag gross, Monat klein darunter, links neben der Zeile. */
export function DatumBlock({ tag, monat, hell = false }: { tag: string | number; monat: string; hell?: boolean }) {
  return (
    <div aria-hidden style={{ textAlign: "center", width: 52, flexShrink: 0 }}>
      <div style={{
        fontFamily: ANTON, fontWeight: 400, fontSize: 34, lineHeight: .9,
        color: hell ? SCHWARZ : CREME, fontVariantNumeric: "tabular-nums",
      }}>{tag}</div>
      <div style={{
        fontFamily: INTER, fontSize: 11, fontWeight: 900, letterSpacing: ".14em",
        textTransform: "uppercase", marginTop: 5, color: VIOLETT,
      }}>{monat}</div>
    </div>
  )
}

/* ---------- Listenzeile ---------------------------------------------------
   Ein Muster fuer alle Listen: links ein Bild oder ein Datum, in der Mitte
   Titel und zwei Metazeilen, rechts eine Aktion. Ohne Kaertchen — nur eine
   feine Linie darueber. */
export function ListenZeile({ links, titel, unter, meta, rechts, hell = false, erste = false }: {
  links?: React.ReactNode; titel: React.ReactNode; unter?: React.ReactNode
  meta?: React.ReactNode; rechts?: React.ReactNode; hell?: boolean; erste?: boolean
}) {
  const linie = hell ? "1px solid rgba(8,8,8,.12)" : "1px solid rgba(244,241,235,.12)"
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "15px 0",
      borderTop: erste ? "none" : linie,
    }}>
      {links}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: INTER, fontSize: 16, fontWeight: 800, lineHeight: 1.25,
          color: hell ? SCHWARZ : CREME,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{titel}</div>
        {unter && <div style={{
          fontFamily: INTER, fontSize: 13.5, marginTop: 4, lineHeight: 1.35,
          color: hell ? "rgba(8,8,8,.62)" : "rgba(244,241,235,.62)",
        }}>{unter}</div>}
        {meta && <div style={{
          fontFamily: INTER, fontSize: 12, fontWeight: 800, letterSpacing: ".06em",
          textTransform: "uppercase", marginTop: 6, color: VIOLETT,
        }}>{meta}</div>}
      </div>
      {rechts && <div style={{ flexShrink: 0 }}>{rechts}</div>}
    </div>
  )
}

/** Quadratisches Vorschaubild fuer eine Listenzeile. */
export function ZeilenBild({ src, groesse = 52 }: { src: string; groesse?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden style={{
      width: groesse, height: groesse, borderRadius: 12, objectFit: "cover", flexShrink: 0,
    }} />
  )
}

/* ---------- Kachel --------------------------------------------------------
   Referenz Profil: dunkle Kacheln mit Symbol, Zahl und Bezeichnung. */
export function Kachel({ symbol, wert, label, aktiv = false }:
  { symbol?: React.ReactNode; wert: React.ReactNode; label: string; aktiv?: boolean }) {
  return (
    <div style={{
      background: aktiv ? "rgba(140,61,255,.14)" : "#111113",
      border: aktiv ? `1px solid rgba(140,61,255,.42)` : "1px solid rgba(244,241,235,.09)",
      borderRadius: 18, padding: "18px 16px", minWidth: 0,
    }}>
      {symbol && <div aria-hidden style={{ fontSize: 20, lineHeight: 1, marginBottom: 12, color: VIOLETT }}>{symbol}</div>}
      <div style={{
        fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(24px,6.5vw,32px)",
        lineHeight: .95, color: CREME, fontVariantNumeric: "tabular-nums",
      }}>{wert}</div>
      <div style={{
        fontFamily: INTER, fontSize: 11.5, fontWeight: 800, letterSpacing: ".12em",
        textTransform: "uppercase", marginTop: 7, color: "rgba(244,241,235,.55)",
      }}>{label}</div>
    </div>
  )
}

/* ---------- Pillen --------------------------------------------------------
   Kleine Statuspille (frei/ausgebucht/Level) — kein Knopf. */
export function Pille({ text, ton = "neutral", hell = false }:
  { text: string; ton?: "neutral" | "violett" | "warn"; hell?: boolean }) {
  const stil = ton === "violett"
    ? { background: "rgba(140,61,255,.16)", color: hell ? "#5B1FBF" : "#D9C2FF" }
    : ton === "warn"
    ? { background: "rgba(229,72,77,.14)", color: "#E5484D" }
    : { background: hell ? "rgba(8,8,8,.07)" : "rgba(244,241,235,.09)", color: hell ? "rgba(8,8,8,.62)" : "rgba(244,241,235,.62)" }
  return (
    <span style={{
      ...stil, display: "inline-block", borderRadius: 999, padding: "5px 11px",
      fontFamily: INTER, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{text}</span>
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
/** Kleine Pillen-Aktion am rechten Rand einer Listenzeile. */
export const knopfKlein: React.CSSProperties = {
  ...knopfBasis, background: VIOLETT, color: CREME,
  padding: "9px 16px", fontSize: 11.5, letterSpacing: ".08em",
}
export const knopfKleinOutline: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: CREME,
  border: "1.5px solid rgba(244,241,235,.30)", padding: "7.5px 16px",
  fontSize: 11.5, letterSpacing: ".08em",
}
