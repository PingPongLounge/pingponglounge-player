import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verlauf: die letzten 50 zur Anzeige.
  const { data: transactions } = await sb
    .from("ping_points_transactions")
    .select("id,amount,source,description,created_at")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  // Guthaben: über ALLE Transaktionen. Vorher wurde es aus denselben 50 Zeilen
  // gerechnet — ab der 51. Buchung zeigte die App ein falsches Guthaben an,
  // und zwar ein anderes als die Prämienseite und die Startseite.
  const { data: alle } = await sb
    .from("ping_points_transactions")
    .select("amount")
    .eq("player_id", user.id)

  const balance = (alle || []).reduce((sum, t) => sum + t.amount, 0)

  return NextResponse.json({ balance, transactions: transactions || [] })
}