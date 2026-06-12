import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb.from("league_matches")
    .select("p2_id, status").eq("id", match_id).single()
  if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (match.p2_id !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  if (match.status !== "challenge_sent")
    return NextResponse.json({ error: "Nicht mehr offen" }, { status: 400 })

  const { data: updated } = await sb.from("league_matches")
    .update({ status: "pending" })
    .eq("id", match_id).eq("status", "challenge_sent")
    .select("id").single()
  if (!updated) return NextResponse.json({ ok: true }) // idempotent

  return NextResponse.json({ ok: true })
}