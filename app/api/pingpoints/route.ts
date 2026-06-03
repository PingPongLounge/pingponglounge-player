import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: transactions } = await sb
    .from("ping_points_transactions")
    .select("id,amount,source,description,created_at")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const balance = (transactions || []).reduce((sum, t) => sum + t.amount, 0)

  return NextResponse.json({ balance, transactions: transactions || [] })
}