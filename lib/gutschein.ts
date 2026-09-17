import type { SupabaseClient } from "@supabase/supabase-js"

/* ── GUTSCHEINE FÜR EVENTS ───────────────────────────────────────────────────
   Die EINZIGE Stelle, an der ein Rabatt entsteht. Kein Checkout rechnet selbst,
   der Browser schon gar nicht — er schickt nur den Code mit.

   Datenbasis ist die vorhandene Tabelle discount_codes (gehört dem Webshop,
   Migration 0009 im Webseiten-Repo). Sie hat dafür drei Spalten bekommen:
   scope, location_name, event_id. Shop-Codes tragen scope = {shop} und bleiben
   unberührt — eine Event-Route akzeptiert nur Codes, deren scope die Eventart
   enthält.

   Die eigentliche Prüfung läuft in der Datenbank (gutschein_reservieren), weil
   nur dort das Kontingent verlässlich zu halten ist: die Funktion sperrt die
   Codezeile, bevor sie zählt. Zwei Personen mit dem letzten freien Platz eines
   Codes würden sonst beide "noch frei" lesen.                                */

export type Eventart = "tournament" | "open_game" | "single_night"

/** Die einzigen erlaubten Stufen. */
export const STUFEN = [20, 30, 50, 100] as const
export type Stufe = (typeof STUFEN)[number]

/** Wie lange ein Gutschein während einer laufenden Zahlung gehalten wird —
 *  dieselbe Frist wie der Sitzplatz selbst. */
export const GUTSCHEIN_MINUTEN = 30

/** Welche Tabelle die Anmeldung trägt. Teil des Schlüssels jeder Einlösung. */
export const REF_TABELLE: Record<Eventart, string> = {
  tournament: "tournament_registrations",
  open_game: "open_game_players",
  single_night: "single_night_bookings",
}

const GRUENDE: Record<string, string> = {
  unbekannt: "Diesen Gutscheincode gibt es nicht.",
  inaktiv: "Dieser Gutscheincode ist nicht mehr aktiv.",
  abgelaufen: "Dieser Gutscheincode ist abgelaufen.",
  falsche_art: "Dieser Gutscheincode gilt nicht für diese Veranstaltung.",
  anderes_event: "Dieser Gutscheincode gilt für eine andere Veranstaltung.",
  anderer_standort: "Dieser Gutscheincode gilt an einem anderen Standort.",
  ungueltige_stufe: "Dieser Gutscheincode ist nicht gültig.",
  kontingent: "Dieser Gutscheincode ist bereits vollständig eingelöst.",
}

export type GutscheinOk = { ok: true; prozent: Stufe; preisVorher: number; preisNachher: number; code: string }
export type GutscheinFehler = { ok: false; grund: string; meldung: string }
export type GutscheinErgebnis = GutscheinOk | GutscheinFehler

/** Rabatt rechnen — eine Stelle, damit Vorschau und Checkout nie auseinanderlaufen. */
export function rabattiere(preisChf: number, prozent: number): number {
  return Math.round(preisChf * (100 - prozent)) / 100
}

/** Code normalisieren: Grossbuchstaben, ohne Rand, höchstens 40 Zeichen. */
export function normCode(roh: unknown): string {
  return String(roh ?? "").trim().toUpperCase().slice(0, 40)
}

type ReservierenArgs = {
  code: string
  art: Eventart
  refId: string
  preisChf: number
  eventId?: string | null
  standort?: string | null
  /** true = direkt bestätigt statt reserviert. Nur für 100 %, wo kein Stripe läuft. */
  sofort?: boolean
}

/**
 * Prüft den Code UND hält ihn fest. Beides in einem Schritt, weil zwischen
 * "ist noch frei" und "gehört jetzt mir" sonst ein Fenster liegt.
 * Schlägt die Prüfung fehl, wurde nichts geschrieben.
 */
export async function reserviereGutschein(
  admin: SupabaseClient,
  { code, art, refId, preisChf, eventId = null, standort = null, sofort = false }: ReservierenArgs,
): Promise<GutscheinErgebnis> {
  const c = normCode(code)
  if (!c) return { ok: false, grund: "unbekannt", meldung: GRUENDE.unbekannt }

  const { data, error } = await admin.rpc("gutschein_reservieren", {
    p_code: c,
    p_art: art,
    p_ref_table: REF_TABELLE[art],
    p_ref_id: refId,
    p_preis: preisChf,
    p_event_id: eventId,
    p_standort: standort,
    p_minuten: GUTSCHEIN_MINUTEN,
    p_sofort: sofort,
  })

  if (error) {
    console.error("[gutschein] reservieren fehlgeschlagen:", error.message)
    return { ok: false, grund: "fehler", meldung: "Gutschein konnte gerade nicht geprüft werden." }
  }
  const r = (data ?? {}) as { ok?: boolean; grund?: string; prozent?: number; preis_nachher?: number }
  if (!r.ok) {
    const grund = r.grund || "unbekannt"
    return { ok: false, grund, meldung: GRUENDE[grund] || GRUENDE.unbekannt }
  }
  return {
    ok: true,
    code: c,
    prozent: Number(r.prozent) as Stufe,
    preisVorher: Math.round(preisChf * 100) / 100,
    preisNachher: Number(r.preis_nachher),
  }
}

/** Nach erfolgter Zahlung (oder bei 100 % sofort): reserved → confirmed.
 *  Idempotent — eine Webhook-Wiederholung trifft keine Zeile mehr. */
export async function bestaetigeGutschein(admin: SupabaseClient, art: Eventart, refId: string): Promise<void> {
  const { error } = await admin.rpc("gutschein_bestaetigen", { p_ref_table: REF_TABELLE[art], p_ref_id: refId })
  if (error) console.error("[gutschein] bestaetigen fehlgeschlagen:", error.message)
}

/** Bei Abbruch, abgelaufener Reservierung und echter Stornierung: Kontingent zurück. */
export async function gibGutscheinFrei(admin: SupabaseClient, art: Eventart, refId: string): Promise<void> {
  const { error } = await admin.rpc("gutschein_freigeben", { p_ref_table: REF_TABELLE[art], p_ref_id: refId })
  if (error) console.error("[gutschein] freigeben fehlgeschlagen:", error.message)
}

/** Nur zum Anzeigen — reserviert nichts. Für den Knopf "ANWENDEN".
 *  Die verbindliche Prüfung passiert im Checkout ein zweites Mal. */
export async function vorschau(
  admin: SupabaseClient,
  { code, art, preisChf, eventId = null, standort = null }:
    { code: string; art: Eventart; preisChf: number; eventId?: string | null; standort?: string | null },
): Promise<GutscheinErgebnis> {
  const c = normCode(code)
  const { data } = await admin
    .from("discount_codes")
    .select("code,kind,value,scope,is_active,expires_at,max_uses,location_name,event_id")
    .eq("code", c)
    .maybeSingle()

  const raus = (grund: string): GutscheinFehler => ({ ok: false, grund, meldung: GRUENDE[grund] || GRUENDE.unbekannt })
  if (!data) return raus("unbekannt")
  if (!data.is_active) return raus("inaktiv")
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return raus("abgelaufen")
  if (!((data.scope as string[] | null) ?? []).includes(art)) return raus("falsche_art")
  if (data.event_id && data.event_id !== eventId) return raus("anderes_event")
  if (data.location_name && (standort ?? "").toLowerCase() !== String(data.location_name).toLowerCase()) return raus("anderer_standort")
  if (data.kind !== "percent" || !STUFEN.includes(Number(data.value) as Stufe)) return raus("ungueltige_stufe")

  if (data.max_uses != null) {
    const jetzt = new Date().toISOString()
    const { data: rows } = await admin
      .from("voucher_redemptions")
      .select("status,reserved_until")
      .eq("code", c)
    const benutzt = (rows || []).filter(r =>
      r.status === "confirmed" || (r.status === "reserved" && r.reserved_until && r.reserved_until > jetzt)
    ).length
    if (benutzt >= Number(data.max_uses)) return raus("kontingent")
  }

  const prozent = Number(data.value) as Stufe
  return { ok: true, code: c, prozent, preisVorher: Math.round(preisChf * 100) / 100, preisNachher: rabattiere(preisChf, prozent) }
}
