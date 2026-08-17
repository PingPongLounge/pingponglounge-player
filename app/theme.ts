// =====================================================================
// PING PONG LOUNGE · PLAYER — DESIGN SYSTEM (Single Source of Truth)
// =====================================================================
// Finale Regeln (von Oliver bestätigt, Referenz: Startseite /entdecken)
//
//  • Verlauf (#57CF79 → #1FD1C4) NUR für Logo + Rang-Zahl. Sonst nie.
//  • Überschriften/Titel extra fett (900), GROSSBUCHSTABEN, weiss.
//  • Fliesstext leicht (300) aber weiss (~.85–.9) — Kontrast über Gewicht.
//  • Karten randlos (kein Border), Füllung + dezenter Schatten.
//  • Buttons IMMER gefüllt: primär = Verlauf-Fill (dunkle Schrift), sekundär = grau.
//  • Keine vollflächigen Rahmen/Outlines irgendwo (nur Trennlinien borderTop/Bottom).
//  • Elite-Level = Cyan. Kein Pink irgendwo.
//  • Korrektes Deutsch (Nomen/Satzanfang gross), Sektions-Titel GROSS.
//
// Live-Styleguide: /styleguide
// =====================================================================

import type { CSSProperties } from 'react'

/* ---------- Farben (Briefing-Look 08/2026: dunkler + helles Neon-Grün) ---------- */
export const BG     = '#0A0B0D'                 // Screen-Hintergrund (fast schwarz)
export const CARD   = '#14171C'                 // Karten-Fläche (DAS Standard-Kästchen)
export const CELL   = '#181C22'                 // Zellen / Chips innerhalb Karten
export const INPUTBG= '#0F1216'                 // Eingabefelder (etwas dunkler)
export const W      = '#FFFFFF'                  // Primärtext
export const SUB    = 'rgba(255,255,255,.9)'   // Sekundärtext (gut lesbar)
export const MUT    = 'rgba(255,255,255,.62)'    // Labels / gedämpft
export const LINE   = 'rgba(255,255,255,.08)'   // dezente Trennlinie
export const DANGER = '#E5484D'                 // Fehler / Löschen (klares, ruhiges Rot)

export const GREEN  = '#24E07C'                  // helles Neon-Grün (Akzent)
export const CYAN   = '#2BD4C4'
export const INK    = '#05130B'                  // dunkle Schrift NUR auf Neon-Grün-Fill (Button-Label)
export const GRAD   = 'linear-gradient(135deg,#24E07C,#2BD4C4)'   // Logo + Rang
export const SHADOW = '0 4px 14px rgba(0,0,0,.35)'

/* ---------- Level-System: 1–7 (Mint → Teal → Bronze → Amber → Silber → Platin → Gold) ----------
   Aufsteigend — dunkle Schrift drauf (TEXT_ON = #15110A). */

// Beschreibungen: Single Source of Truth für Onboarding + Profil + Turniere
export const LEVEL_DESCS: Record<string, string> = {
  '1': 'Einsteiger, spiele zum Spass',
  '2': 'Grundschläge sicher, erste eigene Rallyes',
  '3': 'Regelmässiger Freizeitspieler',
  '4': 'Solide Technik, spiele auch Turniere',
  '5': 'Vereinserfahrung & gute Taktik',
  '6': 'Turnierspieler, konstante Top-Leistung',
  '7': 'Wettkampf-Niveau, Spitzenklasse',
}

// Mindest-ELO je Level
// EINE Standortliste für alles — Open Game, Turniere, Filter. Vorher hatte jede
// Seite ihre eigene: die Filter in der Open-Game-Liste enthielten Städte, die man
// beim Erstellen gar nicht wählen konnte → vier Filter-Buttons ohne jede Wirkung.
export const CITIES = [
  "Glattbrugg", "Oerlikon", "Langstrasse", "St. Gallen", "Basel", "Luzern", "Andere",
] as const

export const LEVEL_ELO: Record<string, number> = {
  // Level 1 stand hier auf 0 — ein Anfänger wäre mit 0 Punkten gestartet.
  // 950 liegt sauber unter Level 2 (1050).
  '1': 950, '2': 1050, '3': 1150, '4': 1250, '5': 1350, '6': 1450, '7': 1600,
}

export const LEVEL_GRADIENTS: Record<string, string> = {
  '1': 'linear-gradient(135deg,#A8E0C8,#6FB89A)',  // Mint
  '2': 'linear-gradient(135deg,#90D4CC,#4EA8A0)',  // Teal
  '3': 'linear-gradient(135deg,#E3A977,#A8662F)',  // Bronze
  '4': 'linear-gradient(135deg,#E8C85A,#C09930)',  // Amber
  '5': 'linear-gradient(135deg,#E6EAF0,#969FAD)',  // Silber
  '6': 'linear-gradient(135deg,#C8D8F0,#8098C8)',  // Platin
  '7': 'linear-gradient(135deg,#F2DB8E,#C49A3A)',  // Gold
  alle: 'linear-gradient(135deg,#A8E0C8,#6FB89A)',
}
export const LEVEL_COLORS: Record<string, string> = {
  '1': '#8FCFB4',
  '2': '#5BBFB7',
  '3': '#CF9763',
  '4': '#D4B040',
  '5': '#BFC6D0',
  '6': '#8898CC',
  '7': '#E0C266',
  alle: '#8FCFB4',
}
export const lvColor = (level?: string | null): string =>
  (level && LEVEL_COLORS[level]) || SUB
export const lvGrad = (level?: string | null): string =>
  (level && LEVEL_GRADIENTS[level]) || LEVEL_GRADIENTS.alle

/** Gibt "Level 3" zurück, oder "" wenn leer */
export const lvLabel = (level?: string | null): string =>
  level && level !== 'alle' ? `Level ${level}` : ''

/** ELO → Level-String '1'–'7' */
export function eloToLevel(elo: number): string {
  if (elo >= 1600) return '7'
  if (elo >= 1450) return '6'
  if (elo >= 1350) return '5'
  if (elo >= 1250) return '4'
  if (elo >= 1150) return '3'
  if (elo >= 1050) return '2'
  return '1'
}

// Rating (Playtomic-Stil, z.B. 4.2) lebt in lib/rewards.ts, damit auch der
// Server (Mails) es nutzen kann. Hier nur re-exportiert, damit die Seiten
// weiterhin aus @/app/theme importieren können.
export { eloToRating, ratingLabel } from "@/lib/rewards"

/* ---------- Verlauf-Text (NUR Logo + Rang) ---------- */
export const gt: CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

/* ---------- Layout ---------- */
export const page = (pad = '22px 10px 100px'): CSSProperties => ({
  minHeight: '100vh', background: BG, padding: 0,
})
export const shell: CSSProperties = { maxWidth: 480, margin: '0 auto', padding: '22px 10px 100px', position: 'relative' }
// Horizontaler Inset: Karten-Gruppe sitzt 10px innen; Kartentext sitzt bei 10+18=28px.
export const wrap:  CSSProperties = { padding: '0 10px' }
export const backLink: CSSProperties = { fontSize: 13, color: MUT, textDecoration: 'none', fontWeight: 500 }

/* ---------- Typografie ---------- */
// Sektions-Kopf (über einer Karten-Gruppe), z.B. "OPEN GAME" + "Alle ansehen ›"
// Einzug 28px = bündig mit dem Kartentext darunter (wrap 10 + Karten-Padding 18).
export const secHead: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 28px 9px' }
// Sektions-Überschrift (GROSS, fett, weiss — KEIN Verlauf)
export const h2: CSSProperties = { fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.04em', color: W }
// Seiten-Titel (oben auf einer Seite, GROSS, fett, weiss — KEIN Verlauf)
export const h1: CSSProperties = { fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', lineHeight: 1, color: W }
// Karten-Titel
export const cardTitle: CSSProperties = { fontSize: 23, fontWeight: 900, letterSpacing: '.02em', color: W }
// Link "Alle ansehen ›"
export const moreLink: CSSProperties = { fontSize: 12, fontWeight: 500, color: MUT, textDecoration: 'none' }
// Eyebrow / kleine Datums-/Statuszeile über einem Titel
export const eyebrow: CSSProperties = { fontSize: 11, color: MUT, fontWeight: 300 }
// Fliesstext (leicht + weiss)
export const body: CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,.9)', fontWeight: 300, lineHeight: 1.45 }
// Sekundärzeile / Meta
export const meta: CSSProperties = { fontSize: 13, color: SUB, fontWeight: 300 }

/* ---------- Karten (DER verbindliche Kästchen-Standard, app-weit gleich) ----------
   Regel: Fläche CARD, borderRadius 18, KEIN Border, flach (kein Shadow).
   Aktiver/ausgewählter Zustand: etwas hellerer Hintergrund via cardActive. */
export const card: CSSProperties = { background: CARD, borderRadius: 18, overflow: 'hidden' }
export const cardPad: CSSProperties = { ...card, padding: 18 }
export const cardActive: CSSProperties = { borderRadius: 18, background: 'rgba(255,255,255,.14)' }

/* ---------- Zellen-Raster (Wann/Wo/Levels/Preis) ---------- */
export const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 15 }
export const cell: CSSProperties = { background: CELL, borderRadius: 12, padding: '12px 13px' }
export const cellKey: CSSProperties = { fontSize: 9.5, color: MUT, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }
export const cellVal: CSSProperties = { fontSize: 13, fontWeight: 500, color: W }

