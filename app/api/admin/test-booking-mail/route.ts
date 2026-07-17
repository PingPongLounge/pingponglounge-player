import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { STAFF_EMAILS } from "@/lib/staff"
import { sendBookingConfirm } from "@/lib/email"

export const runtime = "nodejs"

// Staff-Test: schickt die Buchungs-Bestätigung (mit Donnerstag-Glattbrugg-QR)
// an alle BEZAHLTEN Teilnehmer eines Spiels. Zum Prüfen, wie die Mail aussieht.
// Aufruf: /api/admin/test-booking-mail?game=<id>
export async function GET(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email || "")) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  }

  const gameId = req.nextUrl.searchParams.get("game")
  if (!gameId) return NextResponse.json({ error: "game-Parameter fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const { data: game } = await admin
    .from("open_games")
    .select("id,location_name,date,start_hour,price_per_player,kind")
    .eq("id", gameId).maybeSingle()
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })

  const { data: players } = await admin
    .from("open_game_players")
    .select("user_id,display_name,paid")
    .eq("game_id", gameId).eq("paid", true).neq("status", "left")

  const isTraining = game.kind === "training"
  const d = game.date ? new Date(`${game.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long" }) : ""
  const zeit = `${String(game.start_hour ?? 19).padStart(2, "0")}:00`

  const ergebnisse: Array<{ name: string; ok: boolean; skipped?: boolean }> = []
  for (const p of players || []) {
    const { data: authU } = await admin.auth.admin.getUserById(p.user_id)
    const email = authU?.user?.email
    if (!email) { ergebnisse.push({ name: p.display_name || "Spieler", ok: false }); continue }
    const res = await sendBookingConfirm({
      to: email,
      name: p.display_name || "Spieler",
      isTraining,
      location: game.location_name || "Glattbrugg",
      whenLabel: `${d}${d ? " · " : ""}${zeit}${isTraining ? "–20:30" : ""}`,
      priceChf: Number(game.price_per_player ?? 0),
      // Test: Donnerstag-Glattbrugg-QR erzwingen, damit der QR sichtbar ist
      entryQrPath: "/og-entry-glattbrugg-do.png",
    })
    ergebnisse.push({ name: p.display_name || "Spieler", ok: res.ok, skipped: res.skipped })
  }

  const gesendet = ergebnisse.filter(r => r.ok).length
  return NextResponse.json({ gesendet, empfaenger: ergebnisse })
}
