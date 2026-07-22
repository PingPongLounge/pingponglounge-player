import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// SPIELPROFIL speichern — alle Felder OPTIONAL. Hauptspielort, Hand, Noppen,
// Anti, Material und die Parkinson-Kategorie. Null/leer löscht das jeweilige
// Feld wieder. Diese Angaben speisen die Liga-Filter.
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if ("home_location" in b) patch.home_location = b.home_location || null
  if ("handedness" in b) patch.handedness = ["left", "right"].includes(b.handedness) ? b.handedness : null
  if ("pips" in b) patch.pips = ["none", "short", "long"].includes(b.pips) ? b.pips : null
  if ("anti" in b) patch.anti = typeof b.anti === "boolean" ? b.anti : null
  if ("blade" in b) patch.blade = b.blade ? String(b.blade).slice(0, 80) : null
  if ("rubber_fh" in b) patch.rubber_fh = b.rubber_fh ? String(b.rubber_fh).slice(0, 80) : null
  if ("rubber_bh" in b) patch.rubber_bh = b.rubber_bh ? String(b.rubber_bh).slice(0, 80) : null
  if ("player_category" in b) patch.player_category = b.player_category === "parkinson" ? "parkinson" : null

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nichts zu speichern" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update(patch).eq("id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
