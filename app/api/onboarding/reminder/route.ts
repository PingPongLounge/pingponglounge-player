import { createAdminClient } from "@/lib/supabase/admin"
import { remindStuckOnboarding } from "@/lib/cron-tasks"
import { NextRequest, NextResponse } from "next/server"

// Erinnert alle, die sich vor über 24h registriert, das Onboarding aber nie
// abgeschlossen haben. Läuft über /api/cron/daily; diese Route bleibt für
// manuelle Aufrufe bestehen.
export const runtime = "nodejs"

async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sent = await remindStuckOnboarding(createAdminClient())
  return NextResponse.json({ ok: true, sent })
}

export const GET = run
export const POST = run
