import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// GET: die letzten Benachrichtigungen + ungelesen-Zähler.
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()

  const { data } = await admin.from("notifications")
    .select("id,type,title,body,link,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
  const unread = (data || []).filter(n => !n.read_at).length
  return NextResponse.json({ notifications: data || [], unread })
}

// POST { id } oder { all:true } → als gelesen markieren.
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const body = await req.json().catch(() => ({}))
  const jetzt = new Date().toISOString()

  let q = admin.from("notifications").update({ read_at: jetzt }).eq("user_id", user.id).is("read_at", null)
  if (!body.all && body.id) q = admin.from("notifications").update({ read_at: jetzt }).eq("user_id", user.id).eq("id", String(body.id))
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
