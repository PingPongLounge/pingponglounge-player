import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { STAFF_EMAILS } from "@/lib/staff"
export async function POST(req: NextRequest) {
  const body = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email||"")) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const { data, error } = await sb.from("league_seasons").insert({ ...body, created_by: user.id }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}