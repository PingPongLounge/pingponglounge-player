import { STAFF_EMAILS } from "@/lib/staff"
import { ratingLabel } from "@/lib/rewards"
// Transaktionale E-Mails via Resend (REST, ohne SDK). Ohne RESEND_API_KEY
// passiert nichts — die App läuft normal weiter, es wird nur nicht gemailt.
const RESEND_URL = "https://api.resend.com/emails"
// Absender frei konfigurierbar via Vercel-Env RESEND_FROM.
// Die Domain muss in Resend verifiziert sein, sonst lehnt Resend den Versand ab.
const FROM = process.env.RESEND_FROM || "Player <points@playerapp.ch>"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pingponglounge-player.vercel.app"

const G = "#39FF14"

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, skipped: true }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        // Dark-Mode-Hinweis + voll deckender Hintergrund, damit kein weisser Rand bleibt
        html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head><body style="margin:0;padding:0;background-color:#20242C;">${opts.html}</body></html>`,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const CARD = "#2A2F39"

// Voll deckender dunkler Hintergrund über die ganze Breite — sonst bleibt auf dem
// Smartphone ein weisser Rand um die Karte stehen (Mail-Clients haben weissen BG).
// Tabellen statt divs, weil Outlook/Gmail damit zuverlässig umgehen.
function shell(inner: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#20242C;margin:0;padding:0">
    <tr>
      <td align="center" style="background-color:#20242C;padding:30px 16px 34px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;margin:0 auto">
          <tr>
            <td style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#ffffff">
              <img src="${BASE_URL}/logo-mail.png" alt="Player — Next Level Table Tennis" width="180" style="display:block;width:180px;max-width:180px;height:auto;margin:0 auto 28px;border:0">
              ${inner}
              <p style="color:rgba(255,255,255,.45);font-size:11px;margin-top:28px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px;text-align:center">Player · playerapp.ch</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

// Button: nur mit Farbverlauf umrandet, innen dunkel. Outlook kann keine
// Verläufe → dort greift die Hintergrundfarbe als Fallback.
function outlineButton(href: string, label: string): string {
  return `
  <a href="${href}" style="display:block;text-decoration:none;background-color:${G};background-image:${GRAD};border-radius:14px;padding:2px">
    <span style="display:block;background:${CARD};border-radius:12px;padding:15px;text-align:center;font-size:15px;font-weight:800;color:${G};text-transform:uppercase;letter-spacing:.04em">${label}</span>
  </a>`
}

// Jemand hat dich herausgefordert. Ohne diese Mail merkt es niemand — bisher
// erfuhr man von einer Forderung nur, wenn man zufällig die App öffnete.
export async function sendChallengeNotice(opts: {
  to: string
  challengerName: string
  recipientName: string
  challengerLevel?: string | null
  challengerElo?: number | null
  when?: string | null
}) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.challengerName} fordert dich heraus`,
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Du wurdest gefordert</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 20px">
        Hallo ${opts.recipientName},<br>
        <strong style="color:#fff">${opts.challengerName}</strong>${opts.challengerElo ? ` (Rating ${ratingLabel(opts.challengerElo)})` : ""} will gegen dich spielen.
      </p>
      ${opts.when ? `<div style="background:${CARD};border-radius:14px;padding:15px;text-align:center;margin-bottom:18px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">Vorgeschlagen</div>
        <div style="font-size:17px;font-weight:900;color:#fff">${opts.when}</div>
      </div>` : ""}
      ${outlineButton(`${BASE_URL}/liga`, "Annehmen")}
      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:16px 0 0">
        Passt der Termin nicht? Schreib ihm im Liga-Chat.
      </p>
    `),
  })
}

// Erinnerung gegen Monatsende: Soll noch nicht erfüllt.
export async function sendMonthlyWarning(opts: {
  to: string
  name: string
  monthLabel: string
  played: number
  required: number
  daysLeft: number
  penalty: number
}) {
  const fehlt = opts.required - opts.played
  return sendEmail({
    to: opts.to,
    subject: `Noch ${fehlt} Liga-Match${fehlt > 1 ? "es" : ""} bis Monatsende`,
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Dir fehlt noch ein Spiel</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 20px">
        Hallo ${opts.name}, im ${opts.monthLabel} hast du bisher
        <strong style="color:#fff">${opts.played} von ${opts.required}</strong> Liga-Matches gespielt.
      </p>

      <div style="background:${CARD};border-radius:18px;padding:20px;text-align:center;margin-bottom:20px">
        <div style="font-size:44px;font-weight:900;color:${G};line-height:1">${opts.played}/${opts.required}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.08em;margin-top:6px">Liga-Matches im ${opts.monthLabel}</div>
        <div style="margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.08);font-size:13px;color:rgba(255,255,255,.7);line-height:1.5">
          Noch <strong style="color:#fff">${opts.daysLeft} Tag${opts.daysLeft > 1 ? "e" : ""}</strong>.
          Schaffst du es nicht, verlierst du <strong style="color:#FF5C5C">${opts.penalty} Punkte</strong>.
        </div>
      </div>

      ${outlineButton(`${BASE_URL}/match`, "Open Game finden")}
      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:16px 0 0">
        Am schnellsten geht es über ein Open Game — Tisch und Zeit reinstellen, wer Lust hat, spielt mit.
        Oder fordere direkt jemanden aus der Rangliste.
      </p>
    `),
  })
}

// Monatsabrechnung: Soll verfehlt, Punkte abgezogen.
export async function sendMonthlyPenalty(opts: {
  to: string
  name: string
  monthLabel: string
  played: number
  required: number
  eloBefore: number
  eloAfter: number
}) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.monthLabel}: ${opts.eloBefore - opts.eloAfter} Punkte abgezogen`,
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Zu wenig gespielt im ${opts.monthLabel}</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 20px">
        Hallo ${opts.name}, du hast ${opts.played} von ${opts.required} nötigen Liga-Matches gespielt.
        Wer nicht spielt, rutscht in der Rangliste — so bleibt sie ehrlich.
      </p>

      <div style="background:${CARD};border-radius:18px;padding:20px;text-align:center;margin-bottom:20px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Deine Punkte</div>
        <div style="font-size:22px;font-weight:900;color:#fff">
          ${opts.eloBefore} <span style="color:rgba(255,255,255,.35)">→</span> ${opts.eloAfter}
          <span style="color:#FF5C5C;margin-left:8px">−${opts.eloBefore - opts.eloAfter}</span>
        </div>
      </div>

      ${outlineButton(`${BASE_URL}/match`, "Diesen Monat besser machen")}
      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:16px 0 0">
        ${opts.required} Spiele im Monat — das ist eines alle zwei Wochen. Stell ein Open Game rein, dann findet sich jemand.
      </p>
    `),
  })
}

// Erinnerung an alle, die sich registriert, das Onboarding aber nie beendet haben.
export async function sendOnboardingReminder(opts: { to: string }) {
  const url = `${BASE_URL}/onboarding`
  return sendEmail({
    to: opts.to,
    subject: "Dein Profil ist noch nicht fertig — 1 Minute, dann bist du drin",
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Fast geschafft</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 20px">
        Du hast dich registriert, aber dein Profil ist noch nicht fertig — deshalb bist du weder in der Rangliste
        noch in der Liga sichtbar.
      </p>

      <div style="background:${CARD};border-radius:18px;padding:20px;margin-bottom:20px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px">Was noch fehlt</div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:5px 0;color:rgba(255,255,255,.8);font-size:14px">Dein Spielername</td></tr>
          <tr><td style="padding:5px 0;color:rgba(255,255,255,.8);font-size:14px">Deine Level-Einstufung</td></tr>
        </table>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);font-size:12.5px;color:rgba(255,255,255,.55);line-height:1.5">
          Danach hast du sofort einen Rang, kannst Gegner fordern und in der Liga mitspielen.
        </div>
      </div>

      ${outlineButton(url, "Profil fertigstellen")}
    `),
  })
}

// Gegner bittet um Bestätigung eines eingetragenen Liga-Ergebnisses.
// Enthält einen signierten Ein-Klick-Link (kein Login nötig) und zeigt,
// was die Bestätigung mit ELO und Rang macht.
export async function sendResultConfirmRequest(opts: {
  to: string
  opponentName: string   // wer das Ergebnis eingetragen hat
  recipientName: string  // wer bestätigen soll
  scoreLine: string      // Ergebnis aus Sicht des Empfängers, z.B. "1:3"
  won: boolean           // hat der Empfänger gewonnen?
  playedLabel: string
  matchId: string
  eloNow: number
  eloAfter: number
  rankNow: number | null
  confirmUrl: string     // signierter Ein-Klick-Link
  ranked?: boolean       // zählt das Spiel für ELO und Rang?
}) {
  const gewertet = opts.ranked !== false
  const delta = gewertet ? opts.eloAfter - opts.eloNow : 0
  const deltaColor = delta >= 0 ? G : "#FF5C5C"
  const deltaLabel = `${delta >= 0 ? "+" : ""}${delta}`
  const appUrl = `${BASE_URL}/liga/match/${opts.matchId}`

  return sendEmail({
    to: opts.to,
    subject: `${opts.opponentName} hat euer Ergebnis eingetragen (${opts.scoreLine}) — bitte bestätigen`,
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Ergebnis bestätigen</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 20px">
        Hallo ${opts.recipientName},<br>
        <strong style="color:#fff">${opts.opponentName}</strong> hat euer Liga-Match vom ${opts.playedLabel} eingetragen.
      </p>

      <!-- Rang-Karte, gross wie in der App -->
      <div style="background:${CARD};border-radius:18px;padding:22px;margin-bottom:12px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px">Dein Rang</div>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle">
              <span style="font-size:52px;font-weight:900;color:${G};line-height:1">${opts.rankNow ? `#${opts.rankNow}` : "—"}</span>
            </td>
            <td style="vertical-align:middle;text-align:right">
              <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Rating</div>
              ${gewertet ? `
              <div style="font-size:20px;font-weight:900;color:#fff">${ratingLabel(opts.eloNow)} <span style="color:rgba(255,255,255,.35);font-weight:700">→</span> ${ratingLabel(opts.eloAfter)}</div>
              <div style="font-size:15px;font-weight:900;color:${deltaColor};margin-top:2px">${deltaLabel} ELO</div>
              ` : `
              <div style="font-size:20px;font-weight:900;color:#fff">${ratingLabel(opts.eloNow)}</div>
              <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.45);margin-top:2px">bleibt gleich</div>
              `}
            </td>
          </tr>
        </table>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="font-size:12px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.06em">${opts.won ? "Sieg" : "Niederlage"} gegen ${opts.opponentName}</td>
              <td style="text-align:right;font-size:26px;font-weight:900;color:#fff">${opts.scoreLine}</td>
            </tr>
          </table>
        </div>
      </div>

      <p style="font-size:12px;color:rgba(255,255,255,.45);text-align:center;margin:0 0 16px">
        ${gewertet ? "So sieht es aus, wenn du bestätigst." : "Freundschaftsspiel — es zählt nicht für ELO und Rang."}
      </p>

      ${outlineButton(opts.confirmUrl, "Ergebnis bestätigen")}
      <a href="${appUrl}" style="display:block;text-align:center;margin-top:9px;color:rgba(255,255,255,.6);font-size:13px;text-decoration:none;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:14px">Stimmt nicht — hier widersprechen</a>

      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:18px 0 0">
        Du hast <strong style="color:#fff">24 Stunden</strong> Zeit. Reagierst du nicht, wird das Ergebnis automatisch bestätigt${gewertet ? " und für ELO &amp; Rangliste gewertet" : " — gewertet wird es nicht"}.
      </p>
    `),
  })
}

// ---------------------------------------------------------------------------
// Prämien-Einlösung. Vorher stand in der App "wir melden uns" — es gab aber
// weder eine Mail ans Team noch an den Spieler, und /staff/redeem kennt die
// Tabelle reward_claims gar nicht. Punkte weg, Anspruch unsichtbar.
// ---------------------------------------------------------------------------

export async function sendRewardClaimStaff(opts: {
  playerName: string
  playerEmail: string | null
  rewardLabel: string
  threshold: number
}) {
  return sendEmail({
    to: STAFF_EMAILS[0],
    subject: `Prämie eingelöst: ${opts.rewardLabel} — ${opts.playerName}`,
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Prämie eingelöst</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 18px">
        <strong style="color:#fff">${opts.playerName}</strong> hat <strong style="color:#fff">${opts.threshold} PingPoints</strong> eingelöst.
      </p>
      <div style="background:${CARD};border-radius:16px;padding:18px 20px;margin-bottom:16px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Prämie</div>
        <div style="font-size:19px;font-weight:900;color:${G}">${opts.rewardLabel}</div>
        ${opts.playerEmail ? `<div style="font-size:12.5px;color:rgba(255,255,255,.6);margin-top:10px">${opts.playerEmail}</div>` : ""}
      </div>
      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:0">
        Die Punkte sind bereits abgezogen. Meld dich beim Spieler und übergib die Prämie in der Lounge.
      </p>
    `),
  })
}

export async function sendRewardClaimPlayer(opts: {
  to: string
  name: string
  rewardLabel: string
  threshold: number
}) {
  return sendEmail({
    to: opts.to,
    subject: `Prämie eingelöst: ${opts.rewardLabel}`,
    html: shell(`
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:#fff">Prämie eingelöst</h1>
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 18px">
        Hallo ${opts.name},<br>
        wir haben deine Einlösung erhalten.
      </p>
      <div style="background:${CARD};border-radius:16px;padding:20px;margin-bottom:16px;text-align:center">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Deine Prämie</div>
        <div style="font-size:22px;font-weight:900;color:${G};margin-bottom:6px">${opts.rewardLabel}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.6)">${opts.threshold} PingPoints abgezogen</div>
      </div>
      <p style="color:rgba(255,255,255,.6);font-size:13px;line-height:1.55;margin:0 0 16px">
        Zeig diese Mail beim nächsten Besuch in der Lounge — wir lösen sie direkt vor Ort ein.
      </p>
      ${outlineButton(`${BASE_URL}/pingpoints`, "Deine PingPoints")}
    `),
  })
}
