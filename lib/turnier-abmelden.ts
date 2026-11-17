import { signAction, verifyAction } from "@/lib/token"

/* Abmelden per Link aus der Bestaetigungsmail (Oliver, 17.11.2026: «abmelden
   muss automatisch laufen mit Linkklick im Mail»).
   Der Link traegt Anmeldung, Turnier und eine HMAC-Signatur. Ohne den
   Server-Secret ist er nicht faelschbar; er erlaubt genau diese eine Abmeldung.
   Der Klick oeffnet eine Seite mit Knopf — Mailprogramme, die Links vorab
   aufrufen, melden so niemanden versehentlich ab. */

export const ABMELDE_FRIST_STUNDEN = 24
const AKTION = "turnier_abmelden"
const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://playerliga.ch"

export function abmeldeLink(regId: string, turnierId: string): string {
  const k = signAction(AKTION, regId, turnierId)
  return `${BASE}/turniere/abmelden?r=${encodeURIComponent(regId)}&t=${encodeURIComponent(turnierId)}&k=${encodeURIComponent(k)}`
}

export function pruefeAbmeldeLink(regId: string, turnierId: string, k: string): boolean {
  return !!(regId && turnierId && k) && verifyAction(AKTION, regId, turnierId, k)
}

/** Turnierbeginn als Zeitpunkt, Datum und Uhrzeit gelten in Zuerich. */
export function turnierStart(datum: string, startZeit?: string | null): Date {
  const hhmm = (startZeit || "00:00").slice(0, 5)
  const alsUtc = new Date(`${datum}T${hhmm}:00Z`)
  const zh = new Date(alsUtc.toLocaleString("en-US", { timeZone: "Europe/Zurich" }))
  const utc = new Date(alsUtc.toLocaleString("en-US", { timeZone: "UTC" }))
  return new Date(alsUtc.getTime() - (zh.getTime() - utc.getTime()))
}
