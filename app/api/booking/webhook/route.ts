import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { PP_CONFIG } from "@/lib/rewards"
import { sessionUuid } from "@/lib/stripe-util"
import { sendEmail } from "@/lib/email"
import { schliesseAbOpenGame, schliesseAbSingleNight, schliesseAbTurnier } from "@/lib/abschluss"
import { gibGutscheinFrei } from "@/lib/gutschein"
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
        // Ein abgebrochener Kauf darf kein Gutschein-Kontingent verbrauchen.
        await gibGutscheinFrei(admin, "tournament", s.metadata.registration_id)
      }
    }
    // OPEN GAME: hier entsteht nie eine Zeile, aber der Gutschein war gehalten.
    if (s.metadata?.type === "open_game" && s.metadata.gutschein_ref) {
      await gibGutscheinFrei(createAdminClient(), "open_game", s.metadata.gutschein_ref)
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
      await gibGutscheinFrei(admin, "single_night", s.metadata.booking_id)
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

    // TURNIER: Zahlung eingegangen → Platz endgueltig bestaetigt.
    // Der ganze Abschluss — Status, Gutschein, Bestaetigung, Staff-Meldung —
    // steht in lib/abschluss.ts, damit der 100-%-Weg exakt dasselbe tut.
    // Die Idempotenz steckt dort im Filter auf den alten Zahlungsstatus:
    // eine Webhook-Wiederholung trifft keine Zeile mehr und mailt nicht nochmal.
    if (s.payment_status === "paid" && s.metadata?.type === "tournament" && s.metadata.registration_id) {
      await schliesseAbTurnier(createAdminClient(), s.metadata.registration_id, {
        neuerStatus: "paid",
        gutscheinCode: s.metadata.gutschein_code || null,
      })
      return NextResponse.json({ received: true })
    }

    // OPEN GAME: Der Platz wird ERST HIER vergeben — nach tatsaechlich
    // erfolgter Zahlung. Wer die Kasse abbricht, hat nie einen Platz belegt.
    // Das Vergeben selbst steht in lib/abschluss.ts; hier bleibt nur, was
    // ausschliesslich Stripe betrifft: die Rueckerstattung.
    if (s.payment_status === "paid" && s.metadata?.type === "open_game") {
      const admin = createAdminClient()
      const gameId = s.metadata.game_id
      const userId = s.metadata.user_id || ""
      const gastEmail = (s.metadata.guest_email || "").trim().toLowerCase()
      if (!gameId || (!userId && !gastEmail)) return NextResponse.json({ received: true })

      const { data: prof } = userId
        ? await admin.from("profiles").select("name").eq("id", userId).maybeSingle()
        : { data: null as { name?: string } | null }

      const erg = await schliesseAbOpenGame(admin, {
        gameId,
        userId: userId || null,
        gast: userId ? null : {
          name: s.metadata.guest_name || "Gast",
          email: gastEmail,
          phone: s.metadata.guest_phone || null,
          level: s.metadata.guest_level || null,
        },
        anzeigeName: prof?.name || s.metadata.player_name || (userId ? "Spieler" : "Gast"),
        betragChf: s.amount_total != null ? s.amount_total / 100 : 0,
        stripeSessionId: s.id,
        stripePaymentIntent: s.payment_intent ? String(s.payment_intent) : null,
        punkteGutschreiben: true,
        gutscheinRef: s.metadata.gutschein_ref || null,
      })

      if (!erg.ok) {
        // Ausgebucht, waehrend der Spieler an der Kasse stand → Geld zurueck.
        if (erg.grund === "voll") {
          try { if (s.payment_intent) await getStripe().refunds.create({ payment_intent: String(s.payment_intent) }) }
          catch (e) { console.error("Rueckerstattung nach Ueberbuchung fehlgeschlagen:", e) }
          if (s.metadata.gutschein_ref) await gibGutscheinFrei(admin, "open_game", s.metadata.gutschein_ref)
        }
        // Der Platz ist schon vergeben. Zwei Faelle sehen gleich aus, brauchen
        // aber das Gegenteil voneinander:
        //   a) ECHTE DOPPELZAHLUNG (zwei Tabs, zwei Sessions) → zurueckzahlen.
        //   b) WIEDERHOLUNG DESSELBEN WEBHOOKS → nichts tun, es gab nur EINE
        //      Zahlung. Frueher landete auch dieser Fall im Refund: der Spieler
        //      behielt den Platz und bekam sein Geld zurueck.
        // Unterschieden an der Session-ID der bereits gespeicherten Zeile.
        if (erg.grund === "doppelt") {
          const q = admin.from("open_game_players").select("stripe_session_id").eq("game_id", gameId)
          const { data: vorhanden } = await (userId ? q.eq("user_id", userId) : q.ilike("guest_email", gastEmail)).maybeSingle()
          if (vorhanden?.stripe_session_id === s.id) {
            console.log("Open Game: Webhook-Wiederholung fuer dieselbe Session, nichts zu tun —", s.id)
          } else {
            try { if (s.payment_intent) await getStripe().refunds.create({ payment_intent: String(s.payment_intent) }) }
            catch (e) { console.error("Refund bei Doppelzahlung fehlgeschlagen:", e) }
            if (s.metadata.gutschein_ref) await gibGutscheinFrei(admin, "open_game", s.metadata.gutschein_ref)
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    // SINGLE NIGHT: Zahlung eingegangen → Ticket fest. Ueberkapazitaets-Recheck
    // und Bestaetigungsmail stehen in lib/abschluss.ts; hier nur der Refund.
    if (s.payment_status === "paid" && s.metadata?.type === "single_night" && s.metadata.booking_id) {
      const admin = createAdminClient()
      const bid = s.metadata.booking_id
      const erg = await schliesseAbSingleNight(admin, bid, {
        stripePaymentIntent: s.payment_intent ? String(s.payment_intent) : null,
        gutscheinCode: s.metadata.gutschein_code || null,
        punkteGutschreiben: true,
        stripeSessionId: s.id,
      })
      if (!erg.ok && erg.grund === "voll") {
        try { if (s.payment_intent) await getStripe().refunds.create({ payment_intent: String(s.payment_intent) }) }
        catch (e) { console.error("Single-Night-Refund (Ueberbuchung) fehlgeschlagen:", e) }
        await admin.from("single_night_bookings").update({
          payment_status: "cancelled", reserved_until: null,
          stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
        }).eq("id", bid)
        await gibGutscheinFrei(admin, "single_night", bid)
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
