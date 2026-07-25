import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CAMP_SESSIONS, campSessionStart, CAMP_STORNO_TAGE } from "@/lib/camp"

// Trainingscamp-Buchung stornieren. Eingeloggt (eigene Buchung) ODER Gast per
// Token aus der Bestätigungsmail. Gratis-Storno bis 1 Woche vor der frühesten
// gebuchten Einheit — danach nicht mehr. Der Platz wird sofort frei; die
// Rückerstattung löst das PPL-Team manuell in Stripe aus (keine automatische
// Geldbewegung).
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const { booking_id, token } = await req.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: "booking_id fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const { data: b } = await admin
    .from("camp_bookings")
    .select("id,user_id,session_ids,payment_status,cancel_token")
    .eq("id", booking_id).maybeSingle()
  if (!b) return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 })

  // Berechtigung: Token (Gast) ODER eingeloggter Besitzer.
  let allowed = false
  if (token && b.cancel_token && token === b.cancel_token) allowed = true
  if (!allowed) {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user && b.user_id === user.id) allowed = true
  }
  if (!allowed) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  if (!["paid", "reserved"].includes(b.payment_status))
    return NextResponse.json({ error: "Diese Buchung kann nicht storniert werden" }, { status: 400 })

  // Storno-Frist: bis CAMP_STORNO_TAGE vor der frühesten gebuchten Einheit.
  const starts: number[] = []
  for (const id of (b.session_ids || []) as string[]) {
    const s = CAMP_SESSIONS.find(x => x.id === id)
    if (s) starts.push(campSessionStart(s).getTime())
  }
  const earliest = starts.length ? Math.min(...starts) : 0
  const frist = earliest - CAMP_STORNO_TAGE * 24 * 3600 * 1000
  if (earliest && Date.now() > frist)
    return NextResponse.json({ error: `Storno nur bis ${CAMP_STORNO_TAGE} Tage vor Camp-Start möglich.` }, { status: 400 })

  const { data: upd } = await admin.from("camp_bookings")
    .update({ payment_status: "cancelled", cancelled_at: new Date().toISOString(), reserved_until: null })
    .eq("id", booking_id).in("payment_status", ["paid", "reserved"]).select("id").maybeSingle()
  if (!upd) return NextResponse.json({ error: "Bereits verarbeitet" }, { status: 409 })

  return NextResponse.json({ ok: true, refundHint: "Der Platz ist frei. Die Rückerstattung wird manuell bearbeitet." })
}
