import crypto from "crypto"

// Signierte Einmal-Links für E-Mails ("Ergebnis bestätigen" ohne Login).
// Der Token bindet Match + Spieler + Aktion aneinander und ist ohne den
// Server-Secret nicht fälschbar. Er erlaubt genau eine Aktion, sonst nichts.
function secret(): string {
  const s = process.env.EMAIL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("Kein Secret für E-Mail-Token gesetzt")
  return s
}

export function signAction(action: string, matchId: string, playerId: string): string {
  return crypto.createHmac("sha256", secret()).update(`${action}:${matchId}:${playerId}`).digest("base64url")
}

export function verifyAction(action: string, matchId: string, playerId: string, token: string): boolean {
  try {
    const expected = signAction(action, matchId, playerId)
    const a = Buffer.from(expected)
    const b = Buffer.from(token)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
