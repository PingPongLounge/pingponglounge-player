import type { SupabaseClient } from "@supabase/supabase-js"

// ─── TURNIER-LOGIK (zentral, geteilt von Player + Webseite) ───────────────────
// Ein Turnier, eine Datenbank, eine Teilnehmerliste, zwei Anmeldewege.
// Diese Datei kapselt die Regeln, damit sie NICHT in jeder Route neu (und
// womöglich unterschiedlich) implementiert werden.

export const RESERVE_MINUTES = 20   // so lange ist ein Platz bei Online-Zahlung reserviert

// ─── SELBSTEINSCHÄTZUNG DER GÄSTE ────────────────────────────────────────────
// Gäste (ohne Player-Konto) wählen eine verständliche Kategorie. Das ist KEIN
// echtes Elo. Der interne Näherungswert (seedElo) dient nur der Setzliste und
// wird dem Nutzer NIE als offizielles Elo angezeigt. Die Zuordnung ist hier
// konfigurierbar an EINER Stelle.
export const SELF_RATINGS = [
  { key: "anfaenger",       label: "Anfänger",       desc: "Wenig Spielerfahrung, selten gespielt.",                         seedElo: 900  },
  { key: "freizeit",        label: "Freizeitspieler", desc: "Spielt gelegentlich oder regelmässig, ohne Wettkampferfahrung.", seedElo: 1050 },
  { key: "fortgeschritten", label: "Fortgeschritten", desc: "Sichere Grundschläge, längere Ballwechsel.",                     seedElo: 1250 },
  { key: "verein",          label: "Vereinsspieler",  desc: "Spielt oder spielte im Verein.",                                 seedElo: 1450 },
  { key: "leistung",        label: "Leistungsstark",  desc: "Hohes Vereins- oder Turnierniveau.",                             seedElo: 1650 },
] as const
export type SelfRatingKey = (typeof SELF_RATINGS)[number]["key"]

export function selfRatingElo(key: string | null | undefined): number | null {
  return SELF_RATINGS.find(r => r.key === key)?.seedElo ?? null
}
export function selfRatingLabel(key: string | null | undefined): string | null {
  return SELF_RATINGS.find(r => r.key === key)?.label ?? null
}

// ─── SETZWERT (Seeding) ──────────────────────────────────────────────────────
// Priorität exakt nach Briefing:
//   1. offizielles Player-Elo   2. Player-Level → grober Elo   3. Gast-Selbsteinschätzung
//   4. nicht eingestuft (null)
// Eine manuelle Einstufung des Veranstalters wird SEPARAT gespeichert
// (manual_rank) und überschreibt die Originaldaten nicht.
const LEVEL_ELO: Record<string, number> = { "1": 950, "2": 1050, "3": 1150, "4": 1250, "5": 1350, "6": 1450, "7": 1600 }
export function seedWert(reg: {
  reg_type: string; elo_at_signup?: number | null; level_at_signup?: string | null; self_rating?: string | null
}): number | null {
  if (reg.reg_type === "player") {
    if (typeof reg.elo_at_signup === "number") return reg.elo_at_signup
    if (reg.level_at_signup && LEVEL_ELO[reg.level_at_signup]) return LEVEL_ELO[reg.level_at_signup]
    return null
  }
  return selfRatingElo(reg.self_rating)
}

// ─── KAPAZITÄT & WARTELISTE ──────────────────────────────────────────────────
// EIN Kontingent für beide Plattformen — keine getrennten Töpfe für Player und
// Webseite. Aktive, nicht-Warteliste-Anmeldungen zählen gegen max_players.
// Reservierte (noch nicht bezahlte) Plätze zählen mit, solange die Reservierung
// nicht abgelaufen ist — sonst könnte man ein Turnier durch offene Checkouts
// blockieren.
export type Belegung = { max: number; belegt: number; frei: number; voll: boolean }

export async function belegung(admin: SupabaseClient, tournamentId: string, maxPlayers: number): Promise<Belegung> {
  const jetzt = new Date().toISOString()
  const { data } = await admin
    .from("tournament_registrations")
    .select("id,payment_status,reserved_until,waitlist")
    .eq("tournament_id", tournamentId)
    .eq("status", "active")
    .eq("waitlist", false)
  const rows = data || []
  const belegt = rows.filter(r => {
    // bezahlt/gratis zählt immer; reserviert nur solange die Frist läuft
    if (["paid", "free"].includes(r.payment_status)) return true
    if (["reserved", "pending"].includes(r.payment_status) && r.reserved_until && r.reserved_until > jetzt) return true
    return false
  }).length
  const frei = Math.max(0, maxPlayers - belegt)
  return { max: maxPlayers, belegt, frei, voll: frei <= 0 }
}

/** Nächste Wartelistenposition (1-basiert). */
export async function naechsteWartelistenPos(admin: SupabaseClient, tournamentId: string): Promise<number> {
  const { count } = await admin
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "active")
    .eq("waitlist", true)
  return (count ?? 0) + 1
}

/**
 * Rückt nach, wenn ein Platz frei wird: die vorderste Warteliste-Anmeldung
 * wird zu einem regulären Platz. Gibt die nachgerückte Anmeldung zurück (für
 * eine spätere Benachrichtigung) oder null.
 */
export async function nachruecken(admin: SupabaseClient, tournamentId: string, maxPlayers: number): Promise<{ id: string; email: string | null; player_id: string | null; first_name: string | null } | null> {
  const b = await belegung(admin, tournamentId, maxPlayers)
  if (b.voll) return null
  const { data: naechster } = await admin
    .from("tournament_registrations")
    .select("id,email,player_id,first_name")
    .eq("tournament_id", tournamentId)
    .eq("status", "active")
    .eq("waitlist", true)
    .order("waitlist_pos", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!naechster) return null
  await admin.from("tournament_registrations")
    .update({ waitlist: false, waitlist_pos: null })
    .eq("id", naechster.id)
  return naechster
}

/**
 * Setzt abgelaufene, unbezahlte Reservierungen zurück auf 'none'. Reine Hygiene:
 * die Belegung zählt eine abgelaufene Reservierung ohnehin nicht mehr mit (siehe
 * `belegung`), der Platz ist also sofort wieder frei. Diese Funktion räumt nur
 * die Status-Spalte auf, falls Stripes 'expired'-Event ausbleibt.
 */
export async function releaseStaleReservations(admin: SupabaseClient): Promise<number> {
  const jetzt = new Date().toISOString()
  const { data } = await admin.from("tournament_registrations")
    .update({ payment_status: "none", reserved_until: null, stripe_session_id: null })
    .in("payment_status", ["reserved", "pending"])
    .lt("reserved_until", jetzt)
    .select("id")
  return (data || []).length
}

// ─── ABGELEITETER TURNIERSTATUS ──────────────────────────────────────────────
// Was auf beiden Plattformen angezeigt wird. Der gespeicherte Status hat
// Vorrang für die Endzustände; „voll/Warteliste" ergibt sich aus der Belegung.
export function anzeigeStatus(t: { status: string; registration_deadline?: string | null }, b: Belegung): string {
  if (["draft", "cancelled", "running", "finished"].includes(t.status)) return t.status
  if (t.registration_deadline && t.registration_deadline < new Date().toISOString()) return "registration_closed"
  return b.voll ? "waitlist" : "registration_open"
}
