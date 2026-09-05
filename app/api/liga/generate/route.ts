import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { STAFF_EMAILS } from "@/lib/staff"

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
  const { season_id } = await req.json().catch(()=>({}))
  if (!season_id) return NextResponse.json({ error: "season_id fehlt" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email||"")) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })

  const admin = createAdminClient()
  const { data: season } = await admin.from("league_seasons").select("id,is_global,status").eq("id", season_id).maybeSingle()
  if (!season) return NextResponse.json({ error: "Saison nicht gefunden" }, { status: 404 })
  if (season.is_global) return NextResponse.json({ error: "Für die globale Liga dürfen keine Season-Matches generiert werden" }, { status: 400 })

  // Sicherheitsgurt: niemals bestehende Resultate/Challenges wegwerfen.
  const { count: existing } = await admin
    .from("league_matches")
    .select("id", { count:"exact", head:true })
    .eq("season_id", season_id)
  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: "Diese Saison hat bereits Matches. Generierung abgebrochen, damit keine Daten gelöscht werden." }, { status: 409 })
  }

  const { data: regs } = await admin.from("league_registrations").select("player_id").eq("season_id", season_id)
  if (!regs || regs.length < 2) return NextResponse.json({ error: "Zu wenige Spieler" }, { status: 400 })

  const players = regs.map(r => r.player_id)
  const matches = roundRobin(players)
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 14)
  const inserts = matches.map(m => ({ season_id, round: m.round, p1_id: m.p1, p2_id: m.p2, deadline: deadline.toISOString() }))

  const { error } = await admin.from("league_matches").insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.from("league_seasons").update({ status: "running" }).eq("id", season_id)
  return NextResponse.json({ ok: true, count: inserts.length })
}
