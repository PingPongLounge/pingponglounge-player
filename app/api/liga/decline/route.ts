import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { notify } from "@/lib/notify"

// Ein eingetragenes Liga-Ergebnis ABLEHNEN.
// Vorher gab es dafür keinen Weg: der Gegner konnte nur bestätigen oder per
// Mail „anfechten" — und nach 24 h wurde das Resultat trotzdem automatisch
// bestätigt (autoConfirmOverdue greift bei status="p1_entered"). Ein Spieler
// konnte so gegen jeden ein Match anlegen, ein Ergebnis eintragen und dem
// Gegner ungewollt ELO abnehmen. Ablehnen setzt das Match zurück auf
// "accepted" (nichts wird gewertet, keine Auto-Bestätigung mehr) und bittet
// die Beteiligten, das korrekte Ergebnis abzusprechen.
export async function POST(req: NextRequest) {
  const { match_id } = await req.json().catch(() => ({}))
  if (!match_id) return NextResponse.json({ error: "match_id fehlt" }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: match } = await admin
    .from("league_matches")
    .select("p1_id,p2_id,status,entered_by")
    .eq("id", match_id)
    .single()

  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.p1_id !== user.id && match.p2_id !== user.id)
    return NextResponse.json({ error: "Kein Teilnehmer" }, { status: 403 })
  if (match.status !== "p1_entered")
    return NextResponse.json({ error: "Kein offenes Ergebnis zum Ablehnen" }, { status: 400 })
  // Nur der Gegner (nicht der Eintragende) darf ablehnen.
  if (match.entered_by === user.id)
    return NextResponse.json({ error: "Du kannst dein eigenes Ergebnis nicht ablehnen" }, { status: 403 })

  // Zurück auf "accepted" — nur wenn noch "p1_entered" (verhindert Race mit
  // gleichzeitiger Auto-/Handbestätigung). Ergebnis wird verworfen.
  const { data: upd } = await admin
    .from("league_matches")
    .update({ status: "accepted", sets: null, winner_id: null, entered_at: null, entered_by: null })
    .eq("id", match_id)
    .eq("status", "p1_entered")
    .select("id")
    .maybeSingle()
  if (!upd) return NextResponse.json({ error: "Bereits verarbeitet" }, { status: 409 })

  // Ausstehenden Chat-Post entfernen (wird bei erneutem Eintragen neu erzeugt).
  await admin.from("league_messages").delete().eq("match_id", match_id).eq("kind", "match")

  // Eintragenden benachrichtigen.
  try {
    const { data: meProf } = await admin.from("public_profiles").select("name").eq("id", user.id).maybeSingle()
    await notify(admin, match.entered_by, "result_declined", `${meProf?.name || "Dein Gegner"} hat das Resultat abgelehnt`, {
      body: "Sprecht euch ab und tragt das korrekte Ergebnis neu ein.", link: "/liga",
    })
  } catch (e) { console.error("Notify (Resultat abgelehnt) fehlgeschlagen:", e) }

  return NextResponse.json({ ok: true })
}
