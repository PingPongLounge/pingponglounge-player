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

  // Firmen-/Privatliga: eindeutiger Invite-Code, isolierte Wertung, läuft sofort
  // (damit eingeladene Spieler direkt beitreten können).
  const isPrivate = body.is_private === true
  let invite_code: string | null = null
  if (isPrivate) {
    const slug = String(body.org_name || body.name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "TEAM"
    const rnd = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)
    // Bis zu 5 Versuche gegen den Unique-Index
    for (let i = 0; i < 5; i++) {
      const cand = `${slug}-${rnd()}`
      const { data: taken } = await sb.from("league_seasons").select("id").eq("invite_code", cand).maybeSingle()
      if (!taken) { invite_code = cand; break }
    }
    if (!invite_code) return NextResponse.json({ error: "Code-Erzeugung fehlgeschlagen, nochmal versuchen" }, { status: 500 })
  }

  const payload = {
    name:        String(body.name),
    city:        String(body.city),
    skill_class: body.skill_class ? String(body.skill_class) : null,
    max_players: Number.isFinite(+body.max_players) ? Math.min(64, Math.max(2, +body.max_players)) : 10,
    start_date:  body.start_date || null,
    description: body.description ? String(body.description) : null,
    created_by:  user.id,
    is_private:  isPrivate,
    org_name:    isPrivate && body.org_name ? String(body.org_name) : null,
    invite_code,
    ...(isPrivate ? { status: "running" } : {}),
  }
  const { data, error } = await sb.from("league_seasons").insert(payload).select("id,invite_code").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, invite_code: data.invite_code })
}