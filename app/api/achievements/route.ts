import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export type Badge = {
  id: string
  icon: string
  title: string
  description: string
  earned: boolean
  earnedAt?: string
  tier: "bronze" | "silver" | "gold" | "special"
}

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Profil-Daten
  const { data: profile } = await sb
    .from("profiles")
    .select("elo,matches_played,matches_won,level,created_at,canton")
    .eq("id", user.id)
    .single()

  if (!profile) return NextResponse.json({ badges: [] })

  // Match-Daten für spezifische Badges
  const { data: matches } = await sb
    .from("league_matches")
    .select("id,winner_id,confirmed_at,p1_id,p2_id,p1:profiles!league_matches_p1_id_fkey(elo),p2:profiles!league_matches_p2_id_fkey(elo)")
    .eq("status", "confirmed")
    .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    .order("confirmed_at", { ascending: true })

  // Liga-Teilnahmen
  const { data: ligaRegs } = await sb
    .from("league_registrations")
    .select("id,created_at")
    .eq("player_id", user.id)

  const played   = profile.matches_played ?? 0
  const won      = profile.matches_won ?? 0
  const lost     = played - won
  const elo      = profile.elo ?? 1000
  const winRate  = played > 0 ? (won / played) : 0
  const matchList = matches || []

  // Streak berechnen (aktuelle Siegesserie)
  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  for (const m of [...matchList].reverse()) {
    if (m.winner_id === user.id) {
      tempStreak++
      if (tempStreak > maxStreak) maxStreak = tempStreak
      if (currentStreak === tempStreak - 1) currentStreak = tempStreak
    } else {
      tempStreak = 0
      if (currentStreak === tempStreak + 1) currentStreak = 0
    }
  }
  // Simpler recalc for current streak
  currentStreak = 0
  for (const m of [...matchList].reverse()) {
    if (m.winner_id === user.id) currentStreak++
    else break
  }

  // Stärksten Gegner besiegt
  let bestOpponentElo = 0
  for (const m of matchList) {
    if (m.winner_id !== user.id) continue
    const oppP1 = Array.isArray(m.p1) ? m.p1[0] : m.p1
    const oppP2 = Array.isArray(m.p2) ? m.p2[0] : m.p2
    const oppElo = m.p1_id === user.id ? (oppP2?.elo ?? 0) : (oppP1?.elo ?? 0)
    if (oppElo > bestOpponentElo) bestOpponentElo = oppElo
  }

  // First match date
  const firstMatch = matchList[0]?.confirmed_at

  // Badge Definitionen
  const badges: Badge[] = [
    // ── Erste Schritte ──
    {
      id: "first_match",
      icon: "🏓",
      title: "Erstes Match",
      description: "Dein allererstes Match gespielt",
      tier: "bronze",
      earned: played >= 1,
      earnedAt: played >= 1 ? firstMatch : undefined,
    },
    {
      id: "first_win",
      icon: "🏆",
      title: "Erster Sieg",
      description: "Dein erster Sieg",
      tier: "bronze",
      earned: won >= 1,
    },
    {
      id: "liga_join",
      icon: "📋",
      title: "Liga-Spieler",
      description: "Einer Liga beigetreten",
      tier: "bronze",
      earned: (ligaRegs?.length ?? 0) >= 1,
      earnedAt: ligaRegs?.[0]?.created_at,
    },

    // ── Match-Anzahl ──
    {
      id: "matches_10",
      icon: "🔟",
      title: "10 Matches",
      description: "10 Matches gespielt",
      tier: "bronze",
      earned: played >= 10,
    },
    {
      id: "matches_25",
      icon: "⚡",
      title: "25 Matches",
      description: "25 Matches gespielt",
      tier: "silver",
      earned: played >= 25,
    },
    {
      id: "matches_50",
      icon: "🔥",
      title: "50 Matches",
      description: "50 Matches gespielt",
      tier: "gold",
      earned: played >= 50,
    },
    {
      id: "matches_100",
      icon: "💯",
      title: "100 Matches",
      description: "100 Matches gespielt — Legende",
      tier: "gold",
      earned: played >= 100,
    },

    // ── Siege ──
    {
      id: "wins_5",
      icon: "✌️",
      title: "5 Siege",
      description: "5 Matches gewonnen",
      tier: "bronze",
      earned: won >= 5,
    },
    {
      id: "wins_20",
      icon: "🎯",
      title: "20 Siege",
      description: "20 Matches gewonnen",
      tier: "silver",
      earned: won >= 20,
    },
    {
      id: "wins_50",
      icon: "👑",
      title: "50 Siege",
      description: "50 Matches gewonnen",
      tier: "gold",
      earned: won >= 50,
    },

    // ── ELO ──
    {
      id: "elo_1200",
      icon: "📈",
      title: "Aufsteiger",
      description: "ELO 1200 erreicht",
      tier: "bronze",
      earned: elo >= 1200,
    },
    {
      id: "elo_1400",
      icon: "🚀",
      title: "Stark",
      description: "ELO 1400 erreicht",
      tier: "silver",
      earned: elo >= 1400,
    },
    {
      id: "elo_1600",
      icon: "⭐",
      title: "Elite",
      description: "ELO 1600 erreicht",
      tier: "gold",
      earned: elo >= 1600,
    },
    {
      id: "elo_1800",
      icon: "🌟",
      title: "Master",
      description: "ELO 1800 — Absolute Spitze",
      tier: "special",
      earned: elo >= 1800,
    },

    // ── Win Rate ──
    {
      id: "winrate_60",
      icon: "📊",
      title: "Siegertyp",
      description: "60% Siegquote (min. 10 Matches)",
      tier: "silver",
      earned: played >= 10 && winRate >= 0.6,
    },
    {
      id: "winrate_75",
      icon: "🎖️",
      title: "Dominierend",
      description: "75% Siegquote (min. 20 Matches)",
      tier: "gold",
      earned: played >= 20 && winRate >= 0.75,
    },

    // ── Streaks ──
    {
      id: "streak_3",
      icon: "⚔️",
      title: "3er Streak",
      description: "3 Siege in Folge",
      tier: "bronze",
      earned: maxStreak >= 3,
    },
    {
      id: "streak_5",
      icon: "🔱",
      title: "5er Streak",
      description: "5 Siege in Folge",
      tier: "silver",
      earned: maxStreak >= 5,
    },
    {
      id: "streak_10",
      icon: "⚡",
      title: "Unaufhaltsam",
      description: "10 Siege in Folge",
      tier: "gold",
      earned: maxStreak >= 10,
    },

    // ── Spezial ──
    {
      id: "giant_killer",
      icon: "🐉",
      title: "Giant Killer",
      description: "Einen Spieler mit 200+ ELO mehr besiegt",
      tier: "special",
      earned: bestOpponentElo >= elo + 200,
    },
    {
      id: "resilient",
      icon: "💪",
      title: "Kämpfer",
      description: "10 Niederlagen überstanden",
      tier: "bronze",
      earned: lost >= 10,
    },
    {
      id: "veteran",
      icon: "🎗️",
      title: "Veteran",
      description: "Dabei seit Anfang (frühe Registrierung)",
      tier: "special",
      earned: new Date(profile.created_at) < new Date("2026-09-01"),
    },
  ]

  const earned = badges.filter(b => b.earned).length
  return NextResponse.json({ badges, earned, total: badges.length })
}