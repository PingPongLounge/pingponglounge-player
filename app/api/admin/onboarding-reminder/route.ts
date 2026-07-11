import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { remindStuckOnboarding } from "@/lib/cron-tasks"
import { STAFF_EMAILS } from "@/lib/staff"
import { NextResponse } from "next/server"

// Erinnerungs-Mails an alle, die im Onboarding hängen — von Hand auslösbar.
// Nur für Staff. Der tägliche Cron macht dasselbe automatisch.
export const runtime = "nodejs"

export async function POST() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email || "")) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  }

  const sent = await remindStuckOnboarding(createAdminClient())
  return NextResponse.json({ ok: true, sent })
}
