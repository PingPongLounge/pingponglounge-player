import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  const { data: game } = await sb
    .from("open_games")
    .select("id,created_by,location_name,date,start_hour,duration_minutes,max_players,current_players,price_per_player,level,status,notes,created_at,winner_id,entered_by,sets,entered_at,confirmed_at,is_official")
    .eq("id", id)
    .single()
  if (!game) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const { data: gp } = await sb
    .from("open_game_players")
    .select("user_id,status,joined_at")
    .eq("game_id", id)
    .neq("status", "left")
    .order("joined_at", { ascending: true })

  const uids = [...new Set((gp || []).map(p => p.user_id))]
  const profMap: Record<string, { name: string; elo: number; level: string }> = {}
  if (uids.length > 0) {
    const { data: profs } = await sb.from("public_profiles").select("id,name,elo,level").in("id", uids)
    ;(profs || []).forEach(p => { profMap[p.id] = { name: p.name, elo: p.elo, level: p.level } })
  }

  const players = (gp || []).map(p => ({
    user_id: p.user_id,
    name: profMap[p.user_id]?.name || "Spieler",
    elo: profMap[p.user_id]?.elo ?? 1000,
    level: profMap[p.user_id]?.level || "",
    is_creator: p.user_id === game.created_by,
  }))

  return NextResponse.json({
    game: { ...game, current_players: players.length },
    players,
    userId: user?.id || null,
    isCreator: user ? game.created_by === user.id : false,
    isJoined: user ? players.some(p => p.user_id === user.id) : false,
  })
}
