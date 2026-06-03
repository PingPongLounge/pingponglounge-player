import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data, error } = await sb
    .from("open_matches")
    .select("id,level,city,proposed_time,message,status,created_at,creator_id,joiner_id,creator:profiles!open_matches_creator_id_fkey(name,elo,level)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(30)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data || [] })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { level, city, proposed_time, message } = await req.json()
  if (!level || !city) return NextResponse.json({ error: "Level und Stadt sind Pflichtfelder" }, { status: 400 })

  // Nur 1 offenes Match pro Spieler
  const { data: existing } = await sb
    .from("open_matches")
    .select("id")
    .eq("creator_id", user.id)
    .eq("status", "open")
    .maybeSingle()

  if (existing) return NextResponse.json({ error: "Du hast bereits ein offenes Match" }, { status: 409 })

  const { data, error } = await sb
    .from("open_matches")
    .insert({ creator_id: user.id, level, city, proposed_time: proposed_time || null, message: message || null })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}