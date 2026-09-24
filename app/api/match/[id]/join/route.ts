import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: game } = await admin.from("open_games")
    .select("id,status,max_players,is_official,price_per_player,kind").eq("id", id).single()
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 })
  if (!["open", "full"].includes(game.status)) return NextResponse.json({ error: "Spiel nicht mehr offen" }, { status: 409 })

  /* 24.09.2026: Diese Route ist der GRATIS-Beitritt — gedacht fuer Spiele, die
     ein Spieler selbst angelegt hat. Sie hat aber nie geprueft, ob der Platz
     etwas kostet. In der Liste unter /match rief der Knopf "Mitmachen" sie fuer
     JEDES Spiel auf, also auch fuer die offiziellen Abende zu CHF 10. Wer nicht
     auf die Detailseite ging (dort steht korrekt "Platz sichern · CHF 10"),
     bekam den Platz umsonst. Bezahlte Plaetze laufen ausschliesslich ueber
     /api/match/<id>/checkout — dort haengen Stripe, PingPoints und Gutschein
     dran. Die Regel gehoert hierher, nicht ins Frontend: eine zweite
     Eingangstuer darf sie nicht umgehen koennen. */
  if (game.is_official && (game.price_per_player ?? 0) > 0) {
    return NextResponse.json({
      error: "Dieser Platz kostet etwas — bitte über die Detailseite buchen.",
      code: "bezahlpflichtig",
      redirect: `/match/${game.id}`,
    }, { status: 402 })
  }

  // Aktuelle Teilnehmer
  const { data: players } = await admin.from("open_game_players").select("user_id,status").eq("game_id", id).neq("status", "left")
  const active = players || []
  if (active.some(p => p.user_id === user.id)) return NextResponse.json({ error: "Du bist schon dabei" }, { status: 409 })
  if (active.length >= game.max_players) return NextResponse.json({ error: "Spiel ist voll" }, { status: 409 })

  // Eigene Teilnahme eintragen
  const { error: insErr } = await admin.from("open_game_players").insert({ game_id: id, user_id: user.id, status: "joined" })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  // Zähler/Status aktualisieren
  const newCount = active.length + 1
  await admin.from("open_games").update({
    current_players: newCount,
    status: newCount >= game.max_players ? "full" : "open",
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  return NextResponse.json({ ok: true })
}
