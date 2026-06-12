import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { PP_REWARDS } from "@/lib/rewards"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: tx } = await sb.from("ping_points_transactions").select("amount").eq("player_id", user.id)
  const total = (tx || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)

  const { data: claims } = await sb.from("reward_claims")
    .select("reward_threshold, status").eq("player_id", user.id)
  const claimedSet = new Set((claims || []).map((c: { reward_threshold: number }) => c.reward_threshold))

  return NextResponse.json({
    total,
    rewards: PP_REWARDS.map(r => ({ ...r, unlocked: total >= r.threshold, claimed: claimedSet.has(r.threshold) }))
  })
}

export async function POST(req: NextRequest) {
  const { threshold } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const reward = PP_REWARDS.find(r => r.threshold === threshold)
  if (!reward) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const { data: tx } = await sb.from("ping_points_transactions").select("amount").eq("player_id", user.id)
  const total = (tx || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)
  if (total < threshold) return NextResponse.json({ error: "Zu wenig PingPoints" }, { status: 400 })

  const { data: existing } = await sb.from("reward_claims")
    .select("id").eq("player_id", user.id).eq("reward_threshold", threshold).maybeSingle()
  if (existing) return NextResponse.json({ error: "Bereits eingelöst" }, { status: 400 })

  await sb.from("reward_claims").insert({
    player_id: user.id, reward_threshold: threshold,
    reward_label: reward.label, status: "pending",
  })
  return NextResponse.json({ ok: true, message: `${reward.label} angefordert — wir melden uns!` })
}