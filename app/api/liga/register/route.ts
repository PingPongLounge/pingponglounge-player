import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
export async function POST(req: NextRequest) {
  const { season_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  // Ohne abgeschlossenes Onboarding kein Liga-Beitritt: sonst steht ein
  // namenloser Spieler ohne Level in der Tabelle. Das Gate stand bisher nur
  // auf /entdecken — ein Deeplink direkt in die Liga umging es.
  const { data: prof } = await admin.from("profiles").select("level,name").eq("id", user.id).maybeSingle()
  if (!prof?.level || !prof?.name) {
    return NextResponse.json({ error: "Schliess zuerst dein Profil ab", needsOnboarding: true }, { status: 400 })
  }
  // Beitritt auch bei laufender Saison. Vorher galt nur "open" — sobald die
  // Saison aber auf "running" stand (und nur dann greift der Inaktivitäts-Abzug),
  // war der Button "Liga beitreten" ein Blindgänger. Bei einem rollenden Start
  // kommen die Leute nach und nach dazu; sie müssen jederzeit rein können.
  const { data: season } = await admin.from("league_seasons").select("status,max_players").eq("id", season_id).single()
  if (!season || !["open", "running"].includes(season.status)) {
    return NextResponse.json({ error: "Saison nicht offen" }, { status: 400 })
  }
  const { count } = await admin.from("league_registrations").select("*", { count: "exact", head: true }).eq("season_id", season_id)
  if ((count || 0) >= season.max_players) return NextResponse.json({ error: "Liga ist voll" }, { status: 400 })
  // Bereits angemeldet → idempotent zurückgeben
  const { data: existing } = await admin.from("league_registrations").select("id").eq("season_id", season_id).eq("player_id", user.id).maybeSingle()
  if (existing) return NextResponse.json({ ok: true })
  const { error } = await admin.from("league_registrations").insert({ season_id, player_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}