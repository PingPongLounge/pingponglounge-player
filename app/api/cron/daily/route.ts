import { createAdminClient } from "@/lib/supabase/admin"
import { autoConfirmOverdue, remindStuckOnboarding, expireOldChallenges } from "@/lib/cron-tasks"
import { ensureOpenGames } from "@/lib/opengames"
import { releaseStaleReservations } from "@/lib/tournaments"
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
  const expired = await expireOldChallenges(admin)

  let angelegt = 0
  try { angelegt = await ensureOpenGames(admin) }
  catch (e) { console.error("Open Games anlegen fehlgeschlagen:", e) }

  let penalties = 0
  try { penalties = await applyMonthlyPenalties(admin) }
  catch (e) { console.error("Monatsabrechnung fehlgeschlagen:", e) }

  let warned = 0
  try { warned = await warnMonthlyOpen(admin) }
  catch (e) { console.error("Monats-Warnungen fehlgeschlagen:", e) }

  let freigegeben = 0
  try { freigegeben = await releaseStaleReservations(admin) }
  catch (e) { console.error("Turnier-Reservierungen freigeben fehlgeschlagen:", e) }

  // Der alte Inaktivitäts-Abzug (/api/liga/inactivity) ist abgeschaltet.
  // Es gilt nur die EINE Aktivitätsregel der globalen Liga aus rewards.ts
  // (aktuell 3 gewertete Matches pro Kalendermonat). Optionale Seasons dürfen
  // keinen zusätzlichen Rating-Abzug auslösen.

  return NextResponse.json({ ok: true, confirmed, reminded, expired, angelegt, penalties, warned, freigegeben })
}

export const GET = run
export const POST = run
