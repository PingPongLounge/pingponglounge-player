import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: game } = await admin
    .from("open_games")
    .select("created_by,status")
    .eq("id", id)
    .single()

  if (!game) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (game.created_by !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  // Ein Spiel mit eingetragenem oder gewertetem Ergebnis darf nicht mehr abgesagt
  // werden. Sonst könnte der Ersteller, sobald er verloren hat, das Spiel absagen
  // und sich so dem ELO-Verlust entziehen.
  if (!["open", "full"].includes(game.status)) {
    return NextResponse.json({ error: "Für dieses Spiel liegt bereits ein Ergebnis vor — es kann nicht mehr abgesagt werden" }, { status: 400 })
  }

  const { error } = await admin.from("open_games").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
