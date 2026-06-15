import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { STAFF_EMAILS } from "@/lib/staff"
export async function POST(req: NextRequest) {
  const body = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email||"")) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  // Feld-Whitelist statt {...body} (Mass-Assignment-Schutz)
  if (!body?.name || !body?.city) return NextResponse.json({ error: "Name und Stadt sind Pflicht" }, { status: 400 })
  const payload = {
    name:        String(body.name),
    city:        String(body.city),
    skill_class: body.skill_class ? String(body.skill_class) : null,
    max_players: Number.isFinite(+body.max_players) ? Math.min(64, Math.max(2, +body.max_players)) : 10,
    start_date:  body.start_date || null,
    description: body.description ? String(body.description) : null,
    created_by:  user.id,
  }
  const { data, error } = await sb.from("league_seasons").insert(payload).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}