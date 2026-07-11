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
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
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

function shell(inner: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;background:#20242C;border-radius:20px;color:#fff">
    <img src="${BASE_URL}/logo-mail.png" alt="Player — Next Level Table Tennis" width="180" style="display:block;width:180px;max-width:180px;height:auto;margin:0 auto 26px;border:0">
    ${inner}
    <p style="color:rgba(255,255,255,.45);font-size:11px;margin-top:26px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">Player · playerapp.ch</p>
  </div>`
}

// Button: nur mit Farbverlauf umrandet, innen dunkel. Outlook kann keine
// Verläufe → dort greift die Hintergrundfarbe als Fallback.
function outlineButton(href: string, label: string): string {
  return `
  <a href="${href}" style="display:block;text-decoration:none;background-color:${G};background-image:${GRAD};border-radius:14px;padding:2px">
    <span style="display:block;background:${CARD};border-radius:12px;padding:15px;text-align:center;font-size:15px;font-weight:800;color:${G};text-transform:uppercase;letter-spacing:.04em">${label}</span>
  </a>`
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
}) {
  const delta = opts.eloAfter - opts.eloNow
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
              <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">ELO</div>
              <div style="font-size:20px;font-weight:900;color:#fff">${opts.eloNow} <span style="color:rgba(255,255,255,.35);font-weight:700">→</span> ${opts.eloAfter}</div>
              <div style="font-size:15px;font-weight:900;color:${deltaColor};margin-top:2px">${deltaLabel}</div>
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

      <p style="font-size:12px;color:rgba(255,255,255,.45);text-align:center;margin:0 0 16px">So sieht es aus, wenn du bestätigst.</p>

      ${outlineButton(opts.confirmUrl, "Ergebnis bestätigen")}
      <a href="${appUrl}" style="display:block;text-align:center;margin-top:9px;color:rgba(255,255,255,.6);font-size:13px;text-decoration:none;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:14px">Stimmt nicht — hier widersprechen</a>

      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:18px 0 0">
        Du hast <strong style="color:#fff">24 Stunden</strong> Zeit. Reagierst du nicht, wird das Ergebnis automatisch bestätigt und für ELO &amp; Rangliste gewertet.
      </p>
    `),
  })
}
