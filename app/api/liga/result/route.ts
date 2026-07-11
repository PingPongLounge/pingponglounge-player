import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { sendResultConfirmRequest } from "@/lib/email"
import { signAction } from "@/lib/token"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pingponglounge-player.vercel.app"

export async function POST(req: NextRequest) {
  const { match_id, sets, winner_id, played_at } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: match } = await admin
    .from("league_matches")
    .select("p1_id,p2_id,status")
    .eq("id", match_id)
    .single()

  if (!match) return NextResponse.json({ error: "Match nicht gefunden" }, { status: 404 })
  if (match.status !== "pending" && match.status !== "challenge_sent" && match.status !== "accepted")
    return NextResponse.json({ error: "Match bereits eingereicht" }, { status: 400 })
  if (match.p1_id !== user.id && match.p2_id !== user.id)
    return NextResponse.json({ error: "Kein Teilnehmer" }, { status: 403 })

  // winner_id muss p1 oder p2 sein
  if (winner_id !== match.p1_id && winner_id !== match.p2_id)
    return NextResponse.json({ error: "Ungültige winner_id" }, { status: 400 })

  // Sets-Validierung: muss Array von {p1,p2} sein
  if (!Array.isArray(sets) || sets.length === 0 || sets.length > 7)
    return NextResponse.json({ error: "Ungültige Satzzahl" }, { status: 400 })
  for (const s of sets) {
    if (typeof s.p1 !== "number" || typeof s.p2 !== "number" || s.p1 < 0 || s.p2 < 0 || s.p1 > 30 || s.p2 > 30)
      return NextResponse.json({ error: "Ungültige Satzwerte" }, { status: 400 })
  }

  // Spieldatum: optional vom Spieler gesetzt. Nicht in der Zukunft, max. 60 Tage zurück.
  let when = new Date()
  if (played_at) {
    const d = new Date(played_at)
    const now = Date.now()
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 })
    if (d.getTime() > now + 60 * 60 * 1000) return NextResponse.json({ error: "Datum liegt in der Zukunft" }, { status: 400 })
    if (d.getTime() < now - 60 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "Datum liegt zu weit zurück" }, { status: 400 })
    when = d
  }

  const { error } = await admin.from("league_matches").update({
    sets,
    winner_id,
    status: "p1_entered",
    played_at: when.toISOString(),
    entered_at: new Date().toISOString(), // Start der 24h-Frist
    entered_by: user.id,
  }).eq("id", match_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gegner per E-Mail zur Bestätigung auffordern (24h, danach automatisch bestätigt).
  // Fehler beim Mailversand dürfen das Eintragen nie scheitern lassen.
  try {
    const opponentId = match.p1_id === user.id ? match.p2_id : match.p1_id
    const { data: people } = await admin.from("profiles").select("id,name,email,elo").in("id", [user.id, opponentId])
    const me = (people || []).find(p => p.id === user.id)
    const opp = (people || []).find(p => p.id === opponentId)

    // Die Login-Adresse aus auth.users ist die Wahrheit — profiles.email kann veraltet sein.
    const { data: authOpp } = await admin.auth.admin.getUserById(opponentId)
    const oppEmail = authOpp?.user?.email || opp?.email || null

    if (opp && oppEmail) {
      const mySets = (sets as Array<{ p1: number; p2: number }>).filter(s => s.p1 > s.p2).length
      const oppSets = (sets as Array<{ p1: number; p2: number }>).filter(s => s.p2 > s.p1).length
      const oppWon = winner_id === opponentId

      // ELO-Vorschau: exakt dieselbe Formel wie applyLeagueConfirm (K=32)
      const myElo = me?.elo ?? 1000
      const oppElo = opp.elo ?? 1000
      const wElo = oppWon ? oppElo : myElo
      const lElo = oppWon ? myElo : oppElo
      const ea = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
      const gain = Math.round(32 * (1 - ea))
      const oppAfter = oppWon ? Math.max(100, wElo + gain) : Math.max(100, lElo - gain)

      // Aktueller Rang des Gegners (nach ELO, über alle Spieler)
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("elo", oppElo)
      const rankNow = typeof count === "number" ? count + 1 : null

      const t = signAction("confirm", match_id, opponentId)
      const confirmUrl = `${BASE_URL}/api/liga/confirm-email?m=${match_id}&p=${opponentId}&t=${t}`

      await sendResultConfirmRequest({
        to: oppEmail,
        opponentName: me?.name || "Dein Gegner",
        recipientName: opp.name || "Spieler",
        scoreLine: `${oppSets}:${mySets}`, // aus Sicht des Empfängers
        won: oppWon,
        playedLabel: when.toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
        matchId: match_id,
        eloNow: oppElo,
        eloAfter: oppAfter,
        rankNow,
        confirmUrl,
      })
    }
  } catch (e) {
    console.error("Bestätigungs-Mail fehlgeschlagen:", e)
  }

  return NextResponse.json({ ok: true })
}
