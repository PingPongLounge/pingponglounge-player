import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
export async function POST(req: NextRequest) {
  const { season_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: season } = await admin.from("league_seasons").select("status,max_players").eq("id", season_id).single()
  if (!season || season.status !== "open") return NextResponse.json({ error: "Saison nicht offen" }, { status: 400 })
  const { count } = await admin.from("league_registrations").select("*", { count: "exact", head: true }).eq("season_id", season_id)
  if ((count || 0) >= season.max_players) return NextResponse.json({ error: "Liga ist voll" }, { status: 400 })
  // Bereits angemeldet → idempotent zurückgeben
  const { data: existing } = await admin.from("league_registrations").select("id").eq("season_id", season_id).eq("player_id", user.id).maybeSingle()
  if (existing) return NextResponse.json({ ok: true })
  const { error } = await admin.from("league_registrations").insert({ season_id, player_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}