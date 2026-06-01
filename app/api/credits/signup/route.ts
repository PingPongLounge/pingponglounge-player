import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function genCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
