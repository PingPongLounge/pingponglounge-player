import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Öffentliche Rang-Vorschau für den /spielen Hook-Flow.
// Schätzt anhand eines ELO-Werts, auf welchem Rang ein neuer Spieler landen würde.
// Best-effort: bei RLS/Fehler oder leerer Tabelle → { rank: null, total: null } mit Status 200.
export async function GET(req: NextRequest) {
  const eloParam = req.nextUrl.searchParams.get("elo")
  const elo = Number(eloParam)

  if (!eloParam || !Number.isFinite(elo)) {
    return NextResponse.json({ rank: null, total: null })
  }

  try {
    const sb = await createClient()

    // Anzahl Spieler mit kleinerer ELO (würden hinter dem neuen Spieler liegen)
    const { count: below, error: belowErr } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .lt("elo", elo)

    // Gesamtzahl der Spieler
    const { count: total, error: totalErr } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })

    if (belowErr || totalErr || below === null || total === null) {
      return NextResponse.json({ rank: null, total: null })
    }

    // Rang = Anzahl darunter + 1 (gegenüber bestehenden Spielern)
    return NextResponse.json({ rank: below + 1, total: total + 1 })
  } catch {
    return NextResponse.json({ rank: null, total: null })
  }
}
