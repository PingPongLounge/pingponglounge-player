import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb.from("open_matches").select("id,creator_id,status").eq("id", id).single()
  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.status !== "open") return NextResponse.json({ error: "Match nicht mehr offen" }, { status: 409 })
  if (match.creator_id === user.id) return NextResponse.json({ error: "Du kannst nicht deinem eigenen Match beitreten" }, { status: 400 })

  await sb.from("open_matches").update({ joiner_id: user.id, status: "matched" }).eq("id", id)

  // PingPoints für beide Spieler
  await sb.from("ping_points_transactions").insert([
    { player_id: user.id,         amount: 5, source: "open_match", description: "Open Match gespielt", ref_id: id },
    { player_id: match.creator_id, amount: 5, source: "open_match", description: "Open Match gespielt", ref_id: id },
  ])

  return NextResponse.json({ ok: true })
}