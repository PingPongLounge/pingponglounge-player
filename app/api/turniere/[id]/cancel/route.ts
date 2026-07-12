import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { STAFF_EMAILS } from "@/lib/staff"
import { NextRequest, NextResponse } from "next/server"

// Turnier absagen. Bisher gab es diese Route nicht — die App forderte aber
// wörtlich "beende oder lösche zuerst eines", wenn jemand zwei aktive Turniere
// hatte. Man kam da nie wieder raus.
export const runtime = "nodejs"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: t } = await admin
    .from("player_tournaments")
    .select("id,created_by,status")
    .eq("id", id)
    .maybeSingle()
  if (!t) return NextResponse.json({ error: "Turnier nicht gefunden" }, { status: 404 })

  const isStaff = STAFF_EMAILS.includes(user.email || "")
  if (t.created_by !== user.id && !isStaff) {
    return NextResponse.json({ error: "Nur der Ersteller kann das Turnier absagen" }, { status: 403 })
  }
  if (t.status === "finished") {
    return NextResponse.json({ error: "Ein beendetes Turnier kann nicht abgesagt werden" }, { status: 400 })
  }

  await admin.from("player_tournaments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)

  return NextResponse.json({ ok: true })
}
