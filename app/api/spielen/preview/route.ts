import { createAdminClient } from "@/lib/supabase/admin"
import { globalLeagueId } from "@/lib/liga"
import { NextRequest, NextResponse } from "next/server"

/* Oeffentliche Rang-Vorschau fuer den /spielen-Einstieg (QR am Tisch).
   Schaetzt, auf welchem Rang ein neuer Spieler mit dieser ELO landen wuerde.

   24.09.2026: Die Route zaehlte mit dem ANONYMEN Supabase-Client. Auf
   profiles greift RLS — ein Besucher ohne Konto sah dort null Zeilen. Das
   Ergebnis war deshalb IMMER { rank: 1, total: 1 }: jedem Gast wurde
   "geschaetzter Start-Rang #1" versprochen, unabhaengig von seinem
   Resultat. Jetzt zaehlt die Service-Rolle, und zwar dieselbe Auswahl wie
   die Rangliste: in der globalen Liga angemeldet und dort sichtbar.

   Best-effort: bei Fehler oder leerer Tabelle { rank: null, total: null }
   mit Status 200 — die Seite zeigt dann ihren neutralen Hinweis. */
export async function GET(req: NextRequest) {
  const eloParam = req.nextUrl.searchParams.get("elo")
  const elo = Number(eloParam)

  if (!eloParam || !Number.isFinite(elo)) {
    return NextResponse.json({ rank: null, total: null })
  }

  try {
    const admin = createAdminClient()
    const seasonId = await globalLeagueId(admin)
    if (!seasonId) return NextResponse.json({ rank: null, total: null })

    const { data: regs } = await admin.from("league_registrations")
      .select("player_id").eq("season_id", seasonId)
    const ids = (regs || []).map(r => r.player_id)
    if (ids.length === 0) return NextResponse.json({ rank: null, total: null })

    const { data: profs, error } = await admin.from("profiles")
      .select("elo,visible_in_ranking").in("id", ids)
      .or("visible_in_ranking.is.null,visible_in_ranking.eq.true")
    if (error || !profs) return NextResponse.json({ rank: null, total: null })

    const elos = profs.map(p => p.elo ?? 1000)
    const darueber = elos.filter(e => e > elo).length

    // Rang = Anzahl Besserer + 1. Gesamt = bestehende Spieler + der neue.
    return NextResponse.json({ rank: darueber + 1, total: elos.length + 1 })
  } catch {
    return NextResponse.json({ rank: null, total: null })
  }
}
