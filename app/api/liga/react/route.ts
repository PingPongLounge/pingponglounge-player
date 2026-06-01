import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
export async function POST(req: NextRequest) {
  const { match_id, type } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: existing } = await sb.from("match_reactions").select("id").eq("match_id", match_id).eq("user_id", user.id).eq("type", type).single()
  if (existing) {
    await sb.from("match_reactions").delete().eq("id", existing.id)
  } else {
    await sb.from("match_reactions").insert({ match_id, user_id: user.id, type })
  }
  return NextResponse.json({ ok: true })
}