import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

const VALID = ["heart", "fire", "laugh"] as const

export async function POST(req: NextRequest) {
  const { message_id, type } = await req.json()
  if (!VALID.includes(type)) return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("message_reactions")
    .select("id")
    .eq("message_id", message_id)
    .eq("user_id", user.id)
    .eq("type", type)
    .maybeSingle()

  if (existing) {
    await admin.from("message_reactions").delete().eq("id", existing.id)
  } else {
    await admin.from("message_reactions").insert({ message_id, user_id: user.id, type })
  }
  return NextResponse.json({ ok: true })
}
