import type { SupabaseClient } from "@supabase/supabase-js"
import { PP_CONFIG } from "@/lib/rewards"
import { sessionUuid } from "@/lib/stripe-util"
import { melde, sendBookingConfirm, sendEmail, sendTournamentConfirm, sendTournamentStaffNotice } from "@/lib/email"
import { entryQrFor, weekdayOf, SINGLE_NIGHT_PLAETZE } from "@/lib/opengames"
import { belegung, SELF_RATINGS } from "@/lib/tournaments"
import { bestaetigeGutschein } from "@/lib/gutschein"

/* ── DER ABSCHLUSS EINER ANMELDUNG ───────────────────────────────────────────
   Bis hierher gab es zwei Wege zum bestätigten Platz: den Stripe-Webhook und —
   beim Open Game — die Vollauslösung mit PingPoints. Nur der Webhook schickte
   Mails. Wer mit Punkten gebucht hat, bekam weder Bestätigung noch Zutritts-QR,
   und das Team erfuhr nichts davon.

   Mit dem 100-%-Gutschein käme ein dritter Weg dazu. Deshalb steht der
   Abschluss jetzt hier, einmal, und jeder Weg ruft dieselbe Funktion:

     Stripe-Zahlung   →  Webhook            →  schliesseAb…()
     PingPoints voll  →  Checkout           →  schliesseAb…()
     Gutschein 100 %  →  Checkout           →  schliesseAb…()

   Was "Abschluss" umfasst: Platz vergeben bzw. Status setzen, Kapazität
   nachführen, Gutschein bestätigen, PingPoints gutschreiben (nur bei echter
   Zahlung und nur mit Konto), Bestätigungsmail mit Zutritts-QR und — beim
   Turnier — die interne Meldung ans Team.

   Kein Abschluss darf am Mailversand scheitern: die Zahlung ist da, der Platz
   gehört der Person. Mailfehler werden protokolliert, nie geworfen.           */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"

export type AbschlussErgebnis =
  | { ok: true }
  | { ok: false; grund: "voll" | "doppelt" | "nicht_gefunden" | "schon_erledigt" }

// ═══════════════════════════════════════════════════════════ OPEN GAME ══════
export type OpenGameAbschluss = {
  gameId: string
  /** Genau eins von beiden: angemeldeter Spieler oder Gast von der Webseite. */
  userId?: string | null
  gast?: { name: string; email: string; phone?: string | null; level?: string | null } | null
  anzeigeName: string
  /** Was tatsächlich bezahlt wurde. 0 bei PingPoints und bei 100 % Gutschein. */
  betragChf: number
  stripeSessionId?: string | null
  stripePaymentIntent?: string | null
  /** PingPoints für eine bezahlte Buchung — nur bei echter Zahlung. */
  punkteGutschreiben?: boolean
  /** Bei Vollauslösung mit PingPoints: wie viele, und unter welcher Referenz. */
  eingelostePunkte?: number | null
  punkteRef?: string | null
  /* Gutschein: Beim Open Game entsteht die Teilnehmerzeile erst hier, es gibt
     also vorher keine id, an der die Einlösung haengen koennte. Deshalb erzeugt
     der Checkout eine eigene Kennung, reserviert darauf und reicht sie durch
     (bei Stripe in den Metadaten). Auf sie wird hier bestaetigt. */
  gutscheinRef?: string | null
}

export async function schliesseAbOpenGame(
  admin: SupabaseClient,
  a: OpenGameAbschluss,
): Promise<AbschlussErgebnis> {
  const istGast = !a.userId && !!a.gast?.email
  const gastEmail = (a.gast?.email || "").trim().toLowerCase()

  const { data: game } = await admin
    .from("open_games")
    .select("id,max_players,current_players,status,location_name,price_per_player,date,start_hour,kind")
    .eq("id", a.gameId).maybeSingle()

  // Ausgebucht, während die Person an der Kasse stand? Der Aufrufer entscheidet,
  // was dann passiert — beim Stripe-Weg ist das eine Rückerstattung.
  if (!game || game.status !== "open" || (game.current_players ?? 0) >= (game.max_players ?? 6)) {
    return { ok: false, grund: "voll" }
  }

  const { error: insErr } = await admin.from("open_game_players").insert({
    game_id: a.gameId,
    user_id: a.userId || null,
    display_name: a.anzeigeName,
    status: "confirmed",
    paid: true,
    amount_chf: a.betragChf,
    stripe_session_id: a.stripeSessionId || null,
    stripe_payment_intent: a.stripePaymentIntent || null,
    source: istGast ? "ppl_web" : "player",
    guest_name: istGast ? (a.gast?.name || null) : null,
    guest_email: istGast ? gastEmail : null,
    guest_phone: istGast ? (a.gast?.phone || null) : null,
    guest_level: istGast ? (a.gast?.level || null) : null,
    redeemed_points: a.eingelostePunkte ?? null,
    redeem_ref: a.punkteRef ?? null,
    gutschein_ref: a.gutscheinRef ?? null,
  })
  // Der Unique-Index hält den Platz einmalig — beim Spieler über (game_id,
  // user_id), beim Gast über (game_id, lower(guest_email)).
  if (insErr) return { ok: false, grund: "doppelt" }

  const neu = (game.current_players ?? 0) + 1
  await admin.from("open_games").update({
    current_players: neu,
    status: neu >= (game.max_players ?? 6) ? "full" : "open",
    updated_at: new Date().toISOString(),
  }).eq("id", a.gameId)

  if (a.gutscheinRef) await bestaetigeGutschein(admin, "open_game", a.gutscheinRef)

  if (a.userId && a.punkteGutschreiben && a.stripeSessionId) {
    const refId = sessionUuid(a.stripeSessionId)
    const { data: schon } = await admin.from("ping_points_transactions")
      .select("id").eq("player_id", a.userId).eq("ref_id", refId).maybeSingle()
    if (!schon) {
      await admin.from("ping_points_transactions").insert({
        player_id: a.userId,
        amount: PP_CONFIG.perPaidBooking,
        source: "booking_paid",
        description: `Open Game${game.location_name ? ` — ${game.location_name}` : ""}`,
        ref_id: refId,
      })
    }
  }

  // Bestätigungsmail mit Zutritts-QR — für JEDEN Weg, auch den kostenlosen.
  // Genau das fehlte der Vollauslösung mit PingPoints.
  try {
    let email: string | undefined
    if (a.userId) {
      const { data: authU } = await admin.auth.admin.getUserById(a.userId)
      email = authU?.user?.email
    } else {
      email = gastEmail || undefined
    }
    if (email) {
      const wt = game.date ? weekdayOf(game.date) : -1
      const hatZutritt = !!(game.date && entryQrFor(game.location_name, wt))
      const d = game.date
        ? new Date(`${game.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long" })
        : ""
      const isTraining = game.kind === "training"
      const zeit = `${String(game.start_hour ?? 19).padStart(2, "0")}:00`
      await sendBookingConfirm({
        to: email,
        name: a.anzeigeName,
        isTraining,
        location: game.location_name || "",
        whenLabel: `${d}${d ? " · " : ""}${zeit}${isTraining ? "–20:30" : ""}`,
        priceChf: a.betragChf,
        hatZutritt,
        appUrl: istGast
          ? "https://pingponglounge.ch/events/open-games"
          : `https://playerapp.ch/match/${a.gameId}`,
      })
    }
  } catch (e) {
    console.error("Bestätigungsmail (Open Game/Training) fehlgeschlagen:", e)
  }

  return { ok: true }
}

// ════════════════════════════════════════════════════════════ TURNIER ═══════
/**
 * Setzt die Anmeldung auf bezahlt (oder gratis) und schickt Bestätigung und
 * Staff-Meldung. Der Filter auf den alten Zahlungsstatus ist die Idempotenz:
 * eine Webhook-Wiederholung trifft keine Zeile mehr und mailt kein zweites Mal.
 */
export async function schliesseAbTurnier(
  admin: SupabaseClient,
  regId: string,
  opts: { neuerStatus?: "paid" | "free"; gutscheinCode?: string | null; betragChf?: number | null } = {},
): Promise<AbschlussErgebnis> {
  const neuerStatus = opts.neuerStatus ?? "paid"

  const felder: Record<string, unknown> = { payment_status: neuerStatus, reserved_until: null }
  if (opts.betragChf != null) felder.amount_chf = opts.betragChf

  const { data: reg } = await admin.from("tournament_registrations")
    .update(felder)
    .eq("id", regId)
    .not("payment_status", "in", "(paid,free)")
    .select("email,first_name,last_name,phone,self_rating,amount_chf,tournament_id,waitlist,waitlist_pos")
    .maybeSingle()

  if (!reg) return { ok: false, grund: "schon_erledigt" }

  if (opts.gutscheinCode) await bestaetigeGutschein(admin, "tournament", regId)

  if (!reg.email) return { ok: true }

  const { data: t } = await admin.from("player_tournaments")
    .select("name,date,start_time,end_time,city,max_players").eq("id", reg.tournament_id).maybeSingle()
  const datumLabel = t?.date
    ? new Date(`${t.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "Termin folgt"
  const betrag = Number(reg.amount_chf) || 0

  await melde(
    "turnier_bezahlt",
    { to: reg.email, turnierId: reg.tournament_id },
    sendTournamentConfirm({
      to: reg.email,
      name: reg.first_name || "zusammen",
      turnier: t?.name || "Turnier",
      datumLabel,
      zeitLabel: t?.start_time ? `${String(t.start_time).slice(0, 5)}${t.end_time ? `–${String(t.end_time).slice(0, 5)}` : ""} Uhr` : undefined,
      ort: t?.city || undefined,
      startgeldChf: betrag,
      bezahlt: true,
      turnierUrl: `https://pingponglounge.ch/turniere/${reg.tournament_id}`,
    }),
  ) // wirft nie — Zahlung darf nie am Mailversand scheitern

  const staffBel = t ? await belegung(admin, reg.tournament_id, t.max_players ?? 32) : null
  await melde(
    "turnier_staff",
    { to: "STAFF", turnierId: reg.tournament_id },
    sendTournamentStaffNotice({
      turnier: t?.name || "Turnier",
      datumLabel,
      ort: t?.city,
      vorname: reg.first_name || "", nachname: reg.last_name || "",
      email: reg.email, telefon: reg.phone,
      spielstaerke: SELF_RATINGS.find(r => r.key === reg.self_rating)?.label ?? reg.self_rating,
      zahlungsstatus: neuerStatus === "free"
        ? `gratis · Gutschein ${opts.gutscheinCode ?? ""}`.trim()
        : `bezahlt · CHF ${betrag}`,
      warteliste: !!reg.waitlist,
      wartelistenPos: reg.waitlist_pos,
      belegt: staffBel?.belegt ?? null,
      max: t?.max_players ?? null,
      turnierId: reg.tournament_id,
    }),
  ) // wirft nie

  return { ok: true }
}

// ═══════════════════════════════════════════════════════ SINGLE NIGHT ═══════
export async function schliesseAbSingleNight(
  admin: SupabaseClient,
  bookingId: string,
  opts: { stripePaymentIntent?: string | null; gutscheinCode?: string | null; punkteGutschreiben?: boolean; stripeSessionId?: string | null } = {},
): Promise<AbschlussErgebnis> {
  const { data: b } = await admin.from("single_night_bookings").select("*").eq("id", bookingId).maybeSingle()
  if (!b) return { ok: false, grund: "nicht_gefunden" }
  if (b.payment_status === "paid" || b.payment_status === "cancelled") return { ok: false, grund: "schon_erledigt" }

  // Überkapazität prüfen — die eigene Zeile zählt dabei nicht mit.
  const nowIso = new Date().toISOString()
  const { data: ev } = await admin.from("open_games").select("max_players").eq("id", b.event_id).maybeSingle()
  const { data: others } = await admin.from("single_night_bookings")
    .select("id,persons,payment_status,reserved_until").eq("event_id", b.event_id)
  let used = 0
  for (const o of others || []) {
    if (o.id === bookingId) continue
    const aktiv = o.payment_status === "paid" || (o.payment_status === "reserved" && o.reserved_until && o.reserved_until > nowIso)
    if (aktiv) used += Number(o.persons || 1)
  }
  const kap = Number(ev?.max_players ?? SINGLE_NIGHT_PLAETZE)
  if (used + Number(b.persons || 1) > kap) return { ok: false, grund: "voll" }

  const { data: upd } = await admin.from("single_night_bookings").update({
    payment_status: "paid", reserved_until: null,
    stripe_payment_intent: opts.stripePaymentIntent || null,
  }).eq("id", bookingId).neq("payment_status", "paid").select("id").maybeSingle()
  if (!upd) return { ok: false, grund: "schon_erledigt" }

  if (opts.gutscheinCode) await bestaetigeGutschein(admin, "single_night", bookingId)

  try {
    let to: string | null = b.guest_email || null
    if (!to && b.user_id) {
      const { data: authU } = await admin.auth.admin.getUserById(b.user_id)
      to = authU?.user?.email || null
    }
    if (to) {
      const stornoLink = b.cancel_token ? `${BASE_URL}/single-night/storno?token=${b.cancel_token}` : `${BASE_URL}/single-night`
      const betrag = Number(b.amount_chf) || 0
      await sendEmail({
        to,
        subject: "Single Night — Ticket bestätigt",
        html: `<div style="font-family:system-ui,sans-serif;color:#111">
          <h2>Ticket bestätigt 🏓</h2>
          <p>Dein Single-Night-Ticket (${b.persons > 1 ? "2 Personen" : "1 Person"}) ist gesichert. ${betrag > 0 ? `CHF ${betrag}` : "Gratis mit Gutschein"}.</p>
          <p>Los geht's um 19:00 — Ticket an der Bar zeigen, Welcome Drink ist inklusive.</p>
          <p style="margin-top:20px;font-size:14px;color:#555">Verhindert? Absage bis 24 h vorher — Geld zurück:<br>
          <a href="${stornoLink}">Ticket stornieren</a></p>
        </div>`,
      })
    }
  } catch (e) { console.error("Single-Night-Bestätigungsmail fehlgeschlagen:", e) }

  if (b.user_id && opts.punkteGutschreiben && opts.stripeSessionId) {
    try {
      await admin.from("ping_points_transactions").insert({
        player_id: b.user_id, amount: PP_CONFIG.perPaidBooking, source: "booking_paid",
        description: "Single Night", ref_id: sessionUuid(opts.stripeSessionId),
      })
    } catch { /* Unique-Index verhindert Doppelgutschrift */ }
  }

  return { ok: true }
}
