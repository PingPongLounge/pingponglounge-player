import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: match } = await admin.from("league_matches")
    .select("p2_id, status").eq("id", match_id).single()
  if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (match.p2_id !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  if (match.status !== "challenge_sent")
    return NextResponse.json({ error: "Nicht mehr offen" }, { status: 400 })

  const { error } = await admin.from("league_matches")
    .update({ status: "pending" })
    .eq("id", match_id).eq("status", "challenge_sent")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
