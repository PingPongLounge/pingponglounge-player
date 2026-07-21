import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureMembership, globalLeagueId } from "@/lib/liga"
import { NextResponse } from "next/server"

// Es gibt kein "Liga beitreten" mehr. Es gibt EINE Liga, und wer ein fertiges
// Profil hat (Name + Level), steht automatisch drin. Diese Route trägt den
// eingeloggten Spieler ein — idempotent, beliebig oft aufrufbar.
// Ein mitgeschicktes season_id wird bewusst IGNORIERT: sonst könnte sich
// jemand per Deeplink in eine fremde, private Firmen-Liga eintragen. Der
// Zugang dorthin läuft ausschliesslich über den Einladungscode.
export async function POST() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  // Ohne abgeschlossenes Onboarding kein Eintrag: sonst steht ein namenloser
  // Spieler ohne Level in der Tabelle.
  const { data: prof } = await admin.from("profiles").select("level,name").eq("id", user.id).maybeSingle()
  if (!prof?.level || !prof?.name) {
    return NextResponse.json({ error: "Schliess zuerst dein Profil ab", needsOnboarding: true }, { status: 400 })
  }

  const seasonId = await ensureMembership(admin, user.id)
  if (!seasonId) return NextResponse.json({ error: "Keine Liga gefunden" }, { status: 500 })
  return NextResponse.json({ ok: true, season_id: seasonId })
}

// Damit die App die eine Liga abfragen kann, ohne sie zu erraten.
export async function GET() {
  const id = await globalLeagueId(createAdminClient())
  return NextResponse.json({ season_id: id })
}
