/* =====================================================================
   PLAYER · DESIGN-SYSTEM V3 — TOKENS
   =====================================================================
   Die visuelle Source of Truth ist die Startseite (/entdecken).
   Diese Datei haelt ihre Werte EINMAL. Wer eine Farbe, eine Schrift,
   eine Kante oder eine Knopfhoehe braucht, importiert sie hier.

   Vorher standen dieselben Werte dreifach im Repo: als CSS-Variablen
   --p-* in globals.css, als P_* in entdecken/page.tsx und als lokale
   Konstanten in components/V2.tsx. Drei Namen fuer denselben Farbwert
   heisst: eine Aenderung an zwei Stellen vergessen.

   app/theme.ts bleibt bestehen (ueber 200 Importstellen tragen seine
   Namen), bezieht seine V3-relevanten Werte aber von hier.

   Regel: 90-95 % der Flaeche bleiben neutral. Gruen ist Signal,
   Status, Interaktion — nie Dekoration, nie Flaeche.
   ===================================================================== */

/* ---------- Farben ---------------------------------------------------- */
/** Ausserhalb des Canvas — der Rahmen auf dem Desktop. Dieselbe Farbachse
    wie DUNKEL, eine Stufe tiefer. */
export const AUSSEN = "#1A1718"
/** Dunkle Flaechen INNERHALB des Canvas: Hero, Plakat, Fuss, Knopf.
    30.09.2026: aus dem Masterlogo (Logo Player.eps) gemessen. Vorher
    #080B0D — kuehl und blaustichig, neben dem Logo sofort als zweites
    Schwarz erkennbar. Weiss darauf 16.3:1. */
export const DUNKEL = "#231F20"
/** Seitengrund, neutral (nicht creme). */
export const BG = "#F5F5F2"
/** Karten- und Listenflaeche. */
export const FLAECHE = "#FFFFFF"
export const TEXT = "#111111"
export const LEISE = "#686868"
export const KANTE = "#DDDDDA"
/** Signalgruen. NUR auf dunklem Grund (12.2:1 auf DUNKEL). Auf Weiss 1.34:1
    — dort niemals verwenden, dafuer ist AKZENT da.
    30.09.2026: die Mitte des Logo-Verlaufs. Vorher #39FF14 — ein Gruen,
    das im Logo nicht vorkommt und neben ihm schreit. */
export const NEON = "#67F9A8"
/** Gruen auf hellem Grund. Abgeleitet aus dem Logo-Tuerkis (H164, S94 %),
    Helligkeit gesenkt bis der Kontrast traegt: 5.55:1 auf Weiss, 5.08:1 auf
    BG. Vorher #078A3B — 4.46:1 auf Weiss und damit knapp UNTER der Norm. */
export const AKZENT = "#047758"
/** Dieselbe Achse, heller: fuer grosse grafische Flaechen ohne Schrift
    (Fortschrittsbalken, Baender). 3.84:1 — die Norm fuer Grafik ist 3:1. */
export const AKZENT_FLAECHE = "#05946E"
/** Sekundaertext und Kante innerhalb dunkler Flaechen. */
export const DUNKEL_LEISE = "#AEB0B8"
export const DUNKEL_KANTE = "rgba(255,255,255,.20)"

/* ---------- Markenverlauf ---------------------------------------------
   Die drei Stuetzstellen des Logo-Verlaufs, aus der EPS gemessen. Der
   Verlauf ist ein MARKENELEMENT, kein Flaechenmittel: Logo, Rangzahl,
   Stufenband, hoechstens ein Wort im Hero. Nie als Schriftfarbe auf
   hellem Grund, nie zweimal auf demselben Bildschirm. */
export const MINT = "#84FDA2"
export const TUERKIS = "#20F8BE"
export const VERLAUF = `linear-gradient(135deg, ${MINT} 0%, ${NEON} 50%, ${TUERKIS} 100%)`
/** Derselbe Verlauf fuer helle Flaechen — nur fuer Flaechen, nie fuer Text. */
export const VERLAUF_HELL = `linear-gradient(135deg, ${AKZENT_FLAECHE} 0%, ${AKZENT} 100%)`

/* ---------- Schrift ---------------------------------------------------
   ANTON = Momente (Hero, Plakat, Abschnittstitel, Sportzahlen).
   INTER = Information (alles Bedienbare, alles Lesbare).            */
export const ANTON = "var(--font-anton), Impact, sans-serif"
export const INTER = "var(--font-inter), system-ui, sans-serif"
/** Anton bringt fast keine eigene Luft mit; darunter kleben die Zeilen. */
export const ANTON_ZEILEN = 1.08

/* ---------- Mass ------------------------------------------------------
   375 px ist die Referenzbreite. Desktop ist dieselbe Ordnung, breiter. */
/** Maximale aeussere Breite des Player-Canvas. Aussen herum: AUSSEN. */
export const CANVAS = 1240
/** Seitenrand mobil / ab 1100 px. Gilt fuer .p-spalte und .ppl-breit. */
export const RAND = 20
export const RAND_BREIT = 44
/** Abstand zwischen zwei Abschnitten. */
export const LUFT = 18
export const LUFT_BREIT = 22

/* ---------- Knopf -----------------------------------------------------
   Eine Form: Flaeche, kein Radius, Inter 600, Grossbuchstaben, .12em.
   Zwei Hoehen: 50 primaer, 44 klein. Mehr gibt es nicht.            */
const knopfBasis: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
  fontFamily: INTER, fontWeight: 600, letterSpacing: ".12em",
  textTransform: "uppercase", textDecoration: "none", cursor: "pointer",
  border: "none", borderRadius: 0,
}
/** Primaer auf hellem Grund: dunkle Flaeche, weisse Schrift. */
export const knopf: React.CSSProperties = {
  ...knopfBasis, minHeight: 50, padding: "0 26px", fontSize: 12.5,
  background: DUNKEL, color: "#FFFFFF",
}
/** Klein — in Karten und Listenzeilen. */
export const knopfKlein: React.CSSProperties = {
  ...knopfBasis, minHeight: 44, padding: "0 18px", fontSize: 11.5,
  background: DUNKEL, color: "#FFFFFF",
}
/** Auf dunklem Grund: weisse Flaeche, dunkle Schrift. */
export const knopfHell: React.CSSProperties = {
  ...knopfBasis, minHeight: 50, padding: "0 26px", fontSize: 12,
  background: "#FFFFFF", color: DUNKEL,
}
/** Umriss — sekundaer, auf hellem UND dunklem Grund.
    24.09.2026: Stand hier fest auf color:TEXT (#111111) und der hellen
    Kante. Seit die Flaeche hinter den Kaestchen ueberall dunkel ist,
    war dieser Knopf ausserhalb einer Karte schwarz auf schwarz —
    "Abmelden" im Profil, "Liga" auf /turniere, "Eigenes Spiel erstellen"
    auf /match. currentColor erbt die Schriftfarbe der Umgebung: auf der
    weissen Karte #111111, auf der dunklen Flaeche Weiss. Die Kante nimmt
    dieselbe Farbe mit 22 % — auf hell praktisch der alte Wert. */
export const knopfUmriss: React.CSSProperties = {
  ...knopfBasis, minHeight: 50, padding: "0 26px", fontSize: 12.5,
  background: "transparent", color: "inherit",
  border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
}
/** Der EINE hervorgehobene CTA pro Seite — nur auf dunkler Flaeche. */
export const knopfNeon: React.CSSProperties = {
  ...knopfBasis, minHeight: 50, padding: "0 26px", fontSize: 12.5,
  background: NEON, color: DUNKEL,
}
