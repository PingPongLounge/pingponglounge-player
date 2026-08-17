import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * DIE OFFIZIELLEN OPEN GAMES DER LOUNGE
 *
 * Hier drin steht alles, was sich ändern kann: Standorte, Wochentage, Uhrzeit,
 * Preis, Gruppen und Plätze. Wer etwas anpassen will, ändert diese Datei — nicht
 * den Code drumherum.
 *
 * NEU: Jeder Abend ist einzeln konfigurierbar (Slot je Wochentag) — verschiedene
 * Zeiten, Gruppen und Platzzahlen pro Tag. Die Zahl der zu sperrenden Tische ist
 * eine Betriebs-Aufgabe (physisch/Eversports): 2 Spieler pro Tisch, d.h. 8 Plätze
 * = 4 Tische, 12 Plätze = 6 Tische.
 */

export const OG_PREIS_CHF = 10          // pro Person
export const OG_STORNO_STUNDEN = 24     // bis dahin Absage mit Rückerstattung
export const OG_VORLAUF_TAGE = 21       // so weit im Voraus werden Termine angelegt
export const OG_BIS_DATUM = "2026-10-31" // testweise bis Ende Oktober — danach keine neuen

export const OG_TRAINING_PREIS_CHF = 29 // geführtes Training, pro Person

/** Geführte Trainings (mit Trainer). Level offen, feste Platzzahl, eigener Preis. */
export type OgTraining = { location_id: string; location_name: string; day: number; start: number; end: number; dauerMin: number; plaetze: number }
export const OG_TRAININGS: OgTraining[] = [
  // Glattbrugg, jeden Donnerstag 19:00–20:30, 10 Plätze, alle Level
  { location_id: "glattbrugg", location_name: "Glattbrugg", day: 4, start: 19, end: 20, dauerMin: 90, plaetze: 10 },
]

// =====================================================================
// SINGLE NIGHT — geselliger Ticket-Abend (Rundlauf · Doppel · Speeddating)
// =====================================================================
// PPL-offiziell, bezahltes Ticket, feste Termine (von PPL gepflegt).
export const SINGLE_NIGHT_PLAETZE = 32          // Gesamtkapazität (Personen)
export const SINGLE_NIGHT_MIN = 16              // Durchführung erst ab so vielen Personen
export const SINGLE_NIGHT_STORNO_STUNDEN = 24   // Gratis-Storno bis 24 h vorher → Geld zurück
export const SINGLE_NIGHT_LOCATION = { id: "glattbrugg", name: "Glattbrugg" }
export const SINGLE_NIGHT_START = 19            // 19:00
export const SINGLE_NIGHT_END = 22

// Termine (YYYY-MM-DD) — hier pflegt PPL die nächsten Single Nights.
export const SINGLE_NIGHT_DATES: string[] = ["2026-08-26"]

// Ticket-Typen. persons = wie viele Personen ein Ticket einlässt.
export type SnTicket = { key: string; label: string; price: number; persons: number; hint?: string }
export const SINGLE_NIGHT_TICKETS: SnTicket[] = [
  { key: "herren", label: "Herren", price: 29, persons: 1 },
  { key: "damen2for1", label: "Damen · 2 für 1", price: 29, persons: 2, hint: "Ein Ticket für zwei" },
]
export function snTicket(key: string): SnTicket | undefined {
  return SINGLE_NIGHT_TICKETS.find(t => t.key === key)
}

// Ablauf (für die Anzeige auf /single-night).
export const SINGLE_NIGHT_ABLAUF: string[] = [
  "19:00 · Einlass & Ticket-Check an der Bar, Garderobe",
  "Welcome Drink inklusive (Prosecco, Bier oder Soft)",
  "Begrüssung durch den Host · Bändchen (Grün / Blau / Rot)",
  "3 Stationen à 30 Min — im Wechsel",
  "Danach: DJ & offener Ausklang",
]
// Rahmenbedingungen (Anzeige + Storno-Logik).
export const SINGLE_NIGHT_INFO = {
  minHinweis: "Durchführung ab 16 Personen.",
  stornoHinweis: "Absage bis 24 h vorher — Geld zurück.",
}
// Rotation der Bändchen-Farben durch die drei Stationen.
export const SINGLE_NIGHT_STATIONS = ["Rundlauf", "Doppelturnier (Partnerwechsel)", "Speeddating"]
export const SINGLE_NIGHT_ROTATION: Array<{ farbe: string; hex: string; plan: string[] }> = [
  { farbe: "Grün", hex: "#24E07C", plan: ["Rundlauf", "Doppel", "Speeddating"] },
  { farbe: "Blau", hex: "#38BEB2", plan: ["Doppel", "Speeddating", "Rundlauf"] },
  { farbe: "Rot", hex: "#FF5A5A", plan: ["Speeddating", "Rundlauf", "Doppel"] },
]

