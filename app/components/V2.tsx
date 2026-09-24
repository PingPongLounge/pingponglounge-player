/* PLAYER — das gemeinsame Bausystem.
   Angelegt 07.09.2026, am 23.09.2026 auf die Sprache von /entdecken gehoben
   (Design-System V3, "Swiss Sports Editorial"). Die oeffentliche API ist
   dabei UNVERAENDERT geblieben: gleiche Namen, gleiche Eigenschaften. Nur
   die Innenseite spricht neu. Deshalb sehen Liga, Match, Rangliste,
   Turniere, Spieler und Profil anders aus, ohne dass eine dieser Seiten
   angefasst wurde.

   Der Dateiname bleibt V2.tsx — ihn zu aendern hiesse, sechs Seiten und ein
   Dutzend Importe anzufassen, ohne dass sich etwas verbessert.

   Was sich geaendert hat:
     - Grundflaeche neutral (#F5F5F2) statt warm (#F4F1EB)
     - Kanten #DDDDDA, kein Radius, kein Schatten, kein Schein
     - Abschnitts- und Feldtitel in Anton statt Inter 900
     - Listentitel Inter 600 statt 700, Nebenzeilen Inter 400
     - Datum in Anton, in einer Kachel mit Kante
     - Knoepfe schwarz statt gruen, ohne Radius, Inter 600
     - Gruen NUR noch als Signal: Status, freie Plaetze, Rang 1, Delta

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
/* VIOLETT ist der Name des Marken-Neon (#39FF14) in theme.ts, AKZENT_TIEF
   der des tiefen Gruen (#0B7A33). Die Namen stammen aus der Violett-Zeit
   und stimmen laengst nicht mehr — sie zu aendern hiesse, ueber 200
   Importstellen anzufassen. Die WERTE sind aktuell. */
import { VIOLETT, AKZENT_TIEF, ANTON_ZEILEN, ANTON, INTER } from "@/app/theme"
import {
  BG as D_BG, FLAECHE as D_WEISS, KANTE as D_KANTE_HELL, LEISE as D_LEISE_HELL,
  TEXT as D_TEXT, DUNKEL as D_DUNKEL, DUNKEL_KANTE as D_DUNKEL_KANTE,
  DUNKEL_LEISE as D_DUNKEL_LEISE,
} from "@/app/design"
import {
  IconSuche, IconSpieler, IconOpenGames, IconMatches, IconTurniere,
  IconCommunity, IconEinstellungen, IconKalender, IconFavorit, IconChevron,
} from "@/app/components/Icons"

/* ---------- App-Grundflaeche (Design-System V3) ---------------------------
   Dieselben Werte wie in app/globals.css unter --p-*. Sie stehen hier als
   Konstanten, weil V2 mit Inline-Styles arbeitet; es sind KEINE zweiten
   Werte, sondern dieselben.

   Grundregel: 90-95% der Flaeche bleiben neutral. Gruen ist Signal —
   Status, freie Plaetze, Rang 1, Rating-Delta — nie Dekoration. */
/* 24.09.2026: Die Werte standen hier als eigene Zeichenketten. Jetzt
   kommen sie aus app/design.ts — derselben Datei, aus der auch die
   Startseite und theme.ts sie beziehen. Die Namen bleiben, weil sechs
   Seiten sie importieren; nur die Quelle ist jetzt eine einzige. */
export const FLAECHE = D_BG           // Seitengrund, neutral statt warm
export const PANEL = D_WEISS          // gruppierte Listen sitzen auf Weiss
export const LINIE = D_KANTE_HELL     // Trennlinie
export const TEXT_LEISE = D_LEISE_HELL// Sekundaertext
export const FELD_KANTE = D_KANTE_HELL// Kante um ein Feld — gleiche Linie
export const TEXT = D_TEXT            // Primaertext
export const DUNKEL = D_DUNKEL        // dunkle Flaechen: Hero, Plakat, Knopf
/* Flaeche, Kante und Sekundaertext innerhalb dunkler Bereiche. */
const D_FLAECHE = "#101316"
const D_KANTE = D_DUNKEL_KANTE
const D_LEISE = D_DUNKEL_LEISE

