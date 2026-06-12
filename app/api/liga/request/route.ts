import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, firma, standort, liga_art, start_datum, end_datum } = body
  if (!name || !email || !firma) return NextResponse.json({ error: "Name, Email und Firma sind Pflicht" }, { status: 400 })

  const sb = await createClient()
  const { error } = await sb.from("liga_requests").insert({
    name, email, firma, standort, liga_art, start_datum, end_datum,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}