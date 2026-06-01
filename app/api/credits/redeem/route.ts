import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: "Kein Code" }, { status: 400 })

  const supabase = await createClient()

  const { data: credit, error } = await supabase
    .from("credits")
    .select("*, profiles(name)")
    .eq("redemption_code", code.toUpperCase().trim())
    .single()

  if (error || !credit) return NextResponse.json({ error: "Code nicht gefunden" }, { status: 404 })
  if (credit.redeemed_at) return NextResponse.json({ error: "Code bereits eingelöst", redeemed_at: credit.redeemed_at }, { status: 409 })
  if (new Date(credit.expires_at) < new Date()) return NextResponse.json({ error: "Code abgelaufen" }, { status: 410 })

  // Einlösen
  await supabase.from("credits").update({ redeemed_at: new Date().toISOString() }).eq("id", credit.id)

  return NextResponse.json({
    ok: true,
    player: (credit as Record<string, unknown> & { profiles?: { name?: string } }).profiles?.name,
    hours: credit.hours,
    type: credit.type,
  })
}
