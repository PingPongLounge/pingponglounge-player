import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendChallengeNotice } from "@/lib/email"
import { ligaForLevel, MAX_RANKED_PER_OPPONENT } from "@/lib/rewards"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { season_id, challenged_id, when } = await req.json()
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.id === challenged_id)
    return NextResponse.json({ error: "Kannst du nicht" }, { status: 400 })

  const admin = createAdminClient()

  // Beide müssen angemeldet sein
  const { data: regs } = await admin.from("league_registrations")
    .select("player_id").eq("season_id", season_id)
    .in("player_id", [user.id, challenged_id])
  if (!regs || regs.length < 2)
    return NextResponse.json({ error: "Spieler nicht angemeldet" }, { status: 400 })

  // Kein doppelter offener Challenge. "accepted" gehörte hier immer schon dazu —
  // sonst konnte man neben einem angenommenen Match ein zweites eröffnen, das
  // im UI unsichtbar blieb.
  const { data: existing } = await admin.from("league_matches")
    .select("id").eq("season_id", season_id)
    .in("status", ["challenge_sent", "accepted", "pending", "p1_entered"])
    .or(`and(p1_id.eq.${user.id},p2_id.eq.${challenged_id}),and(p1_id.eq.${challenged_id},p2_id.eq.${user.id})`)
    .maybeSingle()
  if (existing)
    return NextResponse.json({ error: "Bereits ein offenes Match" }, { status: 400 })

  // Nur im eigenen Paar fordern (Rookie+Challenger / Advanced+Elite). Die Regel
  // stand bisher nur im UI — über die API war sie wirkungslos.
  const { data: lvls } = await admin.from("profiles").select("id,level").in("id", [user.id, challenged_id])
  const meinPaar = ligaForLevel((lvls || []).find(p => p.id === user.id)?.level)?.pair
  const seinPaar = ligaForLevel((lvls || []).find(p => p.id === challenged_id)?.level)?.pair
  if (!meinPaar || !seinPaar || meinPaar !== seinPaar)
    return NextResponse.json({ error: "Nicht in deiner Liga" }, { status: 400 })

  // Das Limit gegen denselben Gegner galt bisher NUR beim direkten Eintragen.
  // Über "Fordern" liess es sich beliebig oft umgehen — genau das, was
  // MAX_RANKED_PER_OPPONENT verhindern soll.
  const { count: gewertet } = await admin.from("league_matches")
    .select("id", { count: "exact", head: true })
    .eq("season_id", season_id).eq("ranked", true)
    .in("status", ["p1_entered", "confirmed"])
    .or(`and(p1_id.eq.${user.id},p2_id.eq.${challenged_id}),and(p1_id.eq.${challenged_id},p2_id.eq.${user.id})`)
  const ranked = (gewertet ?? 0) < MAX_RANKED_PER_OPPONENT

  const { data, error } = await admin.from("league_matches").insert({
    season_id, p1_id: user.id, p2_id: challenged_id,
    status: "challenge_sent", round: 0, ranked,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Den Geforderten per Mail informieren. Ohne das erfuhr er von der Forderung
  // nur, wenn er zufällig die App öffnete — und deshalb passierte nichts.
  try {
    const { data: authOpp } = await admin.auth.admin.getUserById(challenged_id)
    const oppEmail = authOpp?.user?.email
    const { data: profs } = await admin.from("profiles").select("id,name,level,elo").in("id", [user.id, challenged_id])
    const me = (profs || []).find(p => p.id === user.id)
    const opp = (profs || []).find(p => p.id === challenged_id)

    if (oppEmail && opp) {
      await sendChallengeNotice({
        to: oppEmail,
        challengerName: me?.name || "Ein Spieler",
        recipientName: opp.name || "Spieler",
        challengerLevel: me?.level ?? null,
        challengerElo: me?.elo ?? null,
        when: typeof when === "string" && when.trim() ? when.trim().slice(0, 60) : null,
      })
    }
  } catch (e) {
    console.error("Forderungs-Mail fehlgeschlagen:", e)
  }

  return NextResponse.json({ id: data.id })
}