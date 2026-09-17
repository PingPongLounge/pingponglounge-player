import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimited, clientIp } from "@/lib/ratelimit"
import { normCode, vorschau, type Eventart } from "@/lib/gutschein"
import { OG_PREIS_CHF, snTicket } from "@/lib/opengames"

/* Was der Knopf "ANWENDEN" aufruft.
   Diese Route ist reine Auskunft: sie reserviert nichts und aendert nichts.
   Der verbindliche Rabatt entsteht erst im Checkout, mit derselben Pruefung
   noch einmal — was hier angezeigt wird, entscheidet nichts.

   Wichtig: Der PREIS kommt auch hier nicht vom Browser. Er wird aus dem Event
   geladen, genau wie im Checkout. Sonst koennte man sich den Rabatt auf einen
   erfundenen Betrag anzeigen lassen.

   Ratenbegrenzt, sonst laesst sich die Gutscheintabelle durchprobieren. */
export const runtime = "nodejs"

const ARTEN: Eventart[] = ["tournament", "open_game", "single_night"]

export async function POST(req: NextRequest) {
  if (rateLimited(`gs:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ ok: false, meldung: "Zu viele Versuche. Bitte kurz warten." }, { status: 429 })
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const code = normCode(body.code)
  const art = String(body.art || "") as Eventart
  const eventId = String(body.event_id || "")
  const ticketKey = String(body.ticket_type || "")

  if (!code) return NextResponse.json({ ok: false, meldung: "Bitte einen Code eingeben." }, { status: 400 })
  if (!ARTEN.includes(art)) return NextResponse.json({ ok: false, meldung: "Unbekannte Veranstaltungsart." }, { status: 400 })
  if (!eventId) return NextResponse.json({ ok: false, meldung: "Veranstaltung fehlt." }, { status: 400 })

  const admin = createAdminClient()

  // Preis aus der Veranstaltung — dieselbe Quelle wie im Checkout.
  let preis = 0
  let standort: string | null = null
  if (art === "tournament") {
    const { data: t } = await admin.from("player_tournaments")
      .select("entry_fee_chf,city,payment_mode").eq("id", eventId).maybeSingle()
    if (!t) return NextResponse.json({ ok: false, meldung: "Turnier nicht gefunden." }, { status: 404 })
    preis = Number(t.entry_fee_chf) || 0
    standort = t.city ?? null
  } else {
    const { data: g } = await admin.from("open_games")
      .select("price_per_player,location_name,kind").eq("id", eventId).maybeSingle()
    if (!g) return NextResponse.json({ ok: false, meldung: "Veranstaltung nicht gefunden." }, { status: 404 })
    if (art === "single_night") {
      const t = snTicket(ticketKey)
      if (!t) return NextResponse.json({ ok: false, meldung: "Bitte zuerst ein Ticket wählen." }, { status: 400 })
      preis = t.price
      standort = null
    } else {
      preis = Number(g.price_per_player ?? OG_PREIS_CHF)
      standort = g.location_name ?? null
    }
  }

  if (preis <= 0) return NextResponse.json({ ok: false, meldung: "Für diese Veranstaltung ist keine Zahlung nötig." }, { status: 400 })

  const g = await vorschau(admin, { code, art, preisChf: preis, eventId, standort })
  if (!g.ok) return NextResponse.json({ ok: false, grund: g.grund, meldung: g.meldung }, { status: 200 })

  return NextResponse.json({
    ok: true,
    code: g.code,
    prozent: g.prozent,
    preisVorher: g.preisVorher,
    preisNachher: g.preisNachher,
  })
}
