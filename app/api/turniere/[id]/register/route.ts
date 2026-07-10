import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: t } = await admin.from("player_tournaments").select("status,max_players").eq("id", id).single()
  if (!t || t.status !== "open") return NextResponse.json({ error: "Anmeldung nicht möglich" }, { status: 400 })

  const { count } = await admin.from("tournament_registrations").select("*", { count: "exact", head: true }).eq("tournament_id", id)
  if ((count ?? 0) >= t.max_players) return NextResponse.json({ error: "Turnier ist voll" }, { status: 409 })

  const { error } = await admin.from("tournament_registrations").insert({ tournament_id: id, player_id: user.id })
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Bereits angemeldet" : error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}