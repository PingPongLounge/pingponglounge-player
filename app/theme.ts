// =====================================================================
// PING PONG LOUNGE · PLAYER — DESIGN SYSTEM (Single Source of Truth)
// =====================================================================
// Finale Regeln (von Oliver bestätigt, Referenz: Startseite /entdecken)
//
//  • Verlauf (#39FF14 → #1FD1C4) NUR für Logo + Rang-Zahl. Sonst nie.
//  • Überschriften/Titel extra fett (900), GROSSBUCHSTABEN, weiss.
//  • Fliesstext leicht (300) aber weiss (~.85–.9) — Kontrast über Gewicht.
//  • Karten randlos (kein Border), Füllung + dezenter Schatten.
//  • Buttons IMMER nur Verlauf-Outline + weisse Schrift (kein Voll-Fill).
//  • Elite-Level = Cyan. Kein Pink irgendwo.
//  • Korrektes Deutsch (Nomen/Satzanfang gross), Sektions-Titel GROSS.
//
// Live-Styleguide: /styleguide
// =====================================================================

import type { CSSProperties } from 'react'

/* ---------- Farben ---------- */
export const BG     = '#20242C'                 // Screen-Hintergrund (Startseiten-Referenz)
export const CARD   = '#2A2F39'                 // Karten-Fläche (DAS Standard-Kästchen)
export const CELL   = '#353B46'                 // Zellen / Chips innerhalb Karten
export const INPUTBG= '#20242C'                 // Eingabefelder (etwas dunkler)
export const W      = '#FFFFFF'                  // Primärtext
export const SUB    = 'rgba(255,255,255,.9)'   // Sekundärtext (gut lesbar)
export const MUT    = 'rgba(255,255,255,.72)'    // Labels / gedämpft (Minimum für Text)
export const LINE   = 'rgba(255,255,255,.06)'   // ultra-dezente Trennlinie
export const DANGER = '#E5484D'                 // Fehler / Löschen (klares, ruhiges Rot)

export const GREEN  = '#39FF14'
export const CYAN   = '#1FD1C4'
export const GRAD   = 'linear-gradient(135deg,#39FF14,#1FD1C4)'   // DAS eine Leuchten (Logo + Rang)
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
   Aktiver/ausgewählter Zustand: Verlauf-Outline via cardActive. */
export const card: CSSProperties = { background: CARD, borderRadius: 18, border: 'none', overflow: 'hidden' }
export const cardPad: CSSProperties = { ...card, padding: 18 }
export const cardActive: CSSProperties = { borderRadius: 18, border: '1.5px solid transparent', background: `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` }

/* ---------- Zellen-Raster (Wann/Wo/Levels/Preis) ---------- */
export const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 15 }
export const cell: CSSProperties = { background: CELL, borderRadius: 12, padding: '12px 13px' }
export const cellKey: CSSProperties = { fontSize: 9.5, color: MUT, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }
export const cellVal: CSSProperties = { fontSize: 13, fontWeight: 500, color: W }

/* ---------- Chips ---------- */
export const chip: CSSProperties = { fontSize: 10.5, fontWeight: 500, color: SUB, background: CELL, borderRadius: 8, padding: '4px 9px' }
// Auswahl-Chip (Filter/Toggle) — aktiv = Verlauf-Outline + weiss
export const chipBtn = (active: boolean): CSSProperties => ({
  padding: '7px 13px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
  fontWeight: active ? 700 : 500, color: W,
  background: active
    ? `linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box`
    : CELL,
  border: active ? '1.5px solid transparent' : `1.5px solid ${CELL}`,
})

/* ---------- Trennzeile / Listenzeile ---------- */
export const rowTop: CSSProperties = { borderTop: `1px solid ${LINE}` }
export const listRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderTop: `1px solid ${LINE}`, textDecoration: 'none' }

/* ---------- Buttons (IMMER Verlauf-Outline + weisse Schrift) ---------- */
// Auf der Seite (Hintergrund = BG)
export const btn: CSSProperties = {
  display: 'block', textAlign: 'center', border: '1.5px solid transparent', borderRadius: 12,
  padding: '13px', fontSize: 15, fontWeight: 700, color: W, textDecoration: 'none', cursor: 'pointer',
  background: `linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box`,
}
// In einer Karte (Hintergrund = CARD)
export const btnInCard: CSSProperties = {
  display: 'inline-block', border: '1.5px solid transparent', borderRadius: 11,
  padding: '9px 18px', fontSize: 14, fontWeight: 700, color: W, textDecoration: 'none', cursor: 'pointer',
  background: `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box`,
}
// Neutraler/sekundärer Button (z.B. Abbrechen) — dezenter Rahmen, kein Verlauf
export const btnGhost: CSSProperties = {
  display: 'block', textAlign: 'center', background: 'transparent', color: SUB,
  border: `1px solid ${CELL}`, borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
// Gefährlicher Button (Löschen bestätigen)
export const btnDanger: CSSProperties = {
  display: 'block', textAlign: 'center', background: DANGER, color: '#fff',
  border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
}
// Button-Hintergrund-Helper für beliebige Flächenfarbe (z.B. innerhalb CELL)
export const gradOutlineOn = (bg: string): CSSProperties => ({
  border: '1.5px solid transparent',
  background: `linear-gradient(${bg},${bg}) padding-box, ${GRAD} border-box`,
})

/* ---------- Formular ---------- */
export const label: CSSProperties = { fontSize: 11, fontWeight: 500, color: MUT, letterSpacing: '.04em', display: 'block', marginBottom: 8 }
export const input: CSSProperties = { width: '100%', background: INPUTBG, border: `1px solid ${CELL}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, color: W, outline: 'none', fontFamily: 'inherit' }

/* ---------- Badges ---------- */
// Level-Pille: gefüllter Pastell-Metall-Verlauf + dunkle Schrift (Bronze/Silber/Gold lesbar)
export const levelBadge = (level?: string | null): CSSProperties => ({
  fontSize: 10.5, fontWeight: 800, color: '#15110A', background: lvGrad(level),
  border: 'none', borderRadius: 999, padding: '3px 11px', display: 'inline-block', letterSpacing: '.02em',
})
// Neutrale Status-Pill (offen/läuft/beendet)
export const statusPill: CSSProperties = { fontSize: 10, fontWeight: 500, color: SUB, border: `1px solid ${SUB}`, borderRadius: 999, padding: '3px 10px', display: 'inline-block' }
