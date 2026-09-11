import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { PP_CONFIG } from "@/lib/rewards"
import { sessionUuid } from "@/lib/stripe-util"
import { melde, sendBookingConfirm, sendEmail, sendTournamentConfirm, sendTournamentStaffNotice } from "@/lib/email"
import { entryQrFor, weekdayOf, SINGLE_NIGHT_PLAETZE } from "@/lib/opengames"
import { belegung, SELF_RATINGS } from "@/lib/tournaments"
import { CAMP_MAX_PER_SESSION } from "@/lib/camp"
import { campBelegung } from "@/lib/camp-server"

// Stripe-Webhook: schreibt PingPoints NUR nach einer tatsächlich bezahlten Buchung.
// Ohne diesen Webhook könnte man sich durch Aufruf von /buchen?paid=1 Punkte erschleichen.
export const runtime = "nodejs"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key)
}


export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get("stripe-signature")
  if (!secret || !sig) return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (e) {
    console.error("Stripe Webhook Signatur ungültig:", e)
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 })
  }

  // TURNIER: Reservierung läuft ab, ohne dass bezahlt wurde → Platz freigeben,
  // damit er nicht dauerhaft blockiert bleibt.
  if (event.type === "checkout.session.expired") {
    const s = event.data.object as Stripe.Checkout.Session
    if (s.metadata?.type === "tournament" && s.metadata.registration_id) {
      const admin = createAdminClient()
      // Nur freigeben, wenn noch nicht bezahlt (Race mit completed vermeiden).
      const { data: reg } = await admin.from("tournament_registrations")
        .select("payment_status").eq("id", s.metadata.registration_id).maybeSingle()
      if (reg && !["paid", "free"].includes(reg.payment_status)) {
        await admin.from("tournament_registrations")
          .update({ payment_status: "none", reserved_until: null, stripe_session_id: null })
          .eq("id", s.metadata.registration_id)
      }
    }
    // CAMP: Reservierung abgelaufen ohne Zahlung → freigeben.
    if (s.metadata?.type === "camp" && s.metadata.booking_id) {
      const admin = createAdminClient()
      await admin.from("camp_bookings")
        .update({ payment_status: "cancelled", reserved_until: null })
        .eq("id", s.metadata.booking_id).eq("payment_status", "reserved")
    }
    // SINGLE NIGHT: Reservierung abgelaufen ohne Zahlung → freigeben.
    if (s.metadata?.type === "single_night" && s.metadata.booking_id) {
      const admin = createAdminClient()
      await admin.from("single_night_bookings")
        .update({ payment_status: "cancelled", reserved_until: null })
        .eq("id", s.metadata.booking_id).eq("payment_status", "reserved")
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session

    // CAMP: Zahlung eingegangen → Plätze endgültig. Überbuchungs-Recheck
    // (Schutz gegen Race), sonst Sicherheits-Refund. PingPoints idempotent.
    if (s.payment_status === "paid" && s.metadata?.type === "camp" && s.metadata.booking_id) {
      const admin = createAdminClient()
      const bid = s.metadata.booking_id
      const { data: b } = await admin.from("camp_bookings").select("*").eq("id", bid).maybeSingle()
      if (b && b.payment_status !== "paid" && b.payment_status !== "cancelled") {
        const counts = await campBelegung(admin)
        // eigene (noch reservierte) Buchung aus der Zählung nehmen
        for (const sid of (b.session_ids || [])) counts[sid] = Math.max(0, (counts[sid] || 1) - 1)
        const voll = (b.session_ids || []).filter((sid: string) => (counts[sid] || 0) >= CAMP_MAX_PER_SESSION)
        if (voll.length > 0) {
          try { if (s.payment_intent) await getStripe().refunds.create({ payment_intent: String(s.payment_intent) }) }
          catch (e) { console.error("Camp-Refund (Überbuchung) fehlgeschlagen:", e) }
          await admin.from("camp_bookings").update({
            payment_status: "cancelled", reserved_until: null,
            stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
          }).eq("id", bid)
        } else {
          const { data: upd } = await admin.from("camp_bookings").update({
            payment_status: "paid", reserved_until: null,
            stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
          }).eq("id", bid).neq("payment_status", "paid").select("id").maybeSingle()
          if (upd) {
            // Bestätigungsmail mit Storno-Link — für Gäste (Token) UND Eingeloggte.
            try {
              let to: string | null = b.guest_email || null
              if (!to && b.user_id) {
                const { data: authU } = await admin.auth.admin.getUserById(b.user_id)
                to = authU?.user?.email || null
              }
              if (to) {
                const base = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"
                const stornoLink = b.cancel_token ? `${base}/trainingscamp/storno?token=${b.cancel_token}` : `${base}/trainingscamp`
                const anzahl = (b.session_ids || []).length
                await sendEmail({
                  to,
                  subject: "Trainingscamp — Buchung bestätigt",
                  html: `<div style="font-family:system-ui,sans-serif;color:#111">
                    <h2>Buchung bestätigt 🏓</h2>
                    <p>Danke für deine Anmeldung zum Trainingscamp — <b>${anzahl} Einheit${anzahl > 1 ? "en" : ""}</b>, CHF ${b.amount_chf}.</p>
                    <p>Wir freuen uns auf dich!</p>
                    <p style="margin-top:20px;font-size:14px;color:#555">Verhindert? Du kannst bis 7 Tage vor der ersten Einheit gratis stornieren:<br>
                    <a href="${stornoLink}">Buchung stornieren</a></p>
                  </div>`,
                })
              }
            } catch (e) { console.error("Camp-Bestätigungsmail fehlgeschlagen:", e) }
            if (b.user_id) {
              try {
                await admin.from("ping_points_transactions").insert({
                  player_id: b.user_id, amount: PP_CONFIG.perPaidBooking, source: "booking_paid",
                  description: "Trainingscamp", ref_id: sessionUuid(s.id),
                })
              } catch { /* Unique-Index verhindert Doppelgutschrift */ }
            }
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    // TURNIER: Zahlung eingegangen → Platz endgültig bestätigt, Bestätigung raus.
    if (s.payment_status === "paid" && s.metadata?.type === "tournament" && s.metadata.registration_id) {
      const admin = createAdminClient()
      // IDEMPOTENZ: Stripe stellt mindestens einmal zu und wiederholt bei
      // jeder Nicht-2xx-Antwort. Ohne Filter lief das Update jedes Mal durch,
      // lieferte eine Zeile zurueck und schickte eine WEITERE Bestaetigung.
      // Mit .neq("payment_status","paid") trifft die Wiederholung keine Zeile
      // mehr -> reg ist null -> keine zweite Mail. Bezahlt bleibt bezahlt.
      const { data: reg } = await admin.from("tournament_registrations")
        .update({ payment_status: "paid", reserved_until: null })
        .eq("id", s.metadata.registration_id)
        .neq("payment_status", "paid")
        .select("email,first_name,last_name,phone,self_rating,amount_chf,tournament_id,waitlist,waitlist_pos")
        .maybeSingle()

      // Bisher endete der Vorgang hier — der Gast zahlte und bekam nichts.
      if (reg?.email) {
        const { data: t } = await admin.from("player_tournaments")
          .select("name,date,start_time,end_time,city,max_players").eq("id", reg.tournament_id).maybeSingle()
        const datumLabel = t?.date
          ? new Date(`${t.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
          : "Termin folgt"
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
          startgeldChf: Number(reg.amount_chf) || 0,
          bezahlt: true,
          turnierUrl: `https://pingponglounge.ch/turniere/${reg.tournament_id}`,
          }),
        ) // wirft nie — Zahlung darf nie am Mailversand scheitern

        // Interne Meldung. Hier und NUR hier fuer onlinebezahlte Anmeldungen —
        // register-guest haelt sich in genau diesem Fall zurueck. Weil dieser
        // Zweig durch .neq("payment_status","paid") nur beim ERSTEN Mal
        // erreicht wird, meldet auch eine Webhook-Wiederholung nicht nochmals.
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
            zahlungsstatus: `bezahlt · CHF ${Number(reg.amount_chf) || 0}`,
            warteliste: !!reg.waitlist,
            wartelistenPos: reg.waitlist_pos,
            belegt: staffBel?.belegt ?? null,
            max: t?.max_players ?? null,
            turnierId: reg.tournament_id,
          }),
        ) // wirft nie
      }
      return NextResponse.json({ received: true })
    }

    // OPEN GAME: Der Platz wird ERST HIER vergeben — nach tatsächlich erfolgter
    // Zahlung. Wer die Kasse abbricht, hat nie einen Platz belegt.
    if (s.payment_status === "paid" && s.metadata?.type === "open_game") {
      const gameId = s.metadata.game_id
      /* 11.09.: Ein Platz kann jetzt einem Player ODER einem Gast von
         pingponglounge.ch gehoeren. Alles andere in diesem Zweig — Kapazitaet,
         Ueberbuchungs-Refund, Idempotenz, Zaehler, Mail — bleibt gleich.
         Nur PingPoints gibt es weiterhin ausschliesslich fuer Konten. */
      const userId = s.metadata.user_id || ""
      const gastEmail = (s.metadata.guest_email || "").trim().toLowerCase()
      const istGast = !userId && !!gastEmail
      const admin = createAdminClient()

      if (gameId && (userId || gastEmail)) {
        const { data: game } = await admin
          .from("open_games")
          .select("id,max_players,current_players,status,location_name,price_per_player,date,start_hour,kind")
          .eq("id", gameId).maybeSingle()

        // Ausgebucht, während der Spieler an der Kasse stand? Dann Geld zurück.
        const voll = !game || game.status !== "open" ||
          (game.current_players ?? 0) >= (game.max_players ?? 6)

        if (voll) {
          try {
            if (s.payment_intent) {
              await getStripe().refunds.create({ payment_intent: String(s.payment_intent) })
            }
          } catch (e) {
            console.error("Rückerstattung nach Überbuchung fehlgeschlagen:", e)
          }
        } else {
          const { data: prof } = userId
            ? await admin.from("profiles").select("name").eq("id", userId).maybeSingle()
            : { data: null as { name?: string } | null }

          /* Idempotent ueber einen Unique-Index — beim Player (game_id,
             user_id), beim Gast (game_id, lower(guest_email)). Feuert der
             Webhook zweimal, entsteht in beiden Faellen kein zweiter Platz. */
          const { error: insErr } = await admin.from("open_game_players").insert({
            game_id: gameId,
            user_id: userId || null,
            display_name: prof?.name || s.metadata.player_name || (istGast ? "Gast" : "Spieler"),
            status: "confirmed",
            paid: true,
            amount_chf: game.price_per_player ?? null,
            stripe_session_id: s.id,
            stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
            source: istGast ? "ppl_web" : "player",
            guest_name: istGast ? (s.metadata.guest_name || null) : null,
            guest_email: istGast ? gastEmail : null,
            guest_phone: istGast ? (s.metadata.guest_phone || null) : null,
            guest_level: istGast ? (s.metadata.guest_level || null) : null,
          })

          if (insErr) {
            // Der Spieler ist schon drin. Zwei Faelle sehen an dieser Stelle
            // gleich aus, brauchen aber das Gegenteil voneinander:
            //
            //   a) ECHTE DOPPELZAHLUNG (zwei Tabs, zwei Stripe-Sessions):
            //      der zweite Platz entsteht dank Unique-Index nicht, die
            //      zweite Zahlung muss zurueck.
            //   b) WIEDERHOLUNG DESSELBEN WEBHOOKS (Stripe liefert mindestens
            //      einmal und wiederholt bei jeder Nicht-2xx-Antwort): es gab
            //      nur EINE Zahlung. Frueher landete auch dieser Fall im
            //      Refund — der Spieler behielt seinen Platz und bekam sein
            //      Geld zurueck.
            //
            // Unterschieden wird an der Session-ID der bereits gespeicherten
            // Zeile: ist es dieselbe Session, war es dieselbe Zahlung.
            const vorhandenQuery = admin.from("open_game_players")
              .select("stripe_session_id").eq("game_id", gameId)
            const { data: vorhanden } = await (istGast
              ? vorhandenQuery.ilike("guest_email", gastEmail)
              : vorhandenQuery.eq("user_id", userId)).maybeSingle()

            if (vorhanden?.stripe_session_id === s.id) {
              console.log("Open Game: Webhook-Wiederholung fuer dieselbe Session, nichts zu tun —", s.id)
            } else {
              try {
                if (s.payment_intent) await getStripe().refunds.create({ payment_intent: String(s.payment_intent) })
              } catch (e) { console.error("Refund bei Doppelzahlung fehlgeschlagen:", e) }
            }
          } else {
            await admin.from("open_games").update({
              current_players: (game.current_players ?? 0) + 1,
              status: (game.current_players ?? 0) + 1 >= (game.max_players ?? 6) ? "full" : "open",
              updated_at: new Date().toISOString(),
            }).eq("id", gameId)

            // PingPoints für die bezahlte Buchung — idempotent über die
            // Session-ID. Nur mit Konto: Punkte gehoeren einem Spielerprofil,
            // ein Gast hat keins.
            if (userId) {
              const refId = sessionUuid(s.id)
              const { data: schon } = await admin.from("ping_points_transactions")
                .select("id").eq("player_id", userId).eq("ref_id", refId).maybeSingle()
              if (!schon) {
                await admin.from("ping_points_transactions").insert({
                  player_id: userId,
                  amount: PP_CONFIG.perPaidBooking,
                  source: "booking_paid",
                  description: `Open Game${game.location_name ? ` — ${game.location_name}` : ""}`,
                  ref_id: refId,
                })
              }
            }

            // Bestätigungsmail mit Zutritts-QR (falls Standort/Tag einen hat).
            // Fehler beim Mailen dürfen die Buchung nie scheitern lassen.
            try {
              // Player: Adresse aus dem Konto. Gast: die, mit der er gebucht hat.
              let email: string | undefined
              if (userId) {
                const { data: authU } = await admin.auth.admin.getUserById(userId)
                email = authU?.user?.email
              } else {
                email = gastEmail || undefined
              }
              if (email) {
                const wt = game.date ? weekdayOf(game.date) : -1
                const hatZutritt = !!(game.date && entryQrFor(game.location_name, wt))
                const d = game.date ? new Date(`${game.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long" }) : ""
                const isTraining = game.kind === "training"
                const zeit = `${String(game.start_hour ?? 19).padStart(2, "0")}:00`
                await sendBookingConfirm({
                  to: email,
                  name: prof?.name || s.metadata.player_name || (istGast ? "Gast" : "Spieler"),
                  isTraining,
                  location: game.location_name || "",
                  whenLabel: `${d}${d ? " · " : ""}${zeit}${isTraining ? "–20:30" : ""}`,
                  priceChf: Number(game.price_per_player ?? 0),
                  hatZutritt,
                  // Ein Gast hat kein Player-Konto — ihn in die App zu
                  // schicken, hiesse ihn vor eine Anmeldemaske zu stellen.
                  appUrl: istGast
                    ? "https://pingponglounge.ch/events/open-games"
                    : `https://playerapp.ch/match/${gameId}`,
                })
              }
            } catch (e) {
              console.error("Bestätigungsmail (Open Game/Training) fehlgeschlagen:", e)
            }
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    // SINGLE NIGHT: Zahlung eingegangen → Ticket fest. Überkapazitäts-Recheck,
    // sonst Sicherheits-Refund. Bestätigungsmail mit Storno-Link. PP idempotent.
    if (s.payment_status === "paid" && s.metadata?.type === "single_night" && s.metadata.booking_id) {
      const admin = createAdminClient()
      const bid = s.metadata.booking_id
      const { data: b } = await admin.from("single_night_bookings").select("*").eq("id", bid).maybeSingle()
      if (b && b.payment_status !== "paid" && b.payment_status !== "cancelled") {
        const nowIso = new Date().toISOString()
        const { data: ev } = await admin.from("open_games").select("max_players").eq("id", b.event_id).maybeSingle()
        const { data: others } = await admin.from("single_night_bookings").select("id,persons,payment_status,reserved_until").eq("event_id", b.event_id)
        let used = 0
        for (const o of others || []) {
          if (o.id === bid) continue
          const active = o.payment_status === "paid" || (o.payment_status === "reserved" && o.reserved_until && o.reserved_until > nowIso)
          if (active) used += Number(o.persons || 1)
        }
        const kap = Number(ev?.max_players ?? SINGLE_NIGHT_PLAETZE)
        if (used + Number(b.persons || 1) > kap) {
          try { if (s.payment_intent) await getStripe().refunds.create({ payment_intent: String(s.payment_intent) }) }
          catch (e) { console.error("Single-Night-Refund (Überbuchung) fehlgeschlagen:", e) }
          await admin.from("single_night_bookings").update({
            payment_status: "cancelled", reserved_until: null,
            stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
          }).eq("id", bid)
        } else {
          const { data: upd } = await admin.from("single_night_bookings").update({
            payment_status: "paid", reserved_until: null,
            stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
          }).eq("id", bid).neq("payment_status", "paid").select("id").maybeSingle()
          if (upd) {
            try {
              let to: string | null = b.guest_email || null
              if (!to && b.user_id) { const { data: authU } = await admin.auth.admin.getUserById(b.user_id); to = authU?.user?.email || null }
              if (to) {
                const base = process.env.NEXT_PUBLIC_BASE_URL || "https://playerapp.ch"
                const stornoLink = b.cancel_token ? `${base}/single-night/storno?token=${b.cancel_token}` : `${base}/single-night`
                await sendEmail({
                  to,
                  subject: "Single Night — Ticket bestätigt",
                  html: `<div style="font-family:system-ui,sans-serif;color:#111">
                    <h2>Ticket bestätigt 🏓</h2>
                    <p>Dein Single-Night-Ticket (${b.persons > 1 ? "2 Personen" : "1 Person"}) ist gesichert. CHF ${b.amount_chf}.</p>
                    <p>Los geht's um 19:00 — Ticket an der Bar zeigen, Welcome Drink ist inklusive.</p>
                    <p style="margin-top:20px;font-size:14px;color:#555">Verhindert? Absage bis 24 h vorher — Geld zurück:<br>
                    <a href="${stornoLink}">Ticket stornieren</a></p>
                  </div>`,
                })
              }
            } catch (e) { console.error("Single-Night-Bestätigungsmail fehlgeschlagen:", e) }
            if (b.user_id) {
              try {
                await admin.from("ping_points_transactions").insert({
                  player_id: b.user_id, amount: PP_CONFIG.perPaidBooking, source: "booking_paid",
                  description: "Single Night", ref_id: sessionUuid(s.id),
                })
              } catch { /* Unique-Index verhindert Doppelgutschrift */ }
            }
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    if (s.payment_status === "paid") {
      const playerId = s.metadata?.player_id || ""
      if (playerId) {
        const admin = createAdminClient()
        const refId = sessionUuid(s.id)

        // Idempotent: dieselbe Stripe-Session schreibt nie zweimal gut
        const { data: existing } = await admin
          .from("ping_points_transactions")
          .select("id")
          .eq("player_id", playerId)
          .eq("source", "booking_paid")
          .eq("ref_id", refId)
          .maybeSingle()

        if (!existing) {
          const rows: Array<Record<string, unknown>> = [{
            player_id: playerId,
            amount: PP_CONFIG.perPaidBooking,
            source: "booking_paid",
            description: `Buchung bezahlt${s.metadata?.location_name ? ` — ${s.metadata.location_name}` : ""}`,
            ref_id: refId,
          }]

          // Eingelöste Punkte erst hier abziehen — nicht schon beim Checkout.
          // Sonst wären die Punkte weg, auch wenn der Kunde die Bezahlung abbricht.
          const eingeloest = parseInt(s.metadata?.redeemed_points || "0", 10)
          if (Number.isInteger(eingeloest) && eingeloest > 0) {
            rows.push({
              player_id: playerId,
              amount: -eingeloest,
              source: "redeem",
              description: "Rabatt auf Buchung",
              ref_id: refId,
            })
          }

          await admin.from("ping_points_transactions").insert(rows)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
