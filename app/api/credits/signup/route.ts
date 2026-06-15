import { createClient } from "@/lib/supabase/server"
import { rateLimited, clientIp } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"

function genCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Rate-Limit gegen parallele Mehrfach-Anfragen (Race-Condition-Schutz)
  if (rateLimited(`signup:${user.id}:${clientIp(req)}`, 3, 60 * 1000))
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 })

  // Prüfen ob Signup-Credit bereits vergeben
  const { data: existing } = await supabase
    .from("credits")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "signup")
    .single()

  if (existing) return NextResponse.json({ already: true })

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 6)

  const { error } = await supabase.from("credits").insert({
    user_id: user.id,
    hours: 2,
    type: "signup",
    redemption_code: genCode(),
    expires_at: expiresAt.toISOString(),
  })

  // Unique-Constraint-Verletzung (paralleler Insert) als "bereits vergeben" behandeln
  if (error) {
    if (error.code === "23505") return NextResponse.json({ already: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
