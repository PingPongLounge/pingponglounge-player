import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

  // Willkommens-PingPoints (+15) — macht das "+15 PingPoints"-Versprechen aus dem
  // /spielen-Hook echt. Läuft nur einmal pro User (zusammen mit dem Signup-Credit).
  await supabase.from("ping_points_transactions").insert({
    player_id: user.id,
    amount: 15,
    source: "welcome",
    description: "Willkommen bei Player",
  })

  // REFERRAL — das war bisher ein leeres Versprechen: /join setzte ein Cookie
  // "ppl_ref", und niemand hat es je gelesen. Der Werber bekam nie etwas, obwohl
  // /freunde und /join beiden "2 Gratisstunden" zusagen.
  try {
    const ref = req.cookies.get("ppl_ref")?.value?.trim()
    if (ref) {
      const admin = createAdminClient()

      // Werber über referral_code ODER Spielername finden
      const { data: werber } = await admin
        .from("profiles")
        .select("id")
        .or(`referral_code.eq.${ref},name.eq.${ref}`)
        .limit(1)
        .maybeSingle()

      // Sich selbst werben geht nicht
      if (werber?.id && werber.id !== user.id) {
        const exp = new Date()
        exp.setMonth(exp.getMonth() + 6)

        await admin.from("credits").insert({
          user_id: werber.id,
          hours: 2,
          type: "referral",
          redemption_code: genCode(),
          expires_at: exp.toISOString(),
          ref_id: user.id,          // wen er geworben hat — verhindert Doppel-Gutschriften
        })
      }
    }
  } catch (e) {
    // Ein fehlgeschlagenes Referral darf die Registrierung nie scheitern lassen
    console.error("Referral-Gutschrift fehlgeschlagen:", e)
  }

  return NextResponse.json({ ok: true })
}
