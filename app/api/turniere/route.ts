import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data } = await sb
    .from("tournaments")
    .select("id,name,date,city,skill_class,max_players,status,format,created_at,tournament_registrations(count)")
    .in("status", ["open","running","finished"])
    .order("date", { ascending: true })
  return NextResponse.json({ tournaments: data || [] })
}