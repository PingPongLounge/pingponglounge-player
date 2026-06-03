import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  const { data: t } = await sb
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single()
  if (!t) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const { data: regs } = await sb
    .from("tournament_registrations")
    .select("player_id,seed,profiles(name,elo,level)")
    .eq("tournament_id", id)
    .order("seed", { ascending: true })

  const { data: matches } = await sb
    .from("tournament_matches")
    .select("id,round,match_number,p1_id,p2_id,winner_id,sets,status,p1:profiles!tournament_matches_p1_id_fkey(name,elo),p2:profiles!tournament_matches_p2_id_fkey(name,elo)")
    .eq("tournament_id", id)
    .order("round").order("match_number")

  const isRegistered = user ? (regs || []).some(r => r.player_id === user.id) : false
  const myMatch = user ? (matches || []).find(m =>
    (m.p1_id === user.id || m.p2_id === user.id) && m.status === "p1_entered"
  ) : null

  return NextResponse.json({ tournament: t, registrations: regs || [], matches: matches || [], isRegistered, myMatch, userId: user?.id })
}