import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyLeagueConfirm } from "@/lib/liga"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb
    .from("league_matches")
    .select("p1_id,p2_id,status,entered_by")
    .eq("id", match_id)
    .single()

  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.p2_id !== user.id && match.p1_id !== user.id)
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  if (match.status !== "p1_entered")
    return NextResponse.json({ error: "Nichts zu bestätigen" }, { status: 400 })
  // Nur der Gegner (nicht der Eintragende) darf bestätigen
  if ((match as { entered_by?: string }).entered_by === user.id)
    return NextResponse.json({ error: "Du kannst dein eigenes Ergebnis nicht bestätigen" }, { status: 403 })

  const admin = createAdminClient()
  const res = await applyLeagueConfirm(admin, match_id)
  if (!res.ok && res.reason === "not_pending") return NextResponse.json({ error: "Nichts zu bestätigen" }, { status: 400 })
  return NextResponse.json({ ok: true })
}
