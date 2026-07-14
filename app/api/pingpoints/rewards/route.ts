import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { PP_REWARDS } from "@/lib/rewards"
import { sendRewardClaimStaff, sendRewardClaimPlayer } from "@/lib/email"

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: tx } = await admin.from("ping_points_transactions").select("amount").eq("player_id", user.id)
  const total = (tx || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)

  const { data: claims } = await admin.from("reward_claims")
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

  const admin = createAdminClient()
  const { data: tx } = await admin.from("ping_points_transactions").select("amount").eq("player_id", user.id)
  const total = (tx || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)
  if (total < threshold) return NextResponse.json({ error: "Zu wenig PingPoints" }, { status: 400 })

  const { data: existing } = await admin.from("reward_claims")
    .select("id").eq("player_id", user.id).eq("reward_threshold", threshold).maybeSingle()
  if (existing) return NextResponse.json({ error: "Bereits eingelöst" }, { status: 400 })

  await admin.from("reward_claims").insert({
    player_id: user.id, reward_threshold: threshold,
    reward_label: reward.label, status: "pending",
  })

  // Punkte auch tatsächlich abziehen. Bisher wurde nur ein Claim angelegt — wer
  // 500 Punkte hatte, konnte alle Prämien nacheinander holen und behielt seine
  // 500 Punkte. "Guthaben" und "einlösen" waren damit blosse Behauptungen.
  await admin.from("ping_points_transactions").insert({
    player_id: user.id,
    amount: -threshold,
    source: "redeem",
    description: `Eingelöst: ${reward.label}`,
  })

  // "Wir melden uns" war bisher eine Lüge: Es gab keine Mail, keine Ansicht, und
  // /staff/redeem kennt reward_claims gar nicht. Der Spieler zahlte Punkte und
  // bekam einen Datenbankeintrag, den niemand je sah. Jetzt geht eine Mail ans
  // Team UND eine Bestätigung an den Spieler.
  try {
    const { data: p } = await admin.from("profiles").select("name").eq("id", user.id).maybeSingle()
    const { data: authUser } = await admin.auth.admin.getUserById(user.id)
    const mail = authUser?.user?.email || null

    await sendRewardClaimStaff({
      playerName: p?.name || "Spieler",
      playerEmail: mail,
      rewardLabel: reward.label,
      threshold,
    })

    if (mail) {
      await sendRewardClaimPlayer({
        to: mail,
        name: p?.name || "Spieler",
        rewardLabel: reward.label,
        threshold,
      })
    }
  } catch (e) {
    console.error("Prämien-Mail fehlgeschlagen:", e)
  }

  return NextResponse.json({ ok: true, message: `${reward.label} angefordert — du bekommst gleich eine Bestätigung per Mail.` })
}