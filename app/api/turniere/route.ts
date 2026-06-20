import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data } = await sb
    .from("player_tournaments")
    .select("id,name,date,city,skill_class,max_players,status,format,entry_fee_chf,counts_for_rank,created_at,tournament_registrations(count)")
    .in("status", ["open", "running", "finished"])
    .order("date", { ascending: true })
  return NextResponse.json({ tournaments: data || [] })
}

// Jeder eingeloggte Spieler darf ein Turnier erstellen (self-service, wie Playtomic)
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || "").trim().slice(0, 80)
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 })

  const allowedSizes = [4, 8, 16, 32]
  const max_players = allowedSizes.includes(Number(body.max_players)) ? Number(body.max_players) : 16
  const format = ["ko", "gruppen_ko"].includes(body.format) ? body.format : "ko"
  const skill_class = String(body.skill_class || "alle").slice(0, 40)
  const city = body.city ? String(body.city).slice(0, 80) : null
  const date = body.date ? String(body.date).slice(0, 10) : null
  const entry_fee_chf = Math.max(0, Math.min(999, Number(body.entry_fee_chf) || 0))
  const counts_for_rank = body.counts_for_rank !== false

  // Spam-Schutz: max. 2 aktive selbst erstellte Turniere pro Person
  const { count: mine } = await sb
    .from("player_tournaments")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id)
    .in("status", ["open", "running"])
  if ((mine ?? 0) >= 2) return NextResponse.json({ error: "Du hast bereits 2 aktive Turniere — beende oder lösche zuerst eines." }, { status: 409 })

  const { data, error } = await sb
    .from("player_tournaments")
    .insert({ name, city, date, skill_class, format, max_players, entry_fee_chf, counts_for_rank, created_by: user.id, status: "open" })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
