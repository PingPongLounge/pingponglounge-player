import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { SINGLE_NIGHT_PLAETZE } from "@/lib/opengames"

// Kommende Single Nights mit freien Plätzen (nur Aggregat, keine Personendaten).
export const runtime = "nodejs"

export async function GET() {
  const admin = createAdminClient()
  const heute = new Date().toISOString().slice(0, 10)
  const { data: events } = await admin
    .from("open_games")
    .select("id,date,start_hour,location_name,max_players,status")
    .eq("kind", "single_night")
    .in("status", ["open", "full"])
    .gte("date", heute)
    .order("date", { ascending: true })
    .limit(10)

  const ids = (events || []).map(e => e.id)
  const used: Record<string, number> = {}
  if (ids.length > 0) {
    const nowIso = new Date().toISOString()
    const { data: bk } = await admin
      .from("single_night_bookings")
      .select("event_id,persons,payment_status,reserved_until")
      .in("event_id", ids)
    for (const b of bk || []) {
      const active = b.payment_status === "paid" || (b.payment_status === "reserved" && b.reserved_until && b.reserved_until > nowIso)
      if (active) used[b.event_id] = (used[b.event_id] || 0) + Number(b.persons || 1)
    }
  }

  const list = (events || []).map(e => {
    const plaetze = Number(e.max_players ?? SINGLE_NIGHT_PLAETZE)
    return {
      id: e.id, date: e.date, start_hour: e.start_hour, location_name: e.location_name,
      plaetze, frei: Math.max(0, plaetze - (used[e.id] || 0)),
    }
  })
  return NextResponse.json({ events: list })
}