/** Eine Gruppe an einem Abend: Stärkeklasse + eigene Platzzahl. */
export type OgGruppeDef = { key: "einstieg" | "pro"; name: string; level: "1-3" | "4-7"; plaetze: number }
const EINSTIEG = (plaetze: number, name = "Einstieg"): OgGruppeDef => ({ key: "einstieg", name, level: "1-3", plaetze })
const PRO = (plaetze: number, name = "Pro"): OgGruppeDef => ({ key: "pro", name, level: "4-7", plaetze })

/** Ein Abend: Wochentag, Start-/Endzeit (Stunden) und seine Gruppen. */
export type OgSlot = { day: number; start: number; end: number; gruppen: OgGruppeDef[] }
export type OgStandort = { id: string; name: string; slots: OgSlot[] }

export const OG_STANDORTE: OgStandort[] = [
  {
    id: "glattbrugg", name: "Glattbrugg", slots: [
      // Do 18–24: eine Gruppe Fortgeschritten & Pro (Level 4–7), 8 Plätze (4 Tische)
      { day: 4, start: 18, end: 24, gruppen: [PRO(8, "Fortgeschritten & Pro")] },
      // Sa 18–24: alle Level, je 6 (12 Plätze, 6 Tische)
      { day: 6, start: 18, end: 24, gruppen: [EINSTIEG(6), PRO(6)] },
    ],
  },
  {
    id: "stgallen", name: "St. Gallen", slots: [
      // Mo 18–22: Einsteiger, 6
      { day: 1, start: 18, end: 22, gruppen: [EINSTIEG(6)] },
      // Mi 18–22: Fortgeschritten (4–7), 6
      { day: 3, start: 18, end: 22, gruppen: [PRO(6, "Fortgeschritten")] },
      // Fr 18–22: Fortgeschritten (4–7), 6
      { day: 5, start: 18, end: 22, gruppen: [PRO(6, "Fortgeschritten")] },
    ],
  },
]

// BLACKOUT-TAGE: an diesen Tagen werden für den Standort KEINE Open Games
// angelegt (z.B. weil ein Turnier die Tische belegt). Format YYYY-MM-DD.
export const OG_BLACKOUT: Record<string, string[]> = {
  glattbrugg: ["2026-09-12"], // PPL Cup Glattbrugg
  stgallen: ["2026-09-26"],   // PPL Cup St. Gallen
}

// ZUTRITTS-QR pro Standort. Nur Glattbrugg hat eine verschlossene Tür, die den
// Eversports-QR liest — die anderen Standorte brauchen keinen Code (nur Stripe).
// Der QR gilt zeitgebunden (öffnet nur zu Open-Game-Zeiten) und wird NUR
// bezahlten Teilnehmern gezeigt. Bild liegt unter /public.
// Sobald der QR da ist: Datei als public/og-entry-glattbrugg.png ablegen.
// Schlüssel: "Standort|Wochentag" (0=So … 6=Sa) — der Eversports-QR gilt pro
// Slot, deshalb je Wochentag ein eigener. Nur eingetragene Tage zeigen einen QR.
export const OG_ENTRY_QR: Record<string, string> = {
  "Glattbrugg|4": "/og-entry-glattbrugg-do.png",  // Donnerstag (Open Game + Training)
  "Glattbrugg|6": "/og-entry-glattbrugg-sa.png",  // Samstag (Open Game)
}
export function entryQrFor(locationName: string, weekday: number): string | null {
  return OG_ENTRY_QR[`${locationName}|${weekday}`] ?? null
}
/** Wochentag (0–6) aus einem YYYY-MM-DD-Datum, ohne Zeitzonen-Verschiebung. */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDay()
}

