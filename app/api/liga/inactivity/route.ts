import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { LIGA_CONFIG } from "@/lib/rewards"

// Täglich via Cron (03:00 UTC)
// Authorization: Bearer <CRON_SECRET>  (in Vercel Dashboard setzen, nicht .env.local)
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LIGA_CONFIG.inactivityDays)

  const { data: regs } = await admin
    .from("league_registrations")
    .select("player_id, season_id, last_penalty_at, league_seasons!inner(status)")
    .eq("league_seasons.status", "running")

  if (!regs?.length) return NextResponse.json({ ok: true, penalized: 0 })

  const processed = new Set<string>()
  let penalized = 0

  for (const reg of regs) {
    if (processed.has(reg.player_id)) continue

    if (reg.last_penalty_at) {
      const daysSince = (Date.now() - new Date(reg.last_penalty_at).getTime()) / 86400000
      if (daysSince < LIGA_CONFIG.inactivityDays) continue
    }

    const { data: lastMatch } = await admin
      .from("league_matches")
      .select("played_at")
      .eq("status", "confirmed")
      .or(`p1_id.eq.${reg.player_id},p2_id.eq.${reg.player_id}`)
      .order("played_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastActivity = lastMatch?.played_at ? new Date(lastMatch.played_at) : null
    if (!lastActivity || lastActivity < cutoff) {
      const { data: profile } = await admin.from("profiles").select("elo").eq("id", reg.player_id).single()
      if (profile) {
        const newElo = Math.max(100, (profile.elo ?? 1000) - LIGA_CONFIG.inactivityEloPenalty)
        await admin.from("profiles").update({ elo: newElo }).eq("id", reg.player_id)
        await admin.from("elo_history").insert({
          player_id: reg.player_id, elo: newElo,
          delta: -LIGA_CONFIG.inactivityEloPenalty, match_id: null,
          note: "Inaktivitäts-Penalty",
        })
        await admin.from("league_registrations")
          .update({ last_penalty_at: new Date().toISOString() })
          .eq("player_id", reg.player_id)

        processed.add(reg.player_id)
        penalized++
      }
    }
  }

  return NextResponse.json({ ok: true, penalized })
}
