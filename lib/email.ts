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

function shell(inner: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;background:#20242C;border-radius:20px;color:#fff">
    <div style="font-size:13px;font-weight:800;letter-spacing:.22em;color:${G};text-transform:uppercase;margin-bottom:22px">Player</div>
    ${inner}
    <p style="color:rgba(255,255,255,.45);font-size:11px;margin-top:26px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">Ping Pong Lounge · pingponglounge.ch</p>
  </div>`
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
      <p style="color:rgba(255,255,255,.75);font-size:14px;line-height:1.55;margin:0 0 18px">
        Hallo ${opts.recipientName},<br>
        <strong style="color:#fff">${opts.opponentName}</strong> hat euer Liga-Match vom ${opts.playedLabel} eingetragen.
      </p>

      <div style="background:#2A2F39;border-radius:14px;padding:18px;text-align:center;margin-bottom:12px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Dein Ergebnis · ${opts.won ? "Sieg" : "Niederlage"}</div>
        <div style="font-size:36px;font-weight:900;color:#fff">${opts.scoreLine}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px">du : ${opts.opponentName}</div>
      </div>

      <div style="background:#2A2F39;border-radius:14px;padding:16px 18px;margin-bottom:18px">
        <div style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Wenn du bestätigst</div>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:4px 0;color:rgba(255,255,255,.7);font-size:13px">ELO</td>
            <td style="padding:4px 0;text-align:right;font-size:14px;color:#fff;font-weight:800">
              ${opts.eloNow} → ${opts.eloAfter}
              <span style="color:${deltaColor};font-weight:900;margin-left:6px">${deltaLabel}</span>
            </td>
          </tr>
          ${opts.rankNow ? `<tr>
            <td style="padding:4px 0;color:rgba(255,255,255,.7);font-size:13px">Dein Rang aktuell</td>
            <td style="padding:4px 0;text-align:right;font-size:14px;color:#fff;font-weight:800">#${opts.rankNow}</td>
          </tr>` : ""}
        </table>
      </div>

      <a href="${opts.confirmUrl}" style="display:block;text-align:center;background:${G};color:#06210F;border-radius:12px;padding:15px;font-size:15px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:.03em">Ergebnis bestätigen</a>
      <a href="${appUrl}" style="display:block;text-align:center;margin-top:9px;color:rgba(255,255,255,.65);font-size:13px;text-decoration:none;padding:11px;border:1px solid rgba(255,255,255,.18);border-radius:12px">Stimmt nicht — in der App widersprechen</a>

      <p style="color:rgba(255,255,255,.5);font-size:12.5px;line-height:1.5;margin:16px 0 0">
        Du hast <strong style="color:#fff">24 Stunden</strong> Zeit. Reagierst du nicht, wird das Ergebnis automatisch bestätigt und für ELO &amp; Rangliste gewertet.
      </p>
    `),
  })
}