/* ---------- Hero ----------------------------------------------------------
   Foto, Verlauf, Etikett, Zeile, Erklaerung. Der Verlauf ist der einzige
   Grund, warum die weisse Schrift auf jedem Foto sicher lesbar bleibt:
   unten laeuft er in nahezu deckendes Schwarz aus, dort steht der Text. */
export function Hero({
  bild, pos = "50% 45%", etikett, titel, subline, kopf, alt = "",
}: {
  /* Ohne bild: schwarzer Grund mit weichem blauem Schein statt Foto.
     Auf der Startseite ausdruecklich so gewollt (Oliver, 16.09.) — auf
     jedem vorhandenen Hero-Foto steht Schrift (Neonzeichen, Tischaufdruck,
     Plakate), und Schrift auf Schrift liest sich nicht. */
  bild?: string; pos?: string
  /* etikett ist optional: auf der Startseite steht ueber dem Namen nichts. */
  etikett?: string; titel: React.ReactNode; subline?: React.ReactNode
  kopf?: React.ReactNode; alt?: string
}) {
  return (
    <header className="ppl-hero" style={{
      position: "relative", background: DUNKEL, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {bild ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bild} alt={alt} aria-hidden={alt ? undefined : true} className="ppl-hero-bild"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            objectPosition: pos,
            /* Dieselbe Behandlung wie auf /entdecken: nur eine Spur dunkler,
               damit weisse Schrift sicher darauf steht. */
            filter: "brightness(.88) contrast(1.04)",
          }} />
      ) : (
        /* 23.09.2026: der gruene Schein ist weg. Ein Glow ist Dekoration,
           und die Marke traegt sich ueber Kontrast, nicht ueber Leuchten.
           Ohne Foto steht hier jetzt eine ruhige dunkle Flaeche. */
        <div aria-hidden style={{ position: "absolute", inset: 0, background: DUNKEL }} />
      )}
      {bild && <div aria-hidden style={{
        position: "absolute", inset: 0,
        /* 16.09.2026: unten deckender. Der Text steht im unteren Drittel —
           dort darf vom Motiv nichts mehr durchkommen, sonst liegt Schrift
           auf Schrift (Neonzeichen, Tischaufdrucke, Markennamen). */
        background: "linear-gradient(to bottom, rgba(8,11,13,.80) 0%, rgba(8,11,13,.34) 30%, rgba(8,11,13,.62) 62%, rgba(8,11,13,.90) 82%, rgba(8,11,13,.97) 100%)",
      }} />}

      {kopf && <div style={{ position: "relative", zIndex: 2 }}>{kopf}</div>}

      <div className="ppl-breit" style={{
        position: "relative", zIndex: 2, marginTop: "auto",
        paddingTop: 20, paddingBottom: 22,
      }}>
        {etikett && <div style={{
          /* E - Eyebrow: Inter 600, moderates Tracking. War 900 / .18em. */
          fontFamily: INTER, fontSize: 11.5, fontWeight: 600, letterSpacing: ".13em",
          textTransform: "uppercase", color: VIOLETT, marginBottom: 10,
        }}>{etikett}</div>}

        <h1 className="ppl-hero-titel" style={{
          fontFamily: ANTON, fontWeight: 400, textTransform: "uppercase",
          /* 08.09.2026: lineHeight stand auf .87. Anton ist so eng gebaut,
             dass sich die Zeilen bei mehrzeiligen Titeln beruehrt haben —
             "PLAY. MEET. REPEAT." klebte aufeinander. .96 laesst Luft,
             ohne dass der Block auseinanderfaellt. */
          /* A - Display. Kein kuenstliches Tracking mehr; Anton traegt sich
             selbst. Die Groesse kommt aus .ppl-hero-titel in globals.css. */
          letterSpacing: "-.005em", lineHeight: ANTON_ZEILEN, color: "#FFFFFF", margin: 0,
        }}>{titel}</h1>

        {subline && (
          <p style={{
            /* D - Fliesstext: Inter 400. */
            fontFamily: INTER, fontSize: 16, fontWeight: 400, lineHeight: 1.5, margin: "15px 0 0",
            color: "rgba(255,255,255,.88)", maxWidth: "40ch",
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
    <section style={{ background: FLAECHE, color: TEXT }}>
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
      {/* B - Abschnitts-Ueberschrift: Anton, ohne kuenstliches Tracking.
          War Inter 900 / .08em und damit so schwer wie ein Seitentitel. */}
      <h2 style={{
        fontFamily: ANTON, fontSize: 19, fontWeight: 400, letterSpacing: ".012em",
        lineHeight: 1.05, textTransform: "uppercase", margin: 0,
        color: dunkel ? "#FFFFFF" : TEXT,
      }}>{titel}</h2>
      {mehr && href && (
        <a href={href} style={{
          /* Akzent je nach Grund: helles Blau auf Schwarz, tiefes auf Creme.
             Padding/Margin schaffen 44px Tippflaeche ohne optische Verschiebung. */
          /* E - Meta: klein, Inter 600, zurueckhaltend in Grau statt in
             Akzentfarbe. Ein "Alle" ist kein Statussignal. */
          fontFamily: INTER, fontSize: 11, fontWeight: 600, letterSpacing: ".12em",
          textTransform: "uppercase", color: dunkel ? D_LEISE : TEXT_LEISE,
          textDecoration: "none", whiteSpace: "nowrap",
          padding: "12px 8px", margin: "-12px -8px",
        }}>{mehr} →</a>
      )}
    </div>
  )
}

/* ---------- Weisses Feld --------------------------------------------------
   Gruppierte Listen sitzen auf Weiss, damit die Off-White-Flaeche Struktur
   bekommt, ohne dass jede Zeile eine eigene Karte wird. */
export function Feld({ children, padding = 0, titel, mehr, href, dunkel = false }: {
  children: React.ReactNode; padding?: number | string
  titel?: string; mehr?: string; href?: string; dunkel?: boolean
}) {
  return (
    <div style={{
      /* Kein Radius, kein Schatten: Struktur entsteht aus Linie und
         Weissraum. War borderRadius 16. */
      background: dunkel ? D_FLAECHE : PANEL, overflow: "hidden",
      border: `1px solid ${dunkel ? D_KANTE : FELD_KANTE}`, minWidth: 0,
    }}>
      {titel && (
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          gap: 16, padding: "16px 16px 12px",
        }}>
          <h2 style={{
            fontFamily: ANTON, fontSize: 19, fontWeight: 400, letterSpacing: ".012em",
            lineHeight: 1.05, textTransform: "uppercase", margin: 0,
            color: dunkel ? "#FFFFFF" : TEXT,
          }}>{titel}</h2>
          {mehr && href && (
            <a href={href} style={{
              fontFamily: INTER, fontSize: 11, fontWeight: 600, letterSpacing: ".12em",
              textTransform: "uppercase", color: dunkel ? D_LEISE : TEXT_LEISE,
              textDecoration: "none", whiteSpace: "nowrap",
              padding: "12px 8px", margin: "-12px -8px",
            }}>{mehr} →</a>
          )}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  )
}

/* ---------- Kennzahlen als einzelne Kaestchen ------------------------------
   Nach der Vorlage vom 16.09.: jede Zahl steht in einem eigenen Kaestchen,
   und jedes Kaestchen fuehrt irgendwohin. Deshalb <a>, nicht <div> — wer auf
   sein Rating tippt, will sein Profil sehen. */
export type StatKachel = { wert: string | number; label: string; ziel?: string; zielLabel?: string; akzent?: boolean }

export function StatsKacheln({ werte, dunkel = false }: { werte: StatKachel[]; dunkel?: boolean }) {
  const flaeche = dunkel ? D_FLAECHE : PANEL
  const kante = dunkel ? D_KANTE : FELD_KANTE
  const akzent = dunkel ? VIOLETT : AKZENT_TIEF
  const leise = dunkel ? D_LEISE : TEXT_LEISE
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }} className="ppl-kacheln">
      {werte.map(x => {
        const inhalt = (
          <>
            <span style={{
              fontFamily: ANTON, fontWeight: 400, fontSize: 32, lineHeight: ANTON_ZEILEN,
              fontVariantNumeric: "tabular-nums", color: x.akzent ? akzent : (dunkel ? "#FFFFFF" : TEXT),
            }}>{x.wert}</span>
            <span style={{
              /* E - Meta: Inter 600 statt 700, kleiner, moderates Tracking. */
              fontFamily: INTER, fontSize: 10.5, fontWeight: 600, letterSpacing: ".13em",
              textTransform: "uppercase", color: leise,
            }}>{x.label}</span>
            {x.ziel && <span style={{ fontFamily: INTER, fontSize: 11.5, fontWeight: 600, color: akzent }}>{x.zielLabel ?? "Ansehen"} →</span>}
          </>
        )
        const stil: React.CSSProperties = {
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 7, minHeight: 96, padding: "16px 10px", textAlign: "center",
          background: flaeche, border: `1px solid ${kante}`,
          textDecoration: "none",
        }
        return x.ziel
          ? <a key={x.label} href={x.ziel} style={stil}>{inhalt}</a>
          : <div key={x.label} style={stil}>{inhalt}</div>
      })}
    </div>
  )
}

