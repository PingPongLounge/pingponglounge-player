import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { OG_PREIS_CHF, gruppeFuerLevel, startZeit } from "@/lib/opengames"

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
        product_data: {
          name: `Open Game ${game.location_name}`,
          description: `${datum}, ${zeit} · Level ${game.level} · 4 Stunden`,
        },
      },
    }],
    // Der Webhook braucht diese Angaben, um den Platz zu vergeben.
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
