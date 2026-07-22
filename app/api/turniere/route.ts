import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRechte, darfStandort, darfVerwalten } from "@/lib/roles"
import { NextRequest, NextResponse } from "next/server"

// LISTE
// Öffentlich sichtbar sind Turniere, die auf Player veröffentlicht sind
// (published_player) und nicht Entwurf/privat. Ein Query-Flag ?web=1 liefert
// die Sicht für die Webseite (published_web) — dieselbe Datenbank, anderer
// Sichtbarkeits-Filter.
export async function GET(req: NextRequest) {
  const admin = createAdminClient()
  const web = req.nextUrl.searchParams.get("web") === "1"

  let q = admin.from("player_tournaments")
    .select("id,name,date,start_time,city,location_id,skill_class,max_players,min_players,status,format,entry_fee_chf,currency,payment_mode,counts_for_rank,audience,description,registration_deadline,published_player,published_web,visibility,created_at,tournament_registrations(count)")
    .in("status", ["published", "registration_open", "open", "full", "waitlist", "running", "finished"])
    .neq("visibility", "private")
    .order("date", { ascending: true })

  q = web ? q.eq("published_web", true) : q.eq("published_player", true)
  const { data } = await q
  return NextResponse.json({ tournaments: data || [] })
}

// ERSTELLEN
// Zentrale Admins dürfen für jeden Standort anlegen; Standortmanager nur für die
// eigenen Standorte. Normale Spieler dürfen KEIN offizielles Turnier mehr
// anlegen — für die zentrale Turnierlogik (Standort, Zahlung, Franchise-Rechte)
// ist das Self-Service-Anlegen nicht mehr sinnvoll.
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const rechte = await getRechte(admin, user.id, user.email)
  if (!darfVerwalten(rechte)) return NextResponse.json({ error: "Keine Berechtigung zum Anlegen" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || "").trim().slice(0, 100)
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 })

  const location_id = body.location_id ? String(body.location_id) : null
  if (!darfStandort(rechte, location_id))
    return NextResponse.json({ error: "Für diesen Standort nicht berechtigt" }, { status: 403 })

  const allowedSizes = [4, 8, 16, 32, 64]
  const max_players = allowedSizes.includes(Number(body.max_players)) ? Number(body.max_players) : 32
  const min_players = Math.max(2, Math.min(max_players, Number(body.min_players) || 4))
  const format = ["ko", "gruppen_ko"].includes(body.format) ? body.format : "ko"
  const payment_mode = ["online", "onsite", "free"].includes(body.payment_mode) ? body.payment_mode : "onsite"
  const entry_fee_chf = Math.max(0, Math.min(999, Number(body.entry_fee_chf) || 0))

  // Standort-Stadt aus der locations-Tabelle ableiten (eine Quelle).
  let city: string | null = body.city ? String(body.city).slice(0, 80) : null
  if (location_id) {
    const { data: loc } = await admin.from("locations").select("city").eq("id", location_id).maybeSingle()
    if (loc?.city) city = loc.city
  }

  const insert = {
    name, city, location_id,
    organizer: rechte.isCentral ? (body.organizer ? String(body.organizer).slice(0, 80) : null) : (rechte.locationIds[0] || null),
    date: body.date ? String(body.date).slice(0, 10) : null,
    start_time: body.start_time ? String(body.start_time).slice(0, 5) : null,
    end_time: body.end_time ? String(body.end_time).slice(0, 5) : null,
    registration_deadline: body.registration_deadline ? new Date(body.registration_deadline).toISOString() : null,
    skill_class: String(body.skill_class || "alle").slice(0, 40),
    audience: body.audience ? String(body.audience).slice(0, 120) : null,
    description: body.description ? String(body.description).slice(0, 2000) : null,
    rules: body.rules ? String(body.rules).slice(0, 2000) : null,
    format, payment_mode, entry_fee_chf,
    currency: "CHF",
    max_players, min_players,
    counts_for_rank: body.counts_for_rank !== false,
    visibility: ["public", "unlisted", "private"].includes(body.visibility) ? body.visibility : "public",
    published_player: body.published_player !== false,
    published_web: body.published_web === true,
    template_id: body.template_id ? String(body.template_id) : null,
    created_by: user.id,
    status: body.status === "draft" ? "draft" : "registration_open",
  }

  const { data, error } = await admin.from("player_tournaments").insert(insert).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
