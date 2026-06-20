import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const sb = await createClient()
  const seasonId = req.nextUrl.searchParams.get("season_id")
  if (!seasonId) return NextResponse.json({ messages: [] })

  const { data: msgs } = await sb
    .from("league_messages")
    .select("id,user_id,text,created_at,kind")
    .eq("season_id", seasonId)
    .order("created_at", { ascending: true })
    .limit(200)

  const ids = [...new Set((msgs || []).map(m => m.user_id).filter(Boolean) as string[])]
  const names: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: profs } = await sb.from("public_profiles").select("id,name").in("id", ids)
    ;(profs || []).forEach(p => { names[p.id] = p.name })
  }
  const messages = (msgs || []).map(m => ({ ...m, name: m.user_id ? (names[m.user_id] || "Spieler") : "" }))
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { season_id, text } = await req.json()
  const clean = String(text || "").trim().slice(0, 500)
  if (!season_id || !clean) return NextResponse.json({ error: "Leer" }, { status: 400 })

  // Nur angemeldete Spieler dürfen in den Liga-Chat schreiben
  const { data: reg } = await sb.from("league_registrations")
    .select("id").eq("season_id", season_id).eq("player_id", user.id).maybeSingle()
  if (!reg) return NextResponse.json({ error: "Nur Liga-Mitglieder können schreiben" }, { status: 403 })

  const { error } = await sb.from("league_messages").insert({ season_id, user_id: user.id, text: clean })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
