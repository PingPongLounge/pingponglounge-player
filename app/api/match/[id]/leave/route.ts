import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: game } = await admin.from("open_games").select("id,created_by,status").eq("id", id).single()
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })
  if (game.created_by === user.id) return NextResponse.json({ error: "Als Ersteller bitte das Spiel löschen" }, { status: 400 })
  // Ein abgesagtes Spiel darf nicht durch Austreten wieder auf "open" springen.
  if (game.status === "cancelled") return NextResponse.json({ error: "Dieses Spiel wurde abgesagt" }, { status: 400 })

  // Eigene Teilnahme entfernen
  const { error: delErr } = await admin.from("open_game_players").delete().eq("game_id", id).eq("user_id", user.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

  const { data: players } = await admin.from("open_game_players").select("user_id").eq("game_id", id).neq("status", "left")
  const count = (players || []).length
  await admin.from("open_games").update({ current_players: count, status: "open", updated_at: new Date().toISOString() }).eq("id", id)

  return NextResponse.json({ ok: true })
}
