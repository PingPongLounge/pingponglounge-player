import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRechte, darfStandort } from "@/lib/roles"
import { NextRequest, NextResponse } from "next/server"

// CHECK-IN am Turniertag (nur Veranstalter). Setzt checked_in für eine Anmeldung.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const regId = String(body.registration_id || "")
  const wert = body.checked_in !== false
  if (!regId) return NextResponse.json({ error: "registration_id fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const { data: t } = await admin.from("player_tournaments").select("location_id").eq("id", id).maybeSingle()
  const rechte = await getRechte(admin, user.id, user.email)
  if (!darfStandort(rechte, t?.location_id)) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { error } = await admin.from("tournament_registrations")
    .update({ checked_in: wert }).eq("id", regId).eq("tournament_id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
