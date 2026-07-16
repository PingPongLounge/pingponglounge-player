import crypto from "crypto"

// Deterministische UUID aus der Stripe-Session-ID. ref_id ist eine uuid-Spalte,
// Stripe-IDs sind es nicht — so wird die Gutschrift (und ihr Storno) idempotent:
// dieselbe Session ergibt immer dieselbe ref_id.
export function sessionUuid(sessionId: string): string {
  const h = crypto.createHash("md5").update(sessionId).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}
