import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
const STAFF = ["info@pingponglounge.ch","elia@pingponglounge.ch"]

function roundRobin(players: string[]): Array<{round:number,p1:string,p2:string}> {
  const list = [...players]
  if (list.length % 2 !== 0) list.push("BYE")
  const n = list.length
  const matches: Array<{round:number,p1:string,p2:string}> = []
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const p1 = list[i], p2 = list[n - 1 - i]
      if (p1 !== "BYE" && p2 !== "BYE") matches.push({ round: round + 1, p1, p2 })
    }
    list.splice(1, 0, list.pop()!)
  }
  return matches
}

export async function POST(req: NextRequest) {
  const { season_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF.includes(user.email||"")) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const { data: regs } = await sb.from("league_registrations").select("player_id").eq("season_id", season_id)
  if (!regs || regs.length < 2) return NextResponse.json({ error: "Zu wenige Spieler" }, { status: 400 })
  const players = regs.map(r => r.player_id)
  const matches = roundRobin(players)
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 14)
  const inserts = matches.map(m => ({ season_id, round: m.round, p1_id: m.p1, p2_id: m.p2, deadline: deadline.toISOString() }))
  await sb.from("league_matches").delete().eq("season_id", season_id)
  const { error } = await sb.from("league_matches").insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await sb.from("league_seasons").update({ status: "running" }).eq("id", season_id)
  return NextResponse.json({ ok: true, count: inserts.length })
}