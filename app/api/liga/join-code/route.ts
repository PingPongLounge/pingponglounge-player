import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// Beitritt zu einer privaten Firmen-Liga über den Invite-Code. Gleiche Gates
// wie der normale Beitritt (Onboarding, Kapazität), aber die Liga wird über den
// Code gefunden — sie taucht nirgends öffentlich auf.
export async function POST(req: NextRequest) {
  const { code } = await req.json()
  const clean = String(code || "").trim().toUpperCase()
  if (!clean) return NextResponse.json({ error: "Kein Code" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const { data: prof } = await admin.from("profiles").select("level,name").eq("id", user.id).maybeSingle()
  if (!prof?.level || !prof?.name) {
    return NextResponse.json({ error: "Schliess zuerst dein Profil ab", needsOnboarding: true }, { status: 400 })
  }

  const { data: season } = await admin
    .from("league_seasons")
    .select("id,name,org_name,status,max_players,is_private")
    .eq("invite_code", clean)
    .maybeSingle()
  if (!season || !season.is_private) return NextResponse.json({ error: "Code ungültig" }, { status: 404 })
  if (!["open", "running"].includes(season.status)) return NextResponse.json({ error: "Liga ist geschlossen" }, { status: 400 })

  // Schon dabei? Idempotent.
  const { data: existing } = await admin.from("league_registrations").select("id").eq("season_id", season.id).eq("player_id", user.id).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, season_id: season.id, name: season.name, org: season.org_name })

  const { count } = await admin.from("league_registrations").select("*", { count: "exact", head: true }).eq("season_id", season.id)
  if ((count || 0) >= season.max_players) return NextResponse.json({ error: "Liga ist voll" }, { status: 400 })

  // Start-Rating 1000 (Spalten-Default) — isolierte Season-Wertung.
  const { error } = await admin.from("league_registrations").insert({ season_id: season.id, player_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, season_id: season.id, name: season.name, org: season.org_name })
}
