import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { STAFF_EMAILS } from "@/lib/staff"
import { NextRequest, NextResponse } from "next/server"

// Ein Spieler wünscht sich eine Liga in seiner Stadt. Bisher stand jemand aus
// einer Stadt ohne Liga vor einer leeren Seite — und war weg.
// (Nicht zu verwechseln mit /api/liga/request — das ist die Firmen-Liga.)
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { city, note } = await req.json()
  if (!city || typeof city !== "string") return NextResponse.json({ error: "Bitte eine Stadt angeben" }, { status: 400 })

  const admin = createAdminClient()

  // Schon offen? Dann nicht doppelt anlegen.
  const { data: vorhanden } = await admin
    .from("league_requests")
    .select("id")
    .eq("player_id", user.id)
    .eq("city", city)
    .eq("status", "open")
    .maybeSingle()
  if (vorhanden) {
    const { count } = await admin.from("league_requests")
      .select("id", { count: "exact", head: true })
      .eq("city", city).eq("status", "open")
    return NextResponse.json({ ok: true, already: true, count: count ?? 1 })
  }

  const { data: profile } = await admin.from("profiles").select("name,level,email").eq("id", user.id).maybeSingle()

  const { error } = await admin.from("league_requests").insert({
    player_id: user.id,
    city: city.trim().slice(0, 60),
    level: profile?.level || null,
    note: note ? String(note).slice(0, 300) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Wie viele wollen dasselbe? Ab ein paar Anfragen lohnt sich eine Liga.
  const { count } = await admin
    .from("league_requests")
    .select("id", { count: "exact", head: true })
    .eq("city", city.trim())
    .eq("status", "open")

  // Staff informieren — sonst liegt die Anfrage ungesehen in der Datenbank
  try {
    await sendEmail({
      to: STAFF_EMAILS[0],
      subject: `Liga-Anfrage: ${city} (${count ?? 1} Interessenten)`,
      html: `<div style="font-family:system-ui,sans-serif">
        <p><strong>${profile?.name || "Ein Spieler"}</strong> (Level ${profile?.level || "?"} · ${profile?.email || "keine Mail"})
        wünscht sich eine Liga in <strong>${city}</strong>.</p>
        ${note ? `<p>Notiz: „${String(note).slice(0, 300)}"</p>` : ""}
        <p>Offene Anfragen für ${city}: <strong>${count ?? 1}</strong></p>
      </div>`,
    })
  } catch (e) {
    console.error("Mail an Staff fehlgeschlagen:", e)
  }

  return NextResponse.json({ ok: true, count: count ?? 1 })
}
