import { createAdminClient } from "@/lib/supabase/admin"
import { belegung, naechsteWartelistenPos, seedWert, selfRatingElo, SELF_RATINGS } from "@/lib/tournaments"
import { NextRequest, NextResponse } from "next/server"

// ANMELDUNG ÜBER PING PONG LOUNGE (Gast, ohne Player-Konto)
// KEIN Login nötig. Gast gibt Name, E-Mail und eine verständliche
// Selbsteinschätzung an. Diese Route wird von der Webseite (andere Domain)
// serverseitig aufgerufen — deshalb bewusst ohne Auth, aber mit strenger
// Validierung. Die Selbsteinschätzung ist KEIN Elo; intern wird sie nur als
// Setzwert (seeding_value) gespeichert.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const first = String(body.first_name || "").trim().slice(0, 60)
  const last = String(body.last_name || "").trim().slice(0, 60)
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120)
  const phone = body.phone ? String(body.phone).trim().slice(0, 40) : null
  const self = String(body.self_rating || "")
  const consent = body.consent === true

  if (!first || !last) return NextResponse.json({ error: "Vor- und Nachname nötig" }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Gültige E-Mail nötig" }, { status: 400 })
  if (!SELF_RATINGS.some(r => r.key === self)) return NextResponse.json({ error: "Bitte Spielstärke wählen" }, { status: 400 })
  if (!consent) return NextResponse.json({ error: "Bitte den Bedingungen zustimmen" }, { status: 400 })

  const admin = createAdminClient()
  const { data: t } = await admin.from("player_tournaments")
    .select("id,status,max_players,payment_mode,entry_fee_chf,registration_deadline,published_web")
    .eq("id", id).single()
  if (!t) return NextResponse.json({ error: "Turnier nicht gefunden" }, { status: 404 })
  if (!t.published_web) return NextResponse.json({ error: "Turnier nicht für Gäste geöffnet" }, { status: 403 })
  if (!["open", "published", "registration_open"].includes(t.status))
    return NextResponse.json({ error: "Anmeldung nicht möglich" }, { status: 400 })
  if (t.registration_deadline && t.registration_deadline < new Date().toISOString())
    return NextResponse.json({ error: "Anmeldeschluss vorbei" }, { status: 400 })

  // Schon mit dieser E-Mail angemeldet? (idempotent — kein Doppel)
  const { data: schon } = await admin.from("tournament_registrations")
    .select("id,waitlist").eq("tournament_id", id).is("player_id", null).ilike("email", email).maybeSingle()
  if (schon) return NextResponse.json({ ok: true, already: true, waitlist: schon.waitlist })

  const bezahltNoetig = t.payment_mode === "online" && Number(t.entry_fee_chf) > 0
  const b = await belegung(admin, id, t.max_players)
  const aufWarteliste = b.voll
  const wlPos = aufWarteliste ? await naechsteWartelistenPos(admin, id) : null

  const { data: reg, error } = await admin.from("tournament_registrations").insert({
    tournament_id: id, player_id: null,
    reg_type: "guest", source: "ppl_web",
    first_name: first, last_name: last, email, phone,
    self_rating: self, consent: true,
    seeding_value: seedWert({ reg_type: "guest", self_rating: self }) ?? selfRatingElo(self),
    payment_status: aufWarteliste ? "none" : (bezahltNoetig ? "none" : "free"),
    amount_chf: bezahltNoetig ? t.entry_fee_chf : 0,
    waitlist: aufWarteliste, waitlist_pos: wlPos,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.code === "23505" ? "Bereits angemeldet" : error.message }, { status: 400 })

  return NextResponse.json({
    ok: true, registration_id: reg.id,
    waitlist: aufWarteliste, waitlist_pos: wlPos,
    needsPayment: bezahltNoetig && !aufWarteliste,
  })
}
