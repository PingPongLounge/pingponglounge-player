import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { belegung, naechsteWartelistenPos, seedWert } from "@/lib/tournaments"
import { NextRequest, NextResponse } from "next/server"

// ANMELDUNG ÜBER PLAYER
// Der eingeloggte Nutzer wird mit seinen Profildaten angemeldet — er muss seine
// Stärke nicht selbst angeben. Zusätzlich speichern wir eine MOMENTAUFNAHME
// (Elo/Level/Rang bei Anmeldung); das Profil-Elo darf sich danach weiter ändern.
//
// Bei kostenlosen / Vor-Ort-Turnieren ist die Anmeldung sofort gültig. Bei
// Online-Zahlung entsteht hier nur ein reservierter Platz; bezahlt wird über
// die Checkout-Route, und erst der Webhook setzt payment_status='paid'.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: t } = await admin.from("player_tournaments")
    .select("id,status,max_players,payment_mode,entry_fee_chf,registration_deadline")
    .eq("id", id).single()
  if (!t) return NextResponse.json({ error: "Turnier nicht gefunden" }, { status: 404 })
  if (!["open", "published", "registration_open"].includes(t.status))
    return NextResponse.json({ error: "Anmeldung nicht möglich" }, { status: 400 })
  if (t.registration_deadline && t.registration_deadline < new Date().toISOString())
    return NextResponse.json({ error: "Anmeldeschluss vorbei" }, { status: 400 })

  // Schon angemeldet? (idempotent)
  const { data: schon } = await admin.from("tournament_registrations")
    .select("id,waitlist,payment_status").eq("tournament_id", id).eq("player_id", user.id).maybeSingle()
  if (schon) return NextResponse.json({ ok: true, already: true, waitlist: schon.waitlist, payment_status: schon.payment_status })

  // Momentaufnahme aus dem Profil
  const { data: prof } = await admin.from("profiles").select("name,elo,level").eq("id", user.id).maybeSingle()
  if (!prof?.name) return NextResponse.json({ error: "Profil unvollständig", needsOnboarding: true }, { status: 400 })
  // Relevanter Rang = Position in der globalen Rangliste nach Elo.
  const { count: besser } = await admin.from("profiles")
    .select("id", { count: "exact", head: true })
    .not("elo", "is", null).gt("elo", prof.elo ?? 1000)
  const rank = (besser ?? 0) + 1

  const bezahltNoetig = t.payment_mode === "online" && Number(t.entry_fee_chf) > 0
  const b = await belegung(admin, id, t.max_players)
  const aufWarteliste = b.voll
  const wlPos = aufWarteliste ? await naechsteWartelistenPos(admin, id) : null

  const seed = seedWert({ reg_type: "player", elo_at_signup: prof.elo, level_at_signup: prof.level })

  const { data: reg, error } = await admin.from("tournament_registrations").insert({
    tournament_id: id, player_id: user.id,
    reg_type: "player", source: "player",
    elo_at_signup: prof.elo, level_at_signup: prof.level, rank_at_signup: rank,
    seeding_value: seed,
    // Gratis/Vor-Ort → sofort gültig; Online → erst nach Zahlung (Checkout-Route)
    payment_status: aufWarteliste ? "none" : (bezahltNoetig ? "none" : "free"),
    amount_chf: bezahltNoetig ? t.entry_fee_chf : 0,
    waitlist: aufWarteliste, waitlist_pos: wlPos,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.code === "23505" ? "Bereits angemeldet" : error.message }, { status: 400 })

  return NextResponse.json({
    ok: true, registration_id: reg.id,
    waitlist: aufWarteliste, waitlist_pos: wlPos,
    // Signal fürs Frontend: Online-Turnier → als Nächstes zur Zahlung.
    needsPayment: bezahltNoetig && !aufWarteliste,
  })
}
