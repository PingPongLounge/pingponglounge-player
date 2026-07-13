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

  // Aktivitätspflicht: den Vormonat abrechnen, ab dem 25. warnen.
  // Die Abrechnung läuft JEDEN Tag, nicht nur am 1. — sie ist idempotent
  // (elo_history.note), und fiel der Cron am 1. aus, wurde der Monat vorher
  // nie nachgeholt.
  let penalties = 0
  try { penalties = await applyMonthlyPenalties(admin) }
  catch (e) { console.error("Monatsabrechnung fehlgeschlagen:", e) }

  let warned = 0
  try { warned = await warnMonthlyOpen(admin) }
  catch (e) { console.error("Monats-Warnungen fehlgeschlagen:", e) }


  // Inaktivitäts-Abzug läuft weiter in seiner eigenen Route
  let inactivity: unknown = null
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"
    // POST, nicht GET: die Route exportiert nur POST — der Aufruf lief bisher
    // in einen 405, der Inaktivitäts-Abzug hat also nie stattgefunden.
    const r = await fetch(`${base}/api/liga/inactivity`, {
      method: "POST",
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
