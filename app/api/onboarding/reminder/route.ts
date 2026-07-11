import { createAdminClient } from "@/lib/supabase/admin"
import { sendOnboardingReminder } from "@/lib/email"
import { NextRequest, NextResponse } from "next/server"

// Cron: erinnert alle, die sich vor mehr als 24h registriert, das Onboarding aber
// nie abgeschlossen haben (level is null). Jeder bekommt die Mail genau einmal.
export const runtime = "nodejs"

async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  const { data: stuck } = await admin
    .from("profiles")
    .select("id,email,created_at,onboarding_reminded_at")
    .is("level", null)
    .is("onboarding_reminded_at", null)
    .lt("created_at", cutoff)
    .limit(100)

  let sent = 0
  for (const p of stuck || []) {
    if (!p.email) continue
    const r = await sendOnboardingReminder({ to: p.email })
    // Auch bei fehlendem API-Key (skipped) markieren wir NICHT — sonst geht die
    // Erinnerung verloren, sobald der Key gesetzt wird.
    if (r.ok) {
      await admin.from("profiles").update({ onboarding_reminded_at: new Date().toISOString() }).eq("id", p.id)
      sent++
    }
  }

  return NextResponse.json({ ok: true, candidates: (stuck || []).length, sent })
}

export const GET = run
export const POST = run
