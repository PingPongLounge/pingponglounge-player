import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRechte, darfStandort } from "@/lib/roles"
import { nachruecken } from "@/lib/tournaments"
import { notify } from "@/lib/notify"
import { NextRequest, NextResponse } from "next/server"

// TEILNEHMER VERWALTEN (nur Veranstalter)
// PATCH: Status/Zahlung/Check-in/manuelle Einstufung/Notiz ändern.
// DELETE: Teilnehmer entfernen (Rückerstattung macht der Veranstalter separat in
//         Stripe — Geldbewegungen laufen nicht automatisch). Ein frei werdender
//         Platz lässt die Warteliste nachrücken.
//
// Die Originaldaten (self_rating, elo_at_signup …) werden NIE überschrieben;
// eine manuelle Einstufung landet ausschliesslich in manual_rank.
async function veranstalterCheck(admin: ReturnType<typeof createAdminClient>, regId: string, userId: string, email?: string | null) {
  const { data: reg } = await admin.from("tournament_registrations")
    .select("id,tournament_id,player_tournaments(location_id,max_players)")
    .eq("id", regId).maybeSingle()
  if (!reg) return { ok: false as const, status: 404, error: "Anmeldung nicht gefunden" }
  const loc = (reg.player_tournaments as { location_id?: string | null } | null)?.location_id
  const rechte = await getRechte(admin, userId, email)
  if (!darfStandort(rechte, loc)) return { ok: false as const, status: 403, error: "Keine Berechtigung" }
  return { ok: true as const, reg }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const regId = String(body.registration_id || "")
  if (!regId) return NextResponse.json({ error: "registration_id fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const check = await veranstalterCheck(admin, regId, user.id, user.email)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  // Nur erlaubte Felder — kein Überschreiben der Momentaufnahme.
  const patch: Record<string, unknown> = {}
  if (["none", "pending", "reserved", "paid", "failed", "cancelled", "refunded", "free"].includes(body.payment_status)) patch.payment_status = body.payment_status
  if (["active", "withdrawn", "no_show"].includes(body.status)) patch.status = body.status
  if (typeof body.checked_in === "boolean") patch.checked_in = body.checked_in
  if (typeof body.manual_rank === "number" || body.manual_rank === null) patch.manual_rank = body.manual_rank
  if (typeof body.waitlist === "boolean") patch.waitlist = body.waitlist
  if (typeof body.note === "string") patch.note = body.note.slice(0, 500)
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nichts zu ändern" }, { status: 400 })

  const { error } = await admin.from("tournament_registrations").update(patch).eq("id", regId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const regId = req.nextUrl.searchParams.get("registration_id") || ""
  if (!regId) return NextResponse.json({ error: "registration_id fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const check = await veranstalterCheck(admin, regId, user.id, user.email)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const tid = check.reg.tournament_id as string
  const max = (check.reg.player_tournaments as { max_players?: number } | null)?.max_players ?? 32

  // Kein Hard-Delete: als 'withdrawn' markieren (Historie/Zahlungsspur bleibt).
  const { error } = await admin.from("tournament_registrations")
    .update({ status: "withdrawn", waitlist: false, waitlist_pos: null }).eq("id", regId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Platz frei → Warteliste nachrücken lassen + den Nachrücker benachrichtigen.
  const rueck = await nachruecken(admin, tid, max)
  if (rueck?.player_id) {
    await notify(admin, rueck.player_id, "waitlist_promoted", "Du bist nachgerückt!", {
      body: "Ein Platz ist frei geworden — du bist jetzt dabei.", link: `/turniere/${tid}`,
    })
  }
  return NextResponse.json({ ok: true, nachgerueckt: rueck?.id ?? null })
}
