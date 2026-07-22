import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRechte, darfStandort } from "@/lib/roles"
import { seedWert, selfRatingLabel } from "@/lib/tournaments"
import { NextRequest, NextResponse } from "next/server"

// SETZLISTEN-VORSCHLAG (nur Veranstalter)
// Erzeugt eine vorgeschlagene Reihenfolge nach Priorität:
//   1. offizielles Player-Elo  2. Player-Level  3. Gast-Selbsteinschätzung  4. „nicht eingestuft"
// Eine manuelle Einstufung (manual_rank) hat Vorrang, ohne die Originaldaten zu
// überschreiben. Der Veranstalter kann die Reihenfolge danach frei ändern
// (das speichert er über PATCH auf die Registrierung, Feld manual_rank).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: t } = await admin.from("player_tournaments").select("location_id").eq("id", id).maybeSingle()
  const rechte = await getRechte(admin, user.id, user.email)
  if (!darfStandort(rechte, t?.location_id)) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { data: regs } = await admin.from("tournament_registrations")
    .select("id,player_id,reg_type,first_name,last_name,self_rating,elo_at_signup,level_at_signup,manual_rank,waitlist,profiles(name)")
    .eq("tournament_id", id).eq("status", "active").eq("waitlist", false)

  const liste = (regs || []).map(r => {
    const auto = seedWert({ reg_type: r.reg_type, elo_at_signup: r.elo_at_signup, level_at_signup: r.level_at_signup, self_rating: r.self_rating })
    const name = r.player_id ? ((r.profiles as { name?: string } | null)?.name || "Spieler")
                             : `${r.first_name || ""} ${r.last_name || ""}`.trim()
    const grundlage = r.player_id
      ? (typeof r.elo_at_signup === "number" ? `Elo ${r.elo_at_signup}` : r.level_at_signup ? `Level ${r.level_at_signup}` : "nicht eingestuft")
      : (selfRatingLabel(r.self_rating) || "nicht eingestuft")
    // manueller Rang hat Vorrang; sonst nach Setzwert absteigend (stärkste zuerst)
    const sortWert = typeof r.manual_rank === "number" ? -r.manual_rank : (auto ?? -1)
    return { id: r.id, name, reg_type: r.reg_type, grundlage, seed_value: auto, manual_rank: r.manual_rank ?? null, _sort: sortWert }
  }).sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }, i) => ({ ...rest, vorschlag_seed: i + 1 }))

  return NextResponse.json({ seeding: liste })
}
