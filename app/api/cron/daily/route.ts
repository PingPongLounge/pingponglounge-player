import { createAdminClient } from "@/lib/supabase/admin"
import { autoConfirmOverdue, remindStuckOnboarding } from "@/lib/cron-tasks"
import { applyMonthlyPenalties, warnMonthlyOpen } from "@/lib/monthly"
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

  // Aktivitätspflicht: am 1. den Vormonat abrechnen, ab dem 25. warnen.
  // Beides idempotent — läuft der Cron doppelt, passiert nichts.
  let penalties = 0
  if (new Date().getDate() === 1) {
    try { penalties = await applyMonthlyPenalties(admin) }
    catch (e) { console.error("Monatsabrechnung fehlgeschlagen:", e) }
  }

  let warned = 0
  try { warned = await warnMonthlyOpen(admin) }
  catch (e) { console.error("Monats-Warnungen fehlgeschlagen:", e) }


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

  return NextResponse.json({ ok: true, confirmed, reminded, penalties, warned, inactivity })
}

export const GET = run
export const POST = run
