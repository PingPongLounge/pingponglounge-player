import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notify } from "@/lib/notify"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const friendId = String(body.user_id || "")
  if (!friendId || friendId === user.id) return NextResponse.json({ error: "Ungültiger Freund" }, { status: 400 })

  const admin = createAdminClient()
  const { data: game } = await admin.from("open_games")
    .select("id,location_name,date,start_hour,status")
    .eq("id", id).maybeSingle()
  if (!game || game.status === "cancelled" || game.status === "booking_pending") {
    return NextResponse.json({ error: "Open Game nicht verfügbar" }, { status: 404 })
  }

  const { data: friendship } = await admin.from("my_friends")
    .select("friend_id").eq("user_id", user.id).eq("friend_id", friendId).maybeSingle()
  if (!friendship) return NextResponse.json({ error: "Nur bestätigte Freunde können eingeladen werden" }, { status: 403 })

  const link = `/match/${id}`
  const { data: existing } = await admin.from("notifications")
    .select("id").eq("user_id", friendId).eq("type", "event_invite").eq("link", link).is("read_at", null).limit(1)
  if (existing?.length) return NextResponse.json({ ok: true, already: true })

  const { data: profile } = await admin.from("public_profiles").select("name").eq("id", user.id).maybeSingle()
  const name = profile?.name || "Ein Freund"
  const date = game.date ? new Date(`${game.date}T12:00:00`).toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" }) : "Termin offen"
  const time = game.start_hour != null ? `${String(game.start_hour).padStart(2, "0")}:00` : "Zeit offen"

  await notify(admin, friendId, "event_invite", `${name} hat dich zu einem Open Game eingeladen.`, {
    body: `${date} · ${time} · ${game.location_name}`,
    link,
  })
  return NextResponse.json({ ok: true })
}
