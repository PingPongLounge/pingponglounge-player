// =====================================================================
// PLANYO — Tischbuchung (Single Source of Truth)
// =====================================================================
// Kalender/Site-ID und Ressourcen-IDs stammen aus dem bestehenden
// PPL-Planyo-Setup (öffentlich in den booking.php-Links). KEIN API-Key hier —
// der lebt ausschliesslich als Umgebungsvariable PLANYO_API_KEY (Server).
//
// Zwei Wege:
//  A) Weiterleitung: planyoBookingUrl() → Gastgeber bucht selbst in Planyo.
//     Funktioniert für ALLE Standorte (Kalender zeigt alle Ressourcen).
//  B) Auto-Reservierung: planyoReserve() → REST make_reservation. Braucht
//     PLANYO_API_KEY (env) + eine Ressourcen-ID für den Standort. Erst aktiv,
//     wenn beides vorhanden ist — sonst signalisiert es "nicht konfiguriert".
// =====================================================================

export const PLANYO_CALENDAR = "47844"
export const PLANYO_BASE = "https://www.planyo.com"
export const PLANYO_REST = "https://www.planyo.com/rest/"

// Standort (wie in theme.ts CITIES) → Planyo-Ressourcen-ID.
// Glattbrugg & St. Gallen fehlen noch in Planyo → sobald angelegt hier ergänzen.
export const PLANYO_RESOURCE: Record<string, string> = {
  Oerlikon: "142166",
  Langstrasse: "206740",
  Basel: "251796",
  Luzern: "229327", // Standort Kriens/Luzern
  // Glattbrugg: "…",
  // "St. Gallen": "…",
}

/** Buchungs-URL für den Gastgeber (Option A). Wenn die Ressource bekannt ist,
 *  wird sie vorausgewählt; sonst der ganze Kalender. */
export function planyoBookingUrl(locationName?: string | null): string {
  const rid = locationName ? PLANYO_RESOURCE[locationName] : undefined
  const q = rid
    ? `calendar=${PLANYO_CALENDAR}&resource_id=${rid}&mode=1`
    : `calendar=${PLANYO_CALENDAR}&mode=1`
  return `${PLANYO_BASE}/booking.php?${q}`
}

/** Ist die Auto-Reservierung (Option B) für diesen Standort einsatzbereit? */
export function planyoReserveConfigured(locationName: string): boolean {
  return !!process.env.PLANYO_API_KEY && !!PLANYO_RESOURCE[locationName]
}

/** Unix-Sekunden (UTC) aus 'YYYY-MM-DD' + Stunde — Planyo erwartet Sekunden. */
export function planyoUnix(dateStr: string, hour: number): number {
  return Math.floor(new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00`).getTime() / 1000)
}

export type PlanyoReserveResult =
  | { ok: true; reservationId: string }
  | { ok: false; reason: "not_configured" | "unavailable" | "error"; message?: string }

/** Auto-Reservierung über die Planyo REST-API (Option B).
 *  Nutzt PLANYO_API_KEY aus der Umgebung — nie hartkodiert. */
export async function planyoReserve(input: {
  locationName: string
  dateStr: string
  startHour: number
  durationMinutes: number
  firstName: string
  lastName?: string
  email: string
  phone?: string
  persons?: number
  comments?: string
}): Promise<PlanyoReserveResult> {
  const apiKey = process.env.PLANYO_API_KEY
  const resourceId = PLANYO_RESOURCE[input.locationName]
  if (!apiKey || !resourceId) return { ok: false, reason: "not_configured" }

  const start = planyoUnix(input.dateStr, input.startHour)
  const end = start + input.durationMinutes * 60
  const params = new URLSearchParams({
    method: "make_reservation",
    api_key: apiKey,
    resource_id: resourceId,
    start_time: String(start),
    end_time: String(end),
    first_name: input.firstName || "Player",
    last_name: input.lastName || ".",
    email: input.email,
    mobile_phone: input.phone || "",
    quantity: "1",
    prop_persons: String(input.persons ?? 2),
    comments: input.comments || "Player App — Open Game",
    format: "json",
  })

  try {
    const r = await fetch(`${PLANYO_REST}?${params.toString()}`, { method: "GET" })
    const text = await r.text()
    const d = JSON.parse(text.replace(/^﻿/, "")) as { response_code?: number; response_message?: string; data?: { reservation_id?: string | number } }
    if (d.response_code === 0 && d.data?.reservation_id != null) {
      return { ok: true, reservationId: String(d.data.reservation_id) }
    }
    // Planyo meldet Nicht-Verfügbarkeit ebenfalls über response_code != 0
    return { ok: false, reason: "unavailable", message: d.response_message || "Kein Tisch frei" }
  } catch (e) {
    // Rohe Fehlermeldung NICHT nach aussen geben — sie könnte die Request-URL
    // inkl. api_key enthalten. Nur serverseitig loggen, generisch antworten.
    console.error("planyoReserve fehlgeschlagen:", e instanceof Error ? e.message : e)
    return { ok: false, reason: "error", message: "Planyo nicht erreichbar" }
  }
}
