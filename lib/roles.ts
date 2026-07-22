import type { SupabaseClient } from "@supabase/supabase-js"
import { STAFF_EMAILS } from "@/lib/staff"

// ─── ROLLEN & STANDORT-RECHTE ────────────────────────────────────────────────
// Drei Ebenen, bewusst einfach gehalten:
//
//   1. Zentrale Administration  — darf ALLES, für alle Standorte.
//      Quelle: profiles.is_admin = true ODER E-Mail in STAFF_EMAILS.
//   2. Standortmanager / Franchise-Partner — darf nur SEINE Standorte.
//      Quelle: eine Zeile in location_staff (location_id, user_id).
//   3. Alle anderen — dürfen nichts verwalten.
//
// Vorher gab es drei getrennte Admin-Systeme (E-Mail-Whitelist, is_admin, PIN).
// Diese Datei ist die EINE Stelle, an der Turnier-Rechte entschieden werden.

export type Rolle = "central" | "manager" | "none"

export type Rechte = {
  role: Rolle
  isCentral: boolean
  /** Standort-IDs, die dieser Nutzer verwalten darf. Bei central: alle (leer = „alle"). */
  locationIds: string[]
}

/** Ermittelt die Rechte des eingeloggten Nutzers. `admin` = Service-Role-Client. */
export async function getRechte(admin: SupabaseClient, userId: string, email?: string | null): Promise<Rechte> {
  const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle()
  const central = prof?.is_admin === true || (!!email && STAFF_EMAILS.includes(email))
  if (central) return { role: "central", isCentral: true, locationIds: [] }

  const { data: staff } = await admin.from("location_staff").select("location_id").eq("user_id", userId)
  const ids = (staff || []).map(s => s.location_id as string)
  if (ids.length > 0) return { role: "manager", isCentral: false, locationIds: ids }

  return { role: "none", isCentral: false, locationIds: [] }
}

/** Darf dieser Nutzer ein Turnier an diesem Standort anlegen/verwalten? */
export function darfStandort(rechte: Rechte, locationId: string | null | undefined): boolean {
  if (rechte.isCentral) return true
  if (!locationId) return false          // Standortmanager brauchen einen Standort
  return rechte.locationIds.includes(locationId)
}

/** Darf dieser Nutzer überhaupt Turniere verwalten (Admin-Bereich sehen)? */
export function darfVerwalten(rechte: Rechte): boolean {
  return rechte.role !== "none"
}
