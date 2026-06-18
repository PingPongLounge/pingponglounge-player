import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: game } = await sb.from("open_games").select("id,status,max_players").eq("id", id).single()
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })
  if (!["open", "full"].includes(game.status)) return NextResponse.json({ error: "Spiel nicht mehr offen" }, { status: 409 })

  // Aktuelle Teilnehmer
  const { data: players } = await sb.from("open_game_players").select("user_id,status").eq("game_id", id).neq("status", "left")
  const active = players || []
  if (active.some(p => p.user_id === user.id)) return NextResponse.json({ error: "Du bist schon dabei" }, { status: 409 })
  if (active.length >= game.max_players) return NextResponse.json({ error: "Spiel ist voll" }, { status: 409 })

  // Eigene Teilnahme eintragen (RLS erlaubt eigene Zeile)
  const { error: insErr } = await sb.from("open_game_players").insert({ game_id: id, user_id: user.id, status: "joined" })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  // Zähler/Status aktualisieren (nur Ersteller dürfte das Spiel ändern -> Service-Role)
  const newCount = active.length + 1
  const admin = createAdminClient()
  await admin.from("open_games").update({
    current_players: newCount,
    status: newCount >= game.max_players ? "full" : "open",
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  return NextResponse.json({ ok: true })
}
