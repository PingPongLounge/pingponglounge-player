import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const { data: seasons, error: seasonErr } = await admin
    .from("league_seasons")
    .select("id,name,city,status,max_players,start_date,description,is_global,is_private")
    .eq("is_global", false)
    .eq("is_private", false)
    .in("status", ["open", "running"])
    .order("start_date", { ascending: true })

  if (seasonErr) return NextResponse.json({ error: seasonErr.message }, { status: 500 })

  const seasonIds = (seasons || []).map(s => s.id)
  if (!seasonIds.length) return NextResponse.json({ seasons: [] })

  const [{ data: myRegs }, { data: allRegs }] = await Promise.all([
    admin.from("league_registrations").select("season_id").eq("player_id", user.id).in("season_id", seasonIds),
    admin.from("league_registrations").select("season_id").in("season_id", seasonIds),
  ])

  const mine = new Set((myRegs || []).map(r => r.season_id))
  const counts = new Map<string, number>()
  for (const r of allRegs || []) counts.set(r.season_id, (counts.get(r.season_id) || 0) + 1)

  const joinedIds = seasonIds.filter(id => mine.has(id))
  const assignmentsBySeason = new Map<string, any[]>()

  if (joinedIds.length) {
    const { data: matches } = await admin
      .from("league_matches")
      .select("id,season_id,p1_id,p2_id,round,status,deadline,confirmed_at,ranked")
      .in("season_id", joinedIds)
      .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
      .order("round", { ascending: true })
      .order("deadline", { ascending: true })

    const oppIds = Array.from(new Set((matches || []).map(m => m.p1_id === user.id ? m.p2_id : m.p1_id)))
    let names = new Map<string, { name: string; elo: number | null; avatar_url: string | null }>()
    if (oppIds.length) {
      const { data: profs } = await admin.from("public_profiles").select("id,name,elo,avatar_url").in("id", oppIds)
      names = new Map((profs || []).map(p => [p.id, { name: p.name, elo: p.elo ?? null, avatar_url: p.avatar_url ?? null }]))
    }

    for (const m of matches || []) {
      const oppId = m.p1_id === user.id ? m.p2_id : m.p1_id
      const opp = names.get(oppId)
      const arr = assignmentsBySeason.get(m.season_id) || []
      arr.push({
        id: m.id,
        opponent_id: oppId,
        opponent_name: opp?.name || "Spieler",
        opponent_elo: opp?.elo ?? null,
        opponent_avatar: opp?.avatar_url ?? null,
        round: m.round ?? 1,
        status: m.status,
        deadline: m.deadline,
        confirmed_at: m.confirmed_at,
        ranked: m.ranked !== false,
        i_am_p1: m.p1_id === user.id,
      })
      assignmentsBySeason.set(m.season_id, arr)
    }
  }

  return NextResponse.json({
    seasons: (seasons || []).map(s => ({
      ...s,
      joined: mine.has(s.id),
      player_count: counts.get(s.id) || 0,
      assignments: assignmentsBySeason.get(s.id) || [],
    })),
  })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const seasonId = typeof body.season_id === "string" ? body.season_id : ""
  const action = body.action === "leave" ? "leave" : "join"
  if (!seasonId) return NextResponse.json({ error: "Season fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const { data: season } = await admin
    .from("league_seasons")
    .select("id,status,max_players,is_global,is_private")
    .eq("id", seasonId)
    .maybeSingle()

  if (!season || season.is_global || season.is_private)
    return NextResponse.json({ error: "Season nicht verfügbar" }, { status: 404 })

  if (action === "leave") {
    if (season.status !== "open") return NextResponse.json({ error: "Eine laufende Season kann nicht mehr verlassen werden" }, { status: 409 })
    const { count } = await admin.from("league_matches").select("id", { count: "exact", head: true }).eq("season_id", seasonId).or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    if ((count || 0) > 0) return NextResponse.json({ error: "Spielplan ist bereits erstellt" }, { status: 409 })
    await admin.from("league_registrations").delete().eq("season_id", seasonId).eq("player_id", user.id)
    return NextResponse.json({ ok: true, joined: false })
  }

  if (season.status !== "open") return NextResponse.json({ error: "Season läuft bereits" }, { status: 409 })

  const { data: profile } = await admin.from("profiles").select("name,level").eq("id", user.id).maybeSingle()
  if (!profile?.name || !profile?.level) return NextResponse.json({ error: "Schliess zuerst dein Profil ab" }, { status: 400 })

  const { count } = await admin.from("league_registrations").select("player_id", { count: "exact", head: true }).eq("season_id", seasonId)
  if (season.max_players && (count || 0) >= season.max_players) return NextResponse.json({ error: "Season ist voll" }, { status: 409 })

  const { error } = await admin.from("league_registrations")
    .upsert({ season_id: seasonId, player_id: user.id }, { onConflict: "season_id,player_id", ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, joined: true })
}