/** Passt der Spieler in diese Gruppe? */
export function gruppeFuerLevel(level: string | number | null | undefined): "einstieg" | "pro" | null {
  const l = typeof level === "string" ? parseInt(level) : level
  if (!l || l < 1 || l > 7) return null
  return l >= 4 ? "pro" : "einstieg"
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Legt die Termine der nächsten Wochen an — idempotent.
 * Der series_key (Standort + Datum + Gruppe) ist eindeutig: läuft die Funktion
 * zehnmal, entstehen trotzdem keine Doppel-Termine.
 *
 * Wird täglich vom Cron aufgerufen, damit immer drei Wochen im Voraus buchbar sind.
 */
export async function ensureOpenGames(admin: SupabaseClient): Promise<number> {
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)

  const neue: Array<Record<string, unknown>> = []

  for (let i = 0; i < OG_VORLAUF_TAGE; i++) {
    const tag = new Date(heute)
    tag.setDate(heute.getDate() + i)
    const ds = iso(tag)
    if (ds > OG_BIS_DATUM) continue      // testweise bis Ende Oktober
    const wochentag = tag.getDay()

    for (const ort of OG_STANDORTE) {
      if (OG_BLACKOUT[ort.id]?.includes(ds)) continue   // Turniertag → kein Open Game
      for (const slot of ort.slots) {
        if (slot.day !== wochentag) continue
        const dauer = (slot.end - slot.start) * 60
        for (const g of slot.gruppen) {
          neue.push({
            series_key: `${ort.id}-${ds}-${g.key}`,
            is_official: true,
            kind: "open_game",
            created_by: null,
            location_id: ort.id,
            location_name: ort.name,
            date: ds,
            start_hour: slot.start,
            end_hour: slot.end,
            duration_minutes: dauer,
            max_players: g.plaetze,
            current_players: 0,
            price_per_player: OG_PREIS_CHF,
            level: g.level,
            status: "open",
            notes: `${g.name} · Level ${g.level}`,
          })
        }
      }
    }

    // Geführte Trainings — Level offen, eigener Preis, kind=training
    for (const t of OG_TRAININGS) {
      if (t.day !== wochentag) continue
      neue.push({
        series_key: `${t.location_id}-${ds}-training`,
        is_official: true,
        kind: "training",
        created_by: null,
        location_id: t.location_id,
        location_name: t.location_name,
        date: ds,
        start_hour: t.start,
        end_hour: t.end,
        duration_minutes: t.dauerMin,
        max_players: t.plaetze,
        current_players: 0,
        price_per_player: OG_TRAINING_PREIS_CHF,
        level: "alle",
        status: "open",
        notes: "Geführtes Training · alle Level",
      })
    }
  }

  // Single Nights (feste Termine) — offizielle Ticket-Events, kind=single_night.
  // Preis pro Person = 0, weil die Preise ticketbasiert im Checkout berechnet werden.
  const heuteIso = iso(heute)
  for (const ds of SINGLE_NIGHT_DATES) {
    if (ds < heuteIso || ds > OG_BIS_DATUM) continue
    neue.push({
      series_key: `singlenight-${ds}`,
      is_official: true,
      kind: "single_night",
      created_by: null,
      location_id: SINGLE_NIGHT_LOCATION.id,
      location_name: SINGLE_NIGHT_LOCATION.name,
      date: ds,
      start_hour: SINGLE_NIGHT_START,
      end_hour: SINGLE_NIGHT_END,
      duration_minutes: (SINGLE_NIGHT_END - SINGLE_NIGHT_START) * 60,
      max_players: SINGLE_NIGHT_PLAETZE,
      current_players: 0,
      price_per_player: 0,
      level: "alle",
      status: "open",
      notes: "Single Night",
    })
  }

  if (neue.length === 0) return 0

  // onConflict auf series_key: bereits angelegte Termine bleiben unangetastet,
  // damit Anmeldungen und Ergebnisse nicht überschrieben werden.
  const { error } = await admin
    .from("open_games")
    .upsert(neue, { onConflict: "series_key", ignoreDuplicates: true })

  if (error) {
    console.error("Open Games anlegen fehlgeschlagen:", error)
    return 0
  }
  return neue.length
}

/** Beginn eines Spiels als Zeitpunkt — für Storno-Frist und "ist es vorbei?". */
export function startZeit(game: { date: string; start_hour: number | null }): Date {
  return new Date(`${game.date}T${String(game.start_hour ?? 19).padStart(2, "0")}:00:00`)
}

/** Darf noch storniert werden (mit Geld zurück)? */
export function stornoMoeglich(game: { date: string; start_hour: number | null }): boolean {
  const frist = startZeit(game).getTime() - OG_STORNO_STUNDEN * 3600 * 1000
  return Date.now() < frist
}
