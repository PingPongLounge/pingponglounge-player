import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { autoConfirmOverdue } from "@/lib/cron-tasks"
import { NextResponse } from "next/server"

// Wird beim Öffnen der Liga aufgerufen und bestätigt überfällige Ergebnisse.
// Grund: der Hobby-Plan erlaubt nur EINEN täglichen Cron — ohne diesen Aufruf
// würde die 24h-Frist erst beim nächsten nächtlichen Lauf greifen (also bis zu 48h).
export const runtime = "nodejs"

export async function POST() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const confirmed = await autoConfirmOverdue(createAdminClient())
  return NextResponse.json({ ok: true, confirmed })
}
