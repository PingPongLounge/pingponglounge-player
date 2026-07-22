import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRechte, darfStandort } from "@/lib/roles"
import { NextRequest, NextResponse } from "next/server"

// TEILNEHMERLISTE
// Öffentlich: nur die datenschutzkonforme Sicht (kein E-Mail/Telefon/Notiz,
// Nachname abgekürzt). Für Veranstalter (zentral oder Standortmanager des
// Turnier-Standorts): die vollständige Liste inkl. Zahlungs-/Warteliste-/
// Check-in-Status und Kontaktdaten für die Verwaltung.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: t } = await admin.from("player_tournaments").select("location_id").eq("id", id).maybeSingle()

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  let istVeranstalter = false
  if (user) {
    const rechte = await getRechte(admin, user.id, user.email)
    istVeranstalter = darfStandort(rechte, t?.location_id)
  }

  if (istVeranstalter) {
    // Vollständige Verwaltungs-Sicht.
    const { data } = await admin.from("tournament_registrations")
      .select("id,player_id,reg_type,source,first_name,last_name,email,phone,self_rating,elo_at_signup,level_at_signup,rank_at_signup,seeding_value,manual_rank,payment_status,amount_chf,waitlist,waitlist_pos,checked_in,status,note,created_at,profiles(name,elo,level)")
      .eq("tournament_id", id).order("waitlist", { ascending: true }).order("seeding_value", { ascending: false, nullsFirst: false })
    return NextResponse.json({ participants: data || [], manage: true })
  }

  // Öffentliche Sicht über die abgeschottete View.
  const { data } = await admin.from("tournament_participants_public")
    .select("*").eq("tournament_id", id)
  return NextResponse.json({ participants: data || [], manage: false })
}
