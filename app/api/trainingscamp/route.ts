import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CAMP_SESSIONS, CAMP_MAX_PER_SESSION } from "@/lib/camp"
import { campBelegung } from "@/lib/camp-server"

// Öffentliche Camp-Übersicht: Einheiten mit freien Plätzen. Wenn eingeloggt,
// zusätzlich die eigenen bereits gebuchten/reservierten Einheiten.
export const runtime = "nodejs"

export async function GET() {
  const admin = createAdminClient()
  const counts = await campBelegung(admin)

  const sessions = CAMP_SESSIONS.map(s => ({
    id: s.id, date: s.date, part: s.part, label: s.label, start: s.start, end: s.end,
    max: CAMP_MAX_PER_SESSION,
    belegt: counts[s.id] || 0,
    frei: Math.max(0, CAMP_MAX_PER_SESSION - (counts[s.id] || 0)),
  }))

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const meineSessions: string[] = []
  if (user) {
    const { data } = await admin.from("camp_bookings")
      .select("session_ids").eq("user_id", user.id).in("payment_status", ["paid", "reserved"])
    for (const b of data || []) for (const s of (b.session_ids || [])) meineSessions.push(s)
  }

  return NextResponse.json({ sessions, meineSessions, eingeloggt: !!user })
}
