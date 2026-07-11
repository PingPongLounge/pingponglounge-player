import { createAdminClient } from "@/lib/supabase/admin"
import { autoConfirmOverdue, remindStuckOnboarding } from "@/lib/cron-tasks"
import { NextRequest, NextResponse } from "next/server"

// EIN täglicher Cron für alles — der Vercel-Hobby-Plan erlaubt nur tägliche Crons
// und nur wenige davon. Mehrere Einträge (oder ein stündlicher) lassen das
// Deployment komplett scheitern.
export const runtime = "nodejs"

async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const confirmed = await autoConfirmOverdue(admin)
  const reminded = await remindStuckOnboarding(admin)

  // Inaktivitäts-Abzug läuft weiter in seiner eigenen Route
  let inactivity: unknown = null
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"
    const r = await fetch(`${base}/api/liga/inactivity`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(20000),
    })
    inactivity = await r.json().catch(() => null)
  } catch (e) {
    console.error("Inaktivitäts-Lauf fehlgeschlagen:", e)
  }

  return NextResponse.json({ ok: true, confirmed, reminded, inactivity })
}

export const GET = run
export const POST = run
