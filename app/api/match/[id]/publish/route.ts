import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Ein "booking_pending" Open Game (Standort Ping Pong Lounge) veröffentlichen —
// erst NACHDEM der Gastgeber den Tisch in Planyo gebucht hat. Nur der Ersteller,
// nur aus dem Zustand booking_pending → open.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: game } = await admin
    .from("open_games")
    .select("id,created_by,status,max_players,current_players")
    .eq("id", id)
    .maybeSingle()

  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })
  if (game.created_by !== user.id) return NextResponse.json({ error: "Nur der Gastgeber kann veröffentlichen" }, { status: 403 })
  if (game.status !== "booking_pending") {
    // Idempotent: bereits offen → einfach ok melden.
    if (game.status === "open" || game.status === "full") return NextResponse.json({ id: game.id, status: game.status })
    return NextResponse.json({ error: "Nicht mehr veröffentlichbar" }, { status: 400 })
  }

  const voll = (game.current_players ?? 1) >= (game.max_players ?? 2)
  const { error } = await admin
    .from("open_games")
    .update({ status: voll ? "full" : "open", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "booking_pending") // Race-Schutz: nur flippen, wenn noch pending
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: game.id, status: voll ? "full" : "open" })
}
