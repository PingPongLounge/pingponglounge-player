import { createAdminClient } from "@/lib/supabase/admin"
import { applyLeagueConfirm } from "@/lib/liga"
import { verifyAction } from "@/lib/token"
import { NextRequest, NextResponse } from "next/server"

// Ein-Klick-Bestätigung aus der E-Mail — ohne Login.
// Der Link ist mit HMAC signiert und gilt nur für genau dieses Match und
// genau diesen Spieler. Ohne gültige Signatur passiert nichts.
export const runtime = "nodejs"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pingponglounge-player.vercel.app"
const G = "#39FF14"

function page(title: string, text: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
    <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#20242C;font-family:system-ui,-apple-system,sans-serif;padding:24px">
      <div style="max-width:420px;width:100%;background:#2A2F39;border-radius:24px;padding:34px 26px;text-align:center;color:#fff">
        <div style="font-size:13px;font-weight:800;letter-spacing:.22em;color:${G};text-transform:uppercase;margin-bottom:20px">Player</div>
        <div style="font-size:23px;font-weight:900;margin-bottom:10px;color:${ok ? G : "#fff"}">${title}</div>
        <div style="font-size:14px;line-height:1.55;color:rgba(255,255,255,.7)">${text}</div>
        <a href="${BASE_URL}/liga" style="display:block;margin-top:24px;background:${G};color:#06210F;border-radius:12px;padding:15px;font-size:15px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:.03em">Zur Liga</a>
      </div>
    </body>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  )
}

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("m") || ""
  const playerId = req.nextUrl.searchParams.get("p") || ""
  const token = req.nextUrl.searchParams.get("t") || ""

  if (!matchId || !playerId || !token || !verifyAction("confirm", matchId, playerId, token)) {
    return page("Link ungültig", "Dieser Bestätigungs-Link ist nicht gültig. Bestätige das Ergebnis bitte direkt in der App.", false)
  }

  const admin = createAdminClient()
  const { data: m } = await admin
    .from("league_matches")
    .select("id,status,p1_id,p2_id,entered_by")
    .eq("id", matchId)
    .maybeSingle()

  if (!m) return page("Match nicht gefunden", "Dieses Match existiert nicht mehr.", false)

  // Nur der Gegner darf bestätigen — nie wer eingetragen hat
  if (m.entered_by === playerId) return page("Nicht möglich", "Du hast dieses Ergebnis selbst eingetragen. Bestätigen muss es dein Gegner.", false)
  if (m.p1_id !== playerId && m.p2_id !== playerId) return page("Nicht berechtigt", "Du bist an diesem Match nicht beteiligt.", false)

  if (m.status === "confirmed") return page("Bereits bestätigt", "Dieses Ergebnis ist schon gewertet. Deine Punkte und dein Rang sind aktuell.", true)
  if (m.status !== "p1_entered") return page("Nichts zu bestätigen", "Für dieses Match liegt kein eingetragenes Ergebnis vor.", false)

  const r = await applyLeagueConfirm(admin, matchId)
  if (!r.ok) return page("Fehler", "Das Ergebnis konnte nicht bestätigt werden. Versuch es bitte in der App.", false)

  return page("Ergebnis bestätigt", "Danke! Das Match ist gewertet — ELO und Rangliste sind aktualisiert.", true)
}
