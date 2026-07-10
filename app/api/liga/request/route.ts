import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimited, clientIp } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Öffentliche Route → Rate-Limit gegen Spam/Flooding der Tabelle
  if (rateLimited(`ligareq:${clientIp(req)}`, 5, 10 * 60 * 1000))
    return NextResponse.json({ error: "Zu viele Anfragen — bitte später nochmals." }, { status: 429 })

  const body = await req.json()
  const { name, email, firma, standort, liga_art, start_datum, end_datum } = body
  if (!name || !email || !firma) return NextResponse.json({ error: "Name, Email und Firma sind Pflicht" }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("liga_requests").insert({
    name, email, firma, standort, liga_art, start_datum, end_datum,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}