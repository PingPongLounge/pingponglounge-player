import { createClient } from "@/lib/supabase/server"
import { STAFF_EMAILS } from "@/lib/staff"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth-Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 })

  // Staff-Check
  if (!STAFF_EMAILS.includes(user.email ?? ""))
    return NextResponse.json({ error: "Nur Staff-Mitglieder können Codes einlösen" }, { status: 403 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: "Kein Code" }, { status: 400 })

  const { data: credit, error } = await supabase
    .from("credits")
    .select("*, profiles(name)")
    .eq("redemption_code", code.toUpperCase().trim())
    .single()

  if (error || !credit) return NextResponse.json({ error: "Code nicht gefunden" }, { status: 404 })
  if (credit.redeemed_at) return NextResponse.json({ error: "Code bereits eingelöst", redeemed_at: credit.redeemed_at }, { status: 409 })
  if (new Date(credit.expires_at) < new Date()) return NextResponse.json({ error: "Code abgelaufen" }, { status: 410 })

  // Atomares Einlösen (Race-Condition Schutz)
  const { data: updated } = await supabase
    .from("credits")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: user.id })
    .eq("id", credit.id)
    .is("redeemed_at", null)
    .select("id")
    .single()

  if (!updated) return NextResponse.json({ error: "Code bereits eingelöst" }, { status: 409 })

  return NextResponse.json({
    ok: true,
    player: (credit as Record<string, unknown> & { profiles?: { name?: string } }).profiles?.name,
    hours: credit.hours,
    type: credit.type,
  })
}