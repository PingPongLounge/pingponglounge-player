import { createAdminClient } from "@/lib/supabase/admin"
import { applyLeagueConfirm } from "@/lib/liga"
import { NextRequest, NextResponse } from "next/server"

// Cron: bestätigt Liga-Matches automatisch, wenn der Gegner 48h nicht reagiert.
// Vercel-Cron ruft per GET mit "Authorization: Bearer <CRON_SECRET>".
async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const { data: overdue } = await admin
    .from("league_matches")
    .select("id")
    .eq("status", "p1_entered")
    .not("winner_id", "is", null)
    .lt("played_at", cutoff)
    .limit(200)

  let confirmed = 0
  for (const m of overdue || []) {
    const r = await applyLeagueConfirm(admin, m.id)
    if (r.ok) confirmed++
  }
  return NextResponse.json({ ok: true, confirmed })
}

export const GET = run
export const POST = run
