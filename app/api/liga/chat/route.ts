import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const seasonId = req.nextUrl.searchParams.get("season_id")
  if (!seasonId) return NextResponse.json({ messages: [] })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  // Mitlesen darf nur, wer in dieser Liga ist. Bisher konnte jeder eingeloggte
  // Nutzer den Chat JEDER Saison abrufen — schreiben war geschützt, lesen nicht.
  const { data: mitglied } = await admin.from("league_registrations")
    .select("id").eq("season_id", seasonId).eq("player_id", user.id).maybeSingle()
  if (!mitglied) return NextResponse.json({ messages: [] })
  const { data: msgs } = await admin
    .from("league_messages")
    .select("id,user_id,text,created_at,kind,match_id,parent_id")
    .eq("season_id", seasonId)
    .order("created_at", { ascending: true })
    .limit(200)

  const ids = [...new Set((msgs || []).map(m => m.user_id).filter(Boolean) as string[])]
  const names: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: profs } = await admin.from("public_profiles").select("id,name").in("id", ids)
    ;(profs || []).forEach(p => { names[p.id] = p.name })
  }

  // Reaktionen für alle Nachrichten laden
  const msgIds = (msgs || []).map(m => m.id)
  let reactionsRaw: Array<{ message_id: string; user_id: string; type: string }> = []
  if (msgIds.length > 0) {
    const { data: r } = await admin.from("message_reactions").select("message_id,user_id,type").in("message_id", msgIds)
    reactionsRaw = r || []
  }

  // Reaktionen gruppieren: { messageId: { heart: count, fire: count, laugh: count, myReacts: string[] } }
  const reactMap: Record<string, { heart: number; fire: number; laugh: number; myReacts: string[] }> = {}
  for (const r of reactionsRaw) {
    if (!reactMap[r.message_id]) reactMap[r.message_id] = { heart: 0, fire: 0, laugh: 0, myReacts: [] }
    const k = r.type as "heart" | "fire" | "laugh"
    reactMap[r.message_id][k]++
    if (user && r.user_id === user.id) reactMap[r.message_id].myReacts.push(r.type)
  }

  const messages = (msgs || []).map(m => ({
    ...m,
    name: m.user_id ? (names[m.user_id] || "Spieler") : "",
    reactions: reactMap[m.id] || { heart: 0, fire: 0, laugh: 0, myReacts: [] },
  }))
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { season_id, text, parent_id, match_id } = await req.json()
  const clean = String(text || "").trim().slice(0, 500)
  if (!season_id || !clean) return NextResponse.json({ error: "Leer" }, { status: 400 })

  const admin = createAdminClient()
  const { data: reg } = await admin.from("league_registrations")
    .select("id").eq("season_id", season_id).eq("player_id", user.id).maybeSingle()
  if (!reg) return NextResponse.json({ error: "Nur Liga-Mitglieder können schreiben" }, { status: 403 })

  // Kommentar zu einem Spiel: parent_id muss eine Nachricht DERSELBEN Saison sein
  // und selbst kein Kommentar (keine Threads in Threads).
  // Alternativ genügt die match_id — dann suchen wir den Match-Post selbst.
  let parent: string | null = null
  const parentRef = parent_id || null

  if (parentRef) {
    const { data: p } = await admin.from("league_messages")
      .select("id,season_id,parent_id").eq("id", parentRef).maybeSingle()
    if (!p || p.season_id !== season_id || p.parent_id) {
      return NextResponse.json({ error: "Ungültiger Bezug" }, { status: 400 })
    }
    parent = p.id
  } else if (match_id) {
    const { data: post } = await admin.from("league_messages")
      .select("id,season_id").eq("match_id", match_id).is("parent_id", null).maybeSingle()
    if (!post || post.season_id !== season_id) {
      return NextResponse.json({ error: "Kein Spiel-Eintrag gefunden" }, { status: 400 })
    }
    parent = post.id
  }

  const { error } = await admin.from("league_messages")
    .insert({ season_id, user_id: user.id, text: clean, parent_id: parent, kind: parent ? "comment" : null })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
