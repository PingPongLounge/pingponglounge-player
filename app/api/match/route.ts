import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

type PubProfile = { id: string; name: string; elo: number; level: string }

// Liste offener Open Games (reiches Modell: Tisch, Zeit, Preis, mehrere Plätze)
export async function GET() {
  const sb = await createClient()

  const { data: games, error } = await sb
    .from("open_games")
    .select("id,created_by,location_name,date,start_hour,duration_minutes,max_players,current_players,price_per_player,level,status,notes,created_at")
    .in("status", ["open", "full"])
    .order("date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(40)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const gameIds = (games || []).map(g => g.id)
  let playersByGame: Record<string, Array<{ user_id: string; name: string; elo: number; level: string }>> = {}
  if (gameIds.length > 0) {
    const { data: gp } = await sb
      .from("open_game_players")
      .select("game_id,user_id,status")
      .in("game_id", gameIds)
      .neq("status", "left")

    const uids = [...new Set((gp || []).map(p => p.user_id))]
    const profMap: Record<string, PubProfile> = {}
    if (uids.length > 0) {
      const { data: profs } = await sb.from("public_profiles").select("id,name,elo,level").in("id", uids)
      ;(profs || []).forEach(p => { profMap[p.id] = p as PubProfile })
    }
    playersByGame = {}
    ;(gp || []).forEach(p => {
      const prof = profMap[p.user_id]
      ;(playersByGame[p.game_id] ||= []).push({
        user_id: p.user_id,
        name: prof?.name || "Spieler",
        elo: prof?.elo ?? 1000,
        level: prof?.level || "",
      })
    })
  }

  const matches = (games || []).map(g => ({
    ...g,
    players: playersByGame[g.id] || [],
    current_players: (playersByGame[g.id] || []).length,
  }))

  return NextResponse.json({ matches })
}

// Open Game erstellen — jeder eingeloggte Spieler
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const location_name = String(body.location_name || "").trim().slice(0, 80)
  const level = String(body.level || "").trim().slice(0, 40)
  if (!location_name || !level) return NextResponse.json({ error: "Standort und Level sind Pflicht" }, { status: 400 })

  const max_players = [2, 3, 4].includes(Number(body.max_players)) ? Number(body.max_players) : 2
  const price_per_player = Math.max(0, Math.min(999, Number(body.price_per_player) || 0))
  const date = body.date ? String(body.date).slice(0, 10) : null
  const start_hour = body.start_hour !== undefined && body.start_hour !== null && body.start_hour !== ""
    ? Math.max(0, Math.min(23, Number(body.start_hour))) : null
  const duration_minutes = [30, 60, 90, 120].includes(Number(body.duration_minutes)) ? Number(body.duration_minutes) : 60
  const notes = body.notes ? String(body.notes).slice(0, 300) : null

  // Nur 1 aktives selbst erstelltes Spiel pro Spieler
  const { data: existing } = await sb
    .from("open_games")
    .select("id")
    .eq("created_by", user.id)
    .in("status", ["open", "full"])
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "Du hast bereits ein offenes Spiel" }, { status: 409 })

  const { data: game, error } = await sb
    .from("open_games")
    .insert({
      created_by: user.id, location_name, date, start_hour, duration_minutes,
      max_players, current_players: 1, price_per_player, level, notes, status: "open",
    })
    .select("id")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ersteller als erster Spieler
  await sb.from("open_game_players").insert({ game_id: game.id, user_id: user.id, status: "joined" })

  return NextResponse.json({ id: game.id })
}
