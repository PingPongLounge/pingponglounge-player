import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { istGewertet } from "@/lib/liga"
import { NextRequest, NextResponse } from "next/server"

// Sagt VOR dem Spiel, ob es für die ELO zählt.
// Ohne das erfährt man erst hinterher, dass die Partie nichts gebracht hat —
// und das fühlt sich wie ein Fehler an, obwohl es die Regel ist.
export async function GET(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const opponent = req.nextUrl.searchParams.get("opponent")
  if (!opponent || opponent === user.id) return NextResponse.json({ error: "Kein Gegner" }, { status: 400 })

  const info = await istGewertet(createAdminClient(), user.id, opponent)
  return NextResponse.json(info)
}