/* ---------- Chips ---------- */
export const chip: CSSProperties = { fontSize: 10.5, fontWeight: 500, color: SUB, background: CELL, borderRadius: 8, padding: '4px 9px' }
// Auswahl-Chip (Filter/Toggle) — aktiv = etwas hellerer Hintergrund + weiss
export const chipBtn = (active: boolean): CSSProperties => ({
  padding: '7px 13px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
  fontWeight: active ? 700 : 500, color: W,
  background: active ? 'rgba(255,255,255,.14)' : CELL,
})

/* ---------- Trennzeile / Listenzeile ---------- */
export const rowTop: CSSProperties = { borderTop: `1px solid ${LINE}` }
export const listRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderTop: `1px solid ${LINE}`, textDecoration: 'none' }

/* ---------- Buttons (Briefing-Look: primär gefüllt Neon-Grün) ----------
   Primär = Neon-Grün-Fill mit dunkler Ink-Schrift (nur hier ist dunkle Schrift
   erlaubt — auf dem Grün ist sie am besten lesbar). Sekundär = Grün umrandet,
   grüner Text. Fliesstext/Karten bleiben immer hell (Creme/Weiss). */
export const GRAD_OUTLINE = `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`
export const btn: CSSProperties = {
  display: 'block', textAlign: 'center', borderRadius: 14,
  padding: '15px', fontSize: 15, fontWeight: 800, color: INK, textDecoration: 'none', cursor: 'pointer',
  background: GREEN, border: 'none',
}
// Sekundär: umrandet, grüner Text
export const btnOutline: CSSProperties = {
  display: 'block', textAlign: 'center', borderRadius: 14,
  padding: '15px', fontSize: 15, fontWeight: 800, color: GREEN, textDecoration: 'none', cursor: 'pointer',
  background: 'transparent', border: `1.5px solid rgba(36,224,124,.5)`,
}
// Primär in einer Karte (gefüllt)
export const btnInCard: CSSProperties = {
  display: 'inline-block', borderRadius: 11,
  padding: '9px 18px', fontSize: 14, fontWeight: 800, color: INK, textDecoration: 'none', cursor: 'pointer',
  background: GREEN, border: 'none',
}
// Neutraler/sekundärer Button (z.B. Abbrechen) — gefüllt grau
export const btnGhost: CSSProperties = {
  display: 'block', textAlign: 'center', background: CELL, color: SUB,
  borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
// Gefährlicher Button (Löschen bestätigen)
export const btnDanger: CSSProperties = {
  display: 'block', textAlign: 'center', background: DANGER, color: '#fff',
  borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
}
// Verlauf-Fill-Helper (früher Verlauf-Outline auf beliebiger Fläche)
export const gradOutlineOn = (bg: string = CARD): CSSProperties => ({
  background: `linear-gradient(${bg},${bg}) padding-box, ${GRAD} border-box`,
  border: '1.5px solid transparent', color: W,
})

/* ---------- Formular ---------- */
export const label: CSSProperties = { fontSize: 11, fontWeight: 500, color: MUT, letterSpacing: '.04em', display: 'block', marginBottom: 8 }
export const input: CSSProperties = { width: '100%', background: INPUTBG, borderRadius: 10, padding: '12px 14px', fontSize: 14, color: W, outline: 'none', fontFamily: 'inherit' }

/* ---------- Badges ---------- */
// Level-Pille: gefüllter Pastell-Metall-Verlauf + dunkle Schrift (Bronze/Silber/Gold lesbar)
// Level-Badge: EINE ruhige Pille. Vorher hatte jedes Level seinen eigenen
// Farbverlauf (gelb, blau, grau) — in einer Rangliste ergab das einen bunten
// Flickenteppich, der den Blick von Platz und Punkten wegzog.
export const levelBadge = (_level?: string | null): CSSProperties => ({
  fontSize: 10, fontWeight: 800, color: SUB, background: CELL,
  borderRadius: 999, padding: '3px 8px',
  display: 'inline-block', letterSpacing: '.02em', whiteSpace: 'nowrap',
})
// Neutrale Status-Pill (offen/läuft/beendet)
export const statusPill: CSSProperties = { fontSize: 10, fontWeight: 500, color: SUB, background: CELL, borderRadius: 999, padding: '3px 10px', display: 'inline-block' }
