import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: match } = await sb
    .from("open_matches")
    .select("creator_id,status")
    .eq("id", params.id)
    .single()

  if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (match.creator_id !== user.id) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  await sb.from("open_matches").update({ status: "cancelled" }).eq("id", params.id)
  return NextResponse.json({ ok: true })
}