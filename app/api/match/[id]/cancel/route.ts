import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: game } = await sb
    .from("open_games")
    .select("created_by,status")
    .eq("id", id)
    .single()

  if (!game) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (game.created_by !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  // Ersteller darf eigenes Spiel ändern (RLS: auth.uid() = created_by)
  await sb.from("open_games").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id)
  return NextResponse.json({ ok: true })
}
