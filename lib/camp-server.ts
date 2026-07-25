import type { SupabaseClient } from "@supabase/supabase-js"
import { CAMP_MAX_PER_SESSION } from "./camp"

// Belegung je Session: zählt bezahlte Buchungen + noch gültige Reservierungen.
// Kein eigener Sitz-Datensatz pro Session — die Belegung wird aus camp_bookings
// (session_ids-Array) abgeleitet. Reservierungen mit abgelaufener Frist zählen
// nicht mehr, damit ein abgebrochener Checkout keinen Platz dauerhaft blockiert.
export async function campBelegung(admin: SupabaseClient): Promise<Record<string, number>> {
  const nowIso = new Date().toISOString()
  const { data } = await admin
    .from("camp_bookings")
    .select("session_ids,payment_status,reserved_until")
    .in("payment_status", ["paid", "reserved"])

  const counts: Record<string, number> = {}
  for (const b of data || []) {
    if (b.payment_status === "reserved" && (!b.reserved_until || b.reserved_until < nowIso)) continue
    for (const sid of (b.session_ids || [])) counts[sid] = (counts[sid] || 0) + 1
  }
  return counts
}

export function campFrei(counts: Record<string, number>, sid: string): number {
  return Math.max(0, CAMP_MAX_PER_SESSION - (counts[sid] || 0))
}

/** Gibt die Sessions zurück, die (nach aktueller Belegung) voll sind. */
export function campVolleSessions(counts: Record<string, number>, sessionIds: string[]): string[] {
  return sessionIds.filter(sid => campFrei(counts, sid) <= 0)
}
