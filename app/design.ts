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
/** Ausserhalb des Canvas — der Rahmen auf dem Desktop. */
export const AUSSEN = "#080808"
/** Dunkle Flaechen INNERHALB des Canvas: Hero, Plakat, Fuss, Knopf. */
export const DUNKEL = "#080B0D"
/** Seitengrund, neutral (nicht creme). */
export const BG = "#F5F5F2"
/** Karten- und Listenflaeche. */
export const FLAECHE = "#FFFFFF"
export const TEXT = "#111111"
export const LEISE = "#686868"
export const KANTE = "#DDDDDA"
/** Marken-Neon. NUR auf dunklem Grund (14:1). Auf Hell 1,26:1 — unsichtbar. */
export const NEON = "#39FF14"
/** Gruen auf hellem Grund (4,1:1). Der einzige helle Gruenwert der App. */
export const AKZENT = "#078A3B"
/** Sekundaertext und Kante innerhalb dunkler Flaechen. */
export const DUNKEL_LEISE = "rgba(255,255,255,.62)"
export const DUNKEL_KANTE = "rgba(255,255,255,.20)"

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
/** Umriss auf hellem Grund — sekundaer. */
export const knopfUmriss: React.CSSProperties = {
  ...knopfBasis, minHeight: 50, padding: "0 26px", fontSize: 12.5,
  background: "transparent", color: TEXT, border: `1px solid ${KANTE}`,
}
/** Der EINE hervorgehobene CTA pro Seite — nur auf dunkler Flaeche. */
export const knopfNeon: React.CSSProperties = {
  ...knopfBasis, minHeight: 50, padding: "0 26px", fontSize: 12.5,
  background: NEON, color: DUNKEL,
}
