import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { startZeit, SINGLE_NIGHT_STORNO_STUNDEN } from "@/lib/opengames"

// Single-Night-Ticket stornieren. Gast per Token (aus der Bestätigungsmail) ODER
// eingeloggter Besitzer. Gratis-Storno bis 24 h vor dem Event. Der Platz wird
// sofort frei; die Rückerstattung löst das PPL-Team manuell in Stripe aus.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const { token, booking_id } = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  // Buchung per Token (Gast) ODER per id (eingeloggt) finden.
  let b: { id: string; user_id: string | null; payment_status: string; cancel_token: string | null; event_id: string } | null = null
  if (token) {
    const { data } = await admin.from("single_night_bookings")
      .select("id,user_id,payment_status,cancel_token,event_id").eq("cancel_token", token).maybeSingle()
    b = data
  } else if (booking_id) {
    const { data } = await admin.from("single_night_bookings")
      .select("id,user_id,payment_status,cancel_token,event_id").eq("id", booking_id).maybeSingle()
    b = data
  }
  if (!b) return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 })

  // Berechtigung: gültiger Token ODER eingeloggter Besitzer.
  let allowed = !!(token && b.cancel_token && token === b.cancel_token)
  if (!allowed) {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user && b.user_id === user.id) allowed = true
  }
  if (!allowed) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  if (!["paid", "reserved"].includes(b.payment_status))
    return NextResponse.json({ error: "Dieses Ticket kann nicht storniert werden" }, { status: 400 })

  // Storno-Frist: bis 24 h vor Event-Start.
  const { data: ev } = await admin.from("open_games").select("date,start_hour").eq("id", b.event_id).maybeSingle()
  if (ev) {
    const frist = startZeit(ev).getTime() - SINGLE_NIGHT_STORNO_STUNDEN * 3600 * 1000
    if (Date.now() > frist)
      return NextResponse.json({ error: `Storno nur bis ${SINGLE_NIGHT_STORNO_STUNDEN} h vor dem Event möglich.` }, { status: 400 })
  }

  const { data: upd } = await admin.from("single_night_bookings")
    .update({ payment_status: "cancelled", cancelled_at: new Date().toISOString(), reserved_until: null })
    .eq("id", b.id).in("payment_status", ["paid", "reserved"]).select("id").maybeSingle()
  if (!upd) return NextResponse.json({ error: "Bereits verarbeitet" }, { status: 409 })

  return NextResponse.json({ ok: true, refundHint: "Dein Ticket ist storniert. Die Rückerstattung wird manuell bearbeitet." })
}
