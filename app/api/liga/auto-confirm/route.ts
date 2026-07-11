import { createAdminClient } from "@/lib/supabase/admin"
import { autoConfirmOverdue } from "@/lib/cron-tasks"
import { NextRequest, NextResponse } from "next/server"

// Bestätigt Liga-Matches automatisch, wenn der Gegner 24h nicht reagiert.
// Läuft über /api/cron/daily und zusätzlich bei jedem Öffnen der Liga (/api/liga/tick).
// Diese Route bleibt für manuelle Aufrufe bestehen.
async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const confirmed = await autoConfirmOverdue(createAdminClient())
  return NextResponse.json({ ok: true, confirmed })
}

export const GET = run
export const POST = run