/* ---------- Zahlenreihe ---------------------------------------------------
   Drei bis vier Zahlen nebeneinander, getrennt durch feine Linien. */
export type StatWert = { wert: string | number; label: string; akzent?: boolean }

export function StatsReihe({ werte, hell = true, padding = "16px 0" }:
  { werte: StatWert[]; hell?: boolean; padding?: string }) {
  const linie = hell ? LINIE : D_KANTE
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${werte.length},1fr)`, padding }}>
      {werte.map((x, i) => (
        <div key={x.label} style={{
          textAlign: "center", minWidth: 0,
          borderLeft: i === 0 ? "none" : `1px solid ${linie}`,
        }}>
          <div style={{
            fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(24px,6.6vw,32px)",
            lineHeight: ANTON_ZEILEN, fontVariantNumeric: "tabular-nums",
            color: x.akzent ? (hell ? AKZENT_TIEF : VIOLETT) : (hell ? TEXT : "#FFFFFF"),
          }}>{x.wert}</div>
          <div style={{
            fontFamily: INTER, fontSize: 10.5, fontWeight: 600, letterSpacing: ".13em",
            textTransform: "uppercase", marginTop: 7,
            color: hell ? TEXT_LEISE : D_LEISE,
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
        width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", color: TEXT,
      }}>{symbol}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {/* C - UI-Titel: Inter 600, normale Schreibweise. War Inter 900 in
            Versalien und damit lauter als die Abschnitts-Ueberschrift. */}
        <b style={{
          display: "block", fontFamily: INTER, fontSize: 15.5, fontWeight: 600,
          lineHeight: 1.3, color: TEXT,
        }}>{titel}</b>
        <span style={{ display: "block", fontFamily: INTER, fontSize: 13, fontWeight: 400, color: TEXT_LEISE, marginTop: 3, lineHeight: 1.4 }}>{unter}</span>
      </span>
      <Pfeil />
    </div>
  )
}

export function Pfeil({ farbe = TEXT_LEISE }: { farbe?: string }) {
  return <IconChevron size={19} style={{ color: farbe }} />
}

/* ---------- Listenzeile ---------------------------------------------------
   Ein Muster fuer alle Listen: links ein Bild, ein Datum oder eine Ziffer,
   in der Mitte Titel und Meta, rechts eine Zahl oder eine Aktion. */
export function ListenZeile({ links, titel, unter, meta, rechts, erste = false, aktiv = false }: {
  links?: React.ReactNode; titel: React.ReactNode; unter?: React.ReactNode
  meta?: React.ReactNode; rechts?: React.ReactNode; erste?: boolean; aktiv?: boolean
}) {
  return (
    <div className="ppl-zeile" style={{
      display: "flex", alignItems: "center", gap: 13, padding: "14px 16px",
      borderTop: erste ? "none" : `1px solid ${LINIE}`,
      background: aktiv ? "rgba(7,138,59,.09)" : "transparent", color: TEXT,
    }}>
      {links}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Zwei Zeilen statt Abschneiden: "Ping Pong Lounge Open Glattbrugg" wurde neben
            dem ANMELDEN-Knopf abgeschnitten — der Ort, also genau
            das Unterscheidende, fiel weg. */}
        {/* C - UI-Titel: Inter 600 statt 700, eine Spur kleiner. Ein Name in
            einer Liste soll kein Schlagzeilengewicht haben. */}
        {/* Drei Zeilen statt zwei, und der Aufruf rutscht auf schmalen
            Schirmen darunter (.ppl-zeile-cta). Ein Eventname wird nicht
            abgeschnitten, damit ein Knopf daneben Platz hat. */}
        <div style={{
          fontFamily: INTER, fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, color: TEXT,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{titel}</div>
        {/* D - Nebenzeilen: Inter 400, 13px. Waren 14.5 und damit fast so
            gross wie der Titel. */}
        {unter && <div style={{ fontFamily: INTER, fontSize: 13, fontWeight: 400, color: TEXT_LEISE, marginTop: 3, lineHeight: 1.45 }}>{unter}</div>}
        {meta && <div style={{ fontFamily: INTER, fontSize: 13, fontWeight: 400, color: TEXT_LEISE, marginTop: 2, lineHeight: 1.45 }}>{meta}</div>}
      </div>
      {rechts && <div className="ppl-zeile-cta" style={{ flexShrink: 0 }}>{rechts}</div>}
    </div>
  )
}

/** Quadratisches Vorschaubild fuer eine Listenzeile. */
export function ZeilenBild({ src, groesse = 44 }: { src: string; groesse?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden style={{
      width: groesse * 1.35, height: groesse, objectFit: "cover", flexShrink: 0,
    }} />
  )
}

/* ---------- Datumsblock ---------------------------------------------------
   Referenz EVENTS: Tag gross, Monat klein darunter, links neben der Zeile. */
export function DatumBlock({ tag, monat }: { tag: string | number; monat: string }) {
  return (
    /* 23.09.2026: zurueck zu Anton und in eine Kachel mit Kante — wie auf
       /entdecken. Ein Datum IST eine Sportzahl: es ist der Termin, und der
       ist das Erste, was jemand in einer Terminliste sucht. Die Notiz vom
       16.09. ("ein Datum ist keine Kennzahl") galt fuer ein anderes System. */
    <div aria-hidden style={{
      width: 48, flexShrink: 0, textAlign: "center", lineHeight: 1,
      border: `1px solid ${LINIE}`, padding: "6px 0",
    }}>
      <div style={{
        fontFamily: ANTON, fontWeight: 400, fontSize: 27, lineHeight: 1,
        color: TEXT, fontVariantNumeric: "tabular-nums", margin: "2px 0",
      }}>{tag}</div>
      <div style={{
        fontFamily: INTER, fontSize: 10, fontWeight: 600, letterSpacing: ".12em",
        textTransform: "uppercase", color: TEXT_LEISE,
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
        lineHeight: ANTON_ZEILEN, letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums", color: TEXT,
      }}>{wert}</strong>
      {rechts}
    </div>
  )
}

/* ---------- Pillen und Knoepfe ------------------------------------------- */
export function Pille({ text, ton = "neutral" }: { text: string; ton?: "neutral" | "violett" | "gut" | "warn" }) {
  /* Status statt Dekoration: Kante und Schrift tragen die Bedeutung, nicht
     eine gefuellte Flaeche. Ohne Radius, wie alles andere auch. */
  const stil = ton === "violett" ? { borderColor: AKZENT_TIEF, color: AKZENT_TIEF }
    : ton === "gut" ? { borderColor: "#12764B", color: "#12764B" }
    : ton === "warn" ? { borderColor: "#C0353A", color: "#C0353A" }
    : { borderColor: LINIE, color: TEXT_LEISE }
  return (
    <span style={{
      ...stil, display: "inline-block", borderWidth: 1, borderStyle: "solid",
      background: "transparent", padding: "4px 9px",
      fontFamily: INTER, fontSize: 10.5, fontWeight: 600, letterSpacing: ".11em",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{text}</span>
  )
}

/* Ein Knopf ist ein Knopf, keine Schlagzeile: Inter 600, kein Radius,
   moderates Tracking. War Inter 900 mit borderRadius 100. */
const knopfBasis: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontFamily: INTER, fontWeight: 600, letterSpacing: ".12em",
  textTransform: "uppercase", textDecoration: "none", cursor: "pointer",
  border: "none", whiteSpace: "nowrap",
}
/* 23.09.2026: der gefuellte Knopf ist SCHWARZ, nicht gruen. Gruen ist in
   PLAYER ein Signal (frei, offen, Rang 1, Delta) — sitzt es auf jedem
   Knopf, sagt es nichts mehr. Ein gruener Knopf bleibt dem einen
   Haupt-Aufruf auf dunklem Grund vorbehalten (knopfNeon). */
export const knopfPrimaer: React.CSSProperties = { ...knopfBasis, background: DUNKEL, color: "#FFFFFF", padding: "15px 26px", fontSize: 12.5, minHeight: 50 }
export const knopfKlein: React.CSSProperties = { ...knopfBasis, background: DUNKEL, color: "#FFFFFF", padding: "11px 18px", fontSize: 11.5, minHeight: 44 }
export const knopfOutlineHell: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: TEXT,
  border: `1px solid ${LINIE}`, padding: "14px 26px", fontSize: 12.5, minHeight: 50,
}
/** Auf dunklem Grund (im Hero oder in schwarzen Bereichen). */
export const knopfOutline: React.CSSProperties = {
  ...knopfBasis, background: "transparent", color: "#FFFFFF",
  border: `1px solid ${D_KANTE}`, padding: "14px 26px", fontSize: 12.5, minHeight: 50,
}
/** Der eine kraeftige Aufruf auf dunklem Grund — Neon mit dunkler Schrift.
    Bewusst NICHT fuer helle Flaechen: dort waere er eine gruene Flaeche. */
export const knopfNeon: React.CSSProperties = {
  ...knopfBasis, background: VIOLETT, color: DUNKEL,
  padding: "15px 26px", fontSize: 12.5, minHeight: 50,
}

/* ---------- Symbole -------------------------------------------------------
   24.09.2026: Diese Funktion zeichnete neun eigene Strichsymbole — eine
   zweite Icon-Familie neben app/components/Icons.tsx. Sie reicht die Namen
   jetzt an den echten PLAYER-Satz weiter (aus Olivers Icon-Blatt). Die
   Signatur bleibt gleich, damit /profil und /match unveraendert bleiben.

   Zwei Namen hatten kein Gegenstueck auf dem Blatt und sind sinngemaess
   zugeordnet — wenn ein anderes Motiv besser passt, steht die Zuordnung
   an genau dieser Stelle:
     plus  ("Spiel erstellen") -> Open Games
     blitz ("PingPoints")      -> Stern */
export function Symbol({ art, groesse = 24, farbe = "currentColor" }:
  { art: "suche" | "spieler" | "plus" | "verlauf" | "pokal" | "freunde" | "zahnrad" | "kalender" | "blitz"; groesse?: number; farbe?: string }) {
  const K = {
    suche: IconSuche, spieler: IconSpieler, plus: IconOpenGames,
    verlauf: IconMatches, pokal: IconTurniere, freunde: IconCommunity,
    zahnrad: IconEinstellungen, kalender: IconKalender, blitz: IconFavorit,
  }[art]
  return <span style={{ color: farbe, display: "inline-flex" }}><K size={groesse} /></span>
}
