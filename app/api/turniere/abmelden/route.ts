import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nachruecken } from "@/lib/tournaments"
import { notify } from "@/lib/notify"
import { melde, sendEmail, sendTournamentWaitlistUp } from "@/lib/email"
import { MAIL_EMPFAENGER_INTERN } from "@/lib/staff"
import { ABMELDE_FRIST_STUNDEN, pruefeAbmeldeLink, turnierStart } from "@/lib/turnier-abmelden"

// Abmelden per Link aus der Bestaetigungsmail. Ohne Login: der signierte Link
// ist die Berechtigung (siehe lib/turnier-abmelden.ts). Bis 24 Stunden vor dem
// Turnier kostenlos und sofort; danach nur noch per Antwort auf die Mail.
// Rueckerstattungen loest das Team in Stripe aus — Geldbewegungen laufen nie
// automatisch (gleiche Regel wie beim Entfernen durch den Veranstalter).
export const runtime = "nodejs"

type Reg = {
  id: string; tournament_id: string; status: string | null; waitlist: boolean | null
  first_name: string | null; last_name: string | null; email: string | null
  payment_status: string | null; amount_chf: number | null
}

async function lade(r: string, t: string, k: string) {
  if (!pruefeAbmeldeLink(r, t, k)) return { fehler: "Ungültiger Link.", status: 403 as const }
  const admin = createAdminClient()
  const { data: reg } = await admin.from("tournament_registrations")
    .select("id,tournament_id,status,waitlist,first_name,last_name,email,payment_status,amount_chf")
    .eq("id", r).eq("tournament_id", t).maybeSingle<Reg>()
  if (!reg) return { fehler: "Anmeldung nicht gefunden.", status: 404 as const }
  const { data: turnier } = await admin.from("player_tournaments")
    .select("name,date,start_time,max_players,status").eq("id", t).maybeSingle()
  if (!turnier?.date) return { fehler: "Turnier nicht gefunden.", status: 404 as const }
  const frist = turnierStart(turnier.date, turnier.start_time).getTime() - ABMELDE_FRIST_STUNDEN * 3600_000
  return { admin, reg, turnier, frist }
}

// GET: Angaben fuer die Seite (Turnier, Name, Status, ob noch kostenlos).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const x = await lade(q.get("r") || "", q.get("t") || "", q.get("k") || "")
  if ("fehler" in x) return NextResponse.json({ error: x.fehler }, { status: x.status })
  const datumLabel = new Date(`${x.turnier.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
  return NextResponse.json({
    turnier: x.turnier.name, datumLabel, vorname: x.reg.first_name,
    schonAbgemeldet: x.reg.status === "withdrawn",
    vorbei: x.turnier.status === "finished" || Date.now() > turnierStart(x.turnier.date, x.turnier.start_time).getTime(),
    kostenlos: Date.now() <= x.frist,
  })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const x = await lade(String(b.r || ""), String(b.t || ""), String(b.k || ""))
  if ("fehler" in x) return NextResponse.json({ error: x.fehler }, { status: x.status })
  const { admin, reg, turnier, frist } = x

  if (reg.status === "withdrawn") return NextResponse.json({ ok: true, schon: true })
  if (Date.now() > frist) {
    return NextResponse.json({
      error: `Die kostenlose Abmeldung war bis ${ABMELDE_FRIST_STUNDEN} Stunden vor dem Turnier möglich. Antworte bitte auf deine Bestätigungsmail, dann schauen wir es an.`,
    }, { status: 400 })
  }

  // Nur eine aktive Anmeldung umschalten — ein zweiter Klick trifft nichts mehr.
  const { data: upd } = await admin.from("tournament_registrations")
    .update({ status: "withdrawn", waitlist: false, waitlist_pos: null })
    .eq("id", reg.id).neq("status", "withdrawn").select("id").maybeSingle()
  if (!upd) return NextResponse.json({ ok: true, schon: true })

  const datumLabel = new Date(`${turnier.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })

  // Platz frei -> Warteliste rueckt nach (nur wenn die Person einen Platz hatte).
  let nachName: string | null = null
  if (!reg.waitlist) {
    const rueck = await nachruecken(admin, reg.tournament_id, turnier.max_players ?? 32)
    if (rueck?.player_id) {
      nachName = rueck.first_name
      await notify(admin, rueck.player_id, "waitlist_promoted", "Du bist nachgerückt!", {
        body: "Ein Platz ist frei geworden — du bist jetzt dabei.", link: `/turniere/${reg.tournament_id}`,
      })
    } else if (rueck?.email) {
      nachName = rueck.first_name
      await melde("turnier_nachgerueckt", { to: rueck.email, turnierId: reg.tournament_id },
        sendTournamentWaitlistUp({
          to: rueck.email, name: rueck.first_name || "zusammen", turnier: turnier.name || "Turnier",
          datumLabel, turnierUrl: `https://pingponglounge.ch/turniere/${reg.tournament_id}`,
        }))
    }
  }

  // Interne Meldung — bei Onlinezahlung muss das Team die Rueckerstattung ausloesen.
  const bezahltOnline = reg.payment_status === "paid" && Number(reg.amount_chf) > 0
  const zeilen = [
    `${reg.first_name || ""} ${reg.last_name || ""} hat sich per Link abgemeldet.`,
    `Turnier: ${turnier.name || ""}, ${datumLabel}`,
    `Zahlung: ${reg.payment_status || "-"}${reg.amount_chf ? ` · CHF ${reg.amount_chf}` : ""}`,
    bezahltOnline ? "Bitte Rückerstattung in Stripe auslösen." : "Keine Rückerstattung nötig.",
    reg.waitlist ? "War auf der Warteliste." : nachName ? `Nachgerückt: ${nachName}.` : "Niemand auf der Warteliste.",
  ]
  await Promise.all(MAIL_EMPFAENGER_INTERN.map(to => melde("turnier_abmeldung_staff", { to, turnierId: reg.tournament_id },
    sendEmail({
      to, subject: `Abmeldung: ${reg.first_name || ""} ${reg.last_name || ""} — ${turnier.name || "Turnier"}`,
      html: `<div style="font-family:system-ui,sans-serif;color:#111;line-height:1.5">${zeilen.map(z => `<p style="margin:0 0 6px">${z}</p>`).join("")}</div>`,
    }))))

  return NextResponse.json({ ok: true, rueckerstattung: bezahltOnline })
}
