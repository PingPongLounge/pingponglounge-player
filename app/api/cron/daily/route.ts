import { createAdminClient } from "@/lib/supabase/admin"
import { autoConfirmOverdue, remindStuckOnboarding, expireOldChallenges } from "@/lib/cron-tasks"
import { ensureOpenGames } from "@/lib/opengames"
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
  const expired = await expireOldChallenges(admin)   // Forderungen verfallen nach 7 Tagen

  // Offizielle Open Games für die nächsten drei Wochen anlegen (idempotent).
  let angelegt = 0
  try { angelegt = await ensureOpenGames(admin) }
  catch (e) { console.error("Open Games anlegen fehlgeschlagen:", e) }

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

  // Der alte Inaktivitäts-Abzug (/api/liga/inactivity) ist ABGESCHALTET. Er zog
  // ebenfalls −20 ELO und lief zusammen mit der Monatspflicht — ein durchgehend
  // inaktiver Spieler hätte pro Monat bis zu 40 verloren. Die Monatspflicht
  // (4 Matches/Monat) ist der Nachfolger; ein Abzug reicht.

  return NextResponse.json({ ok: true, confirmed, reminded, expired, angelegt, penalties, warned })
}

export const GET = run
export const POST = run
