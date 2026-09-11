import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { OG_PREIS_CHF, OG_GAST_STAERKEN, gastGruppe, gruppeDesAbends, gruppeFuerLevel, startZeit } from "@/lib/opengames"
import { PP_CHF, PP_CONFIG, SIGNUP_BONUS_LOCKED_UNTIL_FIRST_PAYMENT } from "@/lib/rewards"
import { erlaubteBasis, erlaubterPfad } from "@/lib/return-base"

// Einen Platz in einem offiziellen Open Game kaufen.
// Der Preis kommt NIE vom Client — er steht serverseitig in lib/opengames.ts.
// Der Platz wird erst im Webhook vergeben, nach tatsächlich erfolgter Zahlung.
//
// 11.09.2026 — ZWEI WEGE, EINE LOGIK.
// Diese Route bedient jetzt auch Gäste ohne Player-Konto: pingponglounge.ch
// ruft sie serverseitig auf und schickt statt eines Logins einen guest-Block
// mit Name, E-Mail, Telefon und Selbsteinschätzung mit. Alles danach ist
// identisch — dieselbe Kapazitätsprüfung, dieselbe Gruppenzuordnung
// (gruppeFuerLevel), derselbe Preis, dieselbe Stripe-Session, derselbe
// Webhook und dieselbe Teilnehmertabelle. Es gibt keine zweite Anmeldung.
//
// Was für Gäste NICHT gilt: PingPoints. Weder einlösen noch gutschreiben —
// Punkte hängen an einem Konto, und ein Gast hat keins.
export const runtime = "nodejs"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const wantRedeem = body?.redeem === true   // "PingPoints einlösen?" → Ja

  // Gastdaten von der Webseite. Ohne guest-Block verhält sich die Route
  // exakt wie bisher.
  const rohGast = (body?.guest ?? null) as Record<string, unknown> | null
  const gast = rohGast && typeof rohGast === "object" ? {
    name: String(rohGast.name || "").trim().slice(0, 80),
    email: String(rohGast.email || "").trim().toLowerCase().slice(0, 120),
    phone: String(rohGast.phone || "").trim().slice(0, 40),
    staerke: String(rohGast.staerke || "").trim(),
  } : null

  // Wohin nach der Zahlung? Gleiche Absicherung wie bei Turnier und Single
  // Night: nur eigene Pfade, Basis gegen eine feste Liste — kein Open-Redirect.
  const successPath = erlaubterPfad(body?.success_path, `/match/${id}?bezahlt=1`)
  const cancelPath = erlaubterPfad(body?.cancel_path, `/match/${id}?abgebrochen=1`)
  const returnBase = erlaubteBasis(body?.return_base, BASE_URL)

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user && !gast) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!user && gast) {
    if (!gast.name) return NextResponse.json({ error: "Bitte Name angeben." }, { status: 400 })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gast.email))
      return NextResponse.json({ error: "Bitte gültige E-Mail angeben." }, { status: 400 })
    if (!OG_GAST_STAERKEN.some(x => x.key === gast.staerke))
      return NextResponse.json({ error: "Bitte deine Spielstärke wählen." }, { status: 400 })
    if (wantRedeem)
      return NextResponse.json({ error: "PingPoints gibt es nur mit Player-Konto." }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: game } = await admin
    .from("open_games")
    .select("id,is_official,kind,status,date,start_hour,max_players,current_players,price_per_player,level,location_name")
    .eq("id", id)
    .maybeSingle()

  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })
  if (!game.is_official) return NextResponse.json({ error: "Dieses Spiel ist kostenlos" }, { status: 400 })
  if (game.status !== "open") return NextResponse.json({ error: "Nicht mehr buchbar" }, { status: 400 })
  if (startZeit(game) < new Date()) return NextResponse.json({ error: "Termin ist vorbei" }, { status: 400 })
  if ((game.current_players ?? 0) >= (game.max_players ?? 6)) {
    return NextResponse.json({ error: "Ausgebucht" }, { status: 400 })
  }

  // Schon dabei? Player über die user_id, Gast über seine E-Mail — dieselbe
  // Frage, zwei Schlüssel.
  if (user) {
    const { data: dabei } = await admin
      .from("open_game_players")
      .select("id,status")
      .eq("game_id", id).eq("user_id", user.id).neq("status", "left")
      .maybeSingle()
    if (dabei) return NextResponse.json({ error: "Du bist schon angemeldet" }, { status: 400 })
  } else {
    const { data: dabei } = await admin
      .from("open_game_players")
      .select("id,status")
      .eq("game_id", id).ilike("guest_email", gast!.email).neq("status", "left")
      .maybeSingle()
    if (dabei) return NextResponse.json({ error: "Für diese E-Mail besteht schon eine Anmeldung für diesen Abend." }, { status: 409 })
  }

  // In welche Stärkegruppe gehört, wer hier bucht?
  //   Player: aus dem Profil-Level (gruppeFuerLevel)
  //   Gast:   aus seiner Selbsteinschätzung — über DIESELBE Funktion
  // Ein Level-6-Spieler im Einstieg-Abend nimmt den Anfängern genau den
  // Spass, für den sie gekommen sind; das gilt für beide gleich.
  let meineGruppe: "einstieg" | "pro" | null = null
  let anzeigeName = "Spieler"
  let profLevel: string | number | null = null
  if (user) {
    const { data: prof } = await admin.from("profiles").select("level,name").eq("id", user.id).maybeSingle()
    if (!prof?.level) {
      return NextResponse.json({ error: "Schliess zuerst dein Profil ab", needsOnboarding: true }, { status: 400 })
    }
    profLevel = prof.level
    meineGruppe = gruppeFuerLevel(prof.level)
    anzeigeName = prof.name || "Spieler"
  } else {
    meineGruppe = gastGruppe(gast!.staerke)
    anzeigeName = gast!.name.split(/\s+/)[0] || "Gast"
  }

  // Training ist für ALLE Level offen — keine Gruppen-Prüfung. Und ein Abend
  // mit level="alle" ist eben für alle: gruppeDesAbends gibt dafür null
  // zurück, damit niemand abgewiesen wird.
  if (game.kind !== "training") {
    const verlangt = gruppeDesAbends(game.level)
    if (verlangt && meineGruppe !== verlangt) {
      return NextResponse.json({
        error: `Dieser Abend ist für ${verlangt === "pro" ? "Level 4–7" : "Level 1–3"}`
          + (profLevel ? ` — du bist Level ${profLevel}` : "."),
      }, { status: 400 })
    }
  }

  // Preis serverseitig
  const chf = Number(game.price_per_player ?? OG_PREIS_CHF)
  const isTraining = game.kind === "training"
  const titel = isTraining ? `Training ${game.location_name}` : `Open Game ${game.location_name}`

  // PingPoints einlösen: GANZ oder gar nicht — keine anteilige Zahlung. Man
  // braucht genug Punkte für den VOLLEN Preis (1 Punkt = CHF 1). Dann geht
  // die Buchung gratis über Punkte, ohne Stripe.
  // PingPoints nur mit Konto. Ein Gast kommt hier nie an (oben abgefangen),
  // der Zusatz ist der Riegel dagegen, dass das jemand später übersieht.
  if (user && wantRedeem) {
    const kosten = Math.round(chf / PP_CHF)
    const { data: tx } = await admin.from("ping_points_transactions").select("amount,source").eq("player_id", user.id)
    // numerische Spalte kommt als String zurück → in Zahl wandeln, sonst
    // ergäbe "0" + "0.5" den String "00.5".
    const balance = (tx || []).reduce((s, t) => s + Number(t.amount || 0), 0)
    // Willkommensbonus erst nach der ersten bezahlten Aktivität einlösbar —
    // sonst holt sich ein frisches Konto sofort ein gratis Training. Solange
    // noch keine echte Zahlung/Podest-Gutschrift vorliegt, zählt der Bonus nicht
    // zum einlösbaren Guthaben.
    const hatBezahlt = (tx || []).some(t => Number(t.amount || 0) > 0 && t.source !== "welcome")
    const einloesbar = SIGNUP_BONUS_LOCKED_UNTIL_FIRST_PAYMENT && !hatBezahlt
      ? balance - PP_CONFIG.signupBonus
      : balance
    if (einloesbar < kosten) {
      const grund = SIGNUP_BONUS_LOCKED_UNTIL_FIRST_PAYMENT && !hatBezahlt
        ? `Dein Willkommensbonus (${PP_CONFIG.signupBonus}) wird erst nach deiner ersten bezahlten Buchung einlösbar.`
        : `Nicht genug PingPoints — du brauchst ${kosten}, einlösbar sind ${einloesbar}.`
      return NextResponse.json({ error: grund, zuWenigPunkte: true }, { status: 400 })
    }
    const ref = `pp-${crypto.randomUUID()}`
    const { error: insErr } = await admin.from("open_game_players").insert({
      game_id: game.id, user_id: user.id, display_name: anzeigeName,
      status: "confirmed", paid: true, amount_chf: 0, redeemed_points: kosten, redeem_ref: ref,
      source: "player",
    })
    if (insErr) return NextResponse.json({ error: "Du bist schon angemeldet" }, { status: 400 })
    await admin.from("ping_points_transactions").insert({
      player_id: user.id, amount: -kosten, source: "booking_redeem",
      description: `${isTraining ? "Training" : "Open Game"} — ${game.location_name}`, ref_id: ref,
    })
    const neu = (game.current_players ?? 0) + 1
    await admin.from("open_games").update({
      current_players: neu, status: neu >= (game.max_players ?? 6) ? "full" : "open",
      updated_at: new Date().toISOString(),
    }).eq("id", game.id)
    return NextResponse.json({ gratis: true, redirect: `/match/${game.id}?bezahlt=1` })
  }

  // Normale Zahlung: voller Preis über Stripe.
  const stripe = getStripe()
  const datum = new Date(game.date).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long" })
  const zeit = `${String(game.start_hour ?? 19).padStart(2, "0")}:00`

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(chf * 100),
        product_data: { name: titel, description: `${datum}, ${zeit}` },
      },
    }],
    // Der Webhook vergibt den Platz. Er braucht deshalb alles, was in die
    // Teilnehmerzeile gehört — beim Gast steht hier statt der user_id seine
    // Identität. Stripe-Metadaten sind Strings, darum die leeren Vorgaben.
    customer_email: user ? undefined : gast!.email,
    metadata: {
      type: "open_game",
      game_id: game.id,
      user_id: user ? user.id : "",
      player_name: anzeigeName,
      source: user ? "player" : "ppl_web",
      guest_name: user ? "" : gast!.name,
      guest_email: user ? "" : gast!.email,
      guest_phone: user ? "" : gast!.phone,
      guest_level: user ? "" : (meineGruppe ?? ""),
    },
    success_url: `${returnBase}${successPath}`,
    cancel_url: `${returnBase}${cancelPath}`,
  })

  return NextResponse.json({ url: session.url })
}
