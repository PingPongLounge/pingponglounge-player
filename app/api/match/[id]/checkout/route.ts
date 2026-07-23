import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { OG_PREIS_CHF, gruppeFuerLevel, startZeit } from "@/lib/opengames"
import { PP_CHF, PP_CONFIG, SIGNUP_BONUS_LOCKED_UNTIL_FIRST_PAYMENT } from "@/lib/rewards"

// Einen Platz in einem offiziellen Open Game kaufen.
// Der Preis kommt NIE vom Client — er steht serverseitig in lib/opengames.ts.
// Der Platz wird erst im Webhook vergeben, nach tatsächlich erfolgter Zahlung.
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

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  // Schon dabei?
  const { data: dabei } = await admin
    .from("open_game_players")
    .select("id,status")
    .eq("game_id", id).eq("user_id", user.id).neq("status", "left")
    .maybeSingle()
  if (dabei) return NextResponse.json({ error: "Du bist schon angemeldet" }, { status: 400 })

  // Passt der Spieler in die Gruppe? Ein Level-6-Spieler im Einstieg-Abend
  // nimmt den Anfängern genau den Spass, für den sie gekommen sind.
  const { data: prof } = await admin.from("profiles").select("level,name").eq("id", user.id).maybeSingle()
  if (!prof?.level) {
    return NextResponse.json({ error: "Schliess zuerst dein Profil ab", needsOnboarding: true }, { status: 400 })
  }
  // Training ist für ALLE Level offen — keine Gruppen-Prüfung. Nur bei Open
  // Games muss der Spieler in die Stärkeklasse des Abends passen.
  if (game.kind !== "training") {
    const meine = gruppeFuerLevel(prof.level)
    const gruppeDesSpiels = game.level === "4-7" ? "pro" : "einstieg"
    if (meine !== gruppeDesSpiels) {
      return NextResponse.json({
        error: `Dieser Abend ist für ${gruppeDesSpiels === "pro" ? "Level 4–7" : "Level 1–3"} — du bist Level ${prof.level}`,
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
  if (wantRedeem) {
    const kosten = Math.round(chf / PP_CHF)
    const { data: tx } = await admin.from("ping_points_transactions").select("amount,source").eq("player_id", user.id)
    const balance = (tx || []).reduce((s, t) => s + (t.amount || 0), 0)
    // Willkommensbonus erst nach der ersten bezahlten Aktivität einlösbar —
    // sonst holt sich ein frisches Konto sofort ein gratis Training. Solange
    // noch keine echte Zahlung/Podest-Gutschrift vorliegt, zählt der Bonus nicht
    // zum einlösbaren Guthaben.
    const hatBezahlt = (tx || []).some(t => (t.amount || 0) > 0 && t.source !== "welcome")
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
      game_id: game.id, user_id: user.id, display_name: prof.name || "Spieler",
      status: "confirmed", paid: true, amount_chf: 0, redeemed_points: kosten, redeem_ref: ref,
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
    metadata: {
      type: "open_game",
      game_id: game.id,
      user_id: user.id,
      player_name: prof.name || "Spieler",
    },
    success_url: `${BASE_URL}/match/${game.id}?bezahlt=1`,
    cancel_url: `${BASE_URL}/match/${game.id}?abgebrochen=1`,
  })

  return NextResponse.json({ url: session.url })
}
