import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { gibGutscheinFrei } from "@/lib/gutschein"
import { NextRequest, NextResponse } from "next/server"

// Vom Turnier abmelden. Gab es bisher nicht: wer sich einmal angemeldet hatte,
// belegte den Platz für immer — auch wenn er gar nicht kommen konnte.
export const runtime = "nodejs"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: t } = await admin
    .from("player_tournaments")
    .select("id,status")
    .eq("id", id)
    .maybeSingle()
  if (!t) return NextResponse.json({ error: "Turnier nicht gefunden" }, { status: 404 })

  // Sobald das Bracket steht, geht es nicht mehr — sonst reisst man Löcher hinein.
  if (t.status !== "open") {
    return NextResponse.json({ error: "Das Turnier läuft bereits — eine Abmeldung ist nicht mehr möglich" }, { status: 400 })
  }

  // Vor dem Loeschen die id merken: die Gutschein-Einloesung haengt daran,
  // und danach gibt es die Zeile nicht mehr.
  const { data: meine } = await admin
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", id)
    .eq("player_id", user.id)
    .maybeSingle()

  const { error } = await admin
    .from("tournament_registrations")
    .delete()
    .eq("tournament_id", id)
    .eq("player_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Echte Abmeldung → Kontingent zurueck.
  if (meine?.id) await gibGutscheinFrei(admin, "tournament", meine.id)

  return NextResponse.json({ ok: true })
}
