import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * DIE OFFIZIELLEN OPEN GAMES DER LOUNGE
 *
 * Hier drin steht alles, was sich ändern kann: Standorte, Wochentage, Uhrzeit,
 * Preis, Gruppengrösse. Wer etwas anpassen will, ändert diese Datei — nicht den
 * Code drumherum.
 *
 * Jeder Abend hat ZWEI Gruppen à 6 Plätzen, an getrennten Tischen:
 * Einstieg (Level 1–3) und Pro (Level 4–7). So bleibt es für beide spannend —
 * ein Anfänger gegen Level 7 macht keinem Spass.
 */

export const OG_PREIS_CHF = 10          // pro Person
export const OG_DAUER_MIN = 240         // 4 Stunden
export const OG_PLAETZE_PRO_GRUPPE = 6
export const OG_STORNO_STUNDEN = 24     // bis dahin Absage mit Rückerstattung
export const OG_VORLAUF_TAGE = 21       // so weit im Voraus werden Termine angelegt

export type OgGruppe = { key: "einstieg" | "pro"; name: string; level: string }

export const OG_GRUPPEN: OgGruppe[] = [
  { key: "einstieg", name: "Einstieg", level: "1-3" },
  { key: "pro",      name: "Pro",      level: "4-7" },
]

export type OgStandort = {
  id: string
  name: string
  /** Wochentage: 0 = Sonntag, 1 = Montag … 6 = Samstag */
  tage: number[]
  /** Startzeit in Stunden (19 = 19:00). Ende ergibt sich aus OG_DAUER_MIN. */
  start: number
}

export const OG_STANDORTE: OgStandort[] = [
  { id: "glattbrugg", name: "Glattbrugg", tage: [4, 5, 6],    start: 19 }, // Do, Fr, Sa
  { id: "stgallen",   name: "St. Gallen", tage: [1, 3, 5, 6], start: 19 }, // Mo, Mi, Fr, Sa
]

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
    const wochentag = tag.getDay()

    for (const ort of OG_STANDORTE) {
      if (!ort.tage.includes(wochentag)) continue

      for (const g of OG_GRUPPEN) {
        neue.push({
          series_key: `${ort.id}-${iso(tag)}-${g.key}`,
          is_official: true,
          created_by: null,
          location_id: ort.id,
          location_name: ort.name,
          date: iso(tag),
          start_hour: ort.start,
          end_hour: ort.start + Math.round(OG_DAUER_MIN / 60),
          duration_minutes: OG_DAUER_MIN,
          max_players: OG_PLAETZE_PRO_GRUPPE,
          current_players: 0,
          price_per_player: OG_PREIS_CHF,
          level: g.level,
          status: "open",
          notes: `${g.name} · Level ${g.level}`,
        })
      }
    }
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
