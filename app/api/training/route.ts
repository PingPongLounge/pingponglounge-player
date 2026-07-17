import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

type PubProfile = { id: string; name: string; elo: number; level: string }

// Kommende geführte Trainings (kind=training). Zeigt die Teilnehmer inkl. Level,
// damit sichtbar ist, wer mit welchem Niveau kommt.
export async function GET() {
  const sb = await createClient()
  const heute = new Date().toISOString().slice(0, 10)

  const { data: games, error } = await sb
    .from("open_games")
    .select("id,location_name,date,start_hour,duration_minutes,max_players,current_players,price_per_player,level,status,notes,is_official,kind")
    .eq("kind", "training")
    .eq("is_official", true)
    .in("status", ["open", "full"])
    .not("date", "is", null)
    .gte("date", heute)
    .order("date", { ascending: true })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (games || []).map(g => g.id)
  const playersByGame: Record<string, Array<{ user_id: string; name: string; elo: number; level: string }>> = {}
  if (ids.length > 0) {
    const { data: gp } = await sb.from("open_game_players").select("game_id,user_id,status").in("game_id", ids).neq("status", "left")
    const uids = [...new Set((gp || []).map(p => p.user_id))]
    const profMap: Record<string, PubProfile> = {}
    if (uids.length > 0) {
      const { data: profs } = await sb.from("public_profiles").select("id,name,elo,level").in("id", uids)
      ;(profs || []).forEach(p => { profMap[p.id] = p as PubProfile })
    }
    ;(gp || []).forEach(p => {
      const prof = profMap[p.user_id]
      ;(playersByGame[p.game_id] ||= []).push({
        user_id: p.user_id, name: prof?.name || "Spieler", elo: prof?.elo ?? 1000, level: prof?.level || "",
      })
    })
  }

  const trainings = (games || []).map(g => ({
    ...g,
    players: playersByGame[g.id] || [],
    current_players: (playersByGame[g.id] || []).length,
  }))
  return NextResponse.json({ trainings })
}
