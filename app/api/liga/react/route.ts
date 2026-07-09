import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { match_id, type } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from("match_reactions").select("id").eq("match_id", match_id).eq("user_id", user.id).eq("type", type).maybeSingle()
  if (existing) {
    await admin.from("match_reactions").delete().eq("id", existing.id)
  } else {
    await admin.from("match_reactions").insert({ match_id, user_id: user.id, type })
  }
  return NextResponse.json({ ok: true })
}
