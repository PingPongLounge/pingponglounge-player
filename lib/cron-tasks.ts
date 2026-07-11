import { SupabaseClient } from "@supabase/supabase-js"
import { applyLeagueConfirm } from "@/lib/liga"
import { sendOnboardingReminder } from "@/lib/email"

// Frist, in der ein Gegner ein eingetragenes Ergebnis bestätigen kann.
// Danach gilt es automatisch als bestätigt.
export const CONFIRM_WINDOW_HOURS = 24

/**
 * Bestätigt alle überfälligen Liga-Ergebnisse (24h ohne Reaktion des Gegners).
 * Gerechnet ab entered_at, NICHT ab played_at (das ist das frei wählbare Spieldatum).
 *
 * Wird von zwei Seiten aufgerufen: vom täglichen Cron und — weil der Hobby-Plan
 * keine stündlichen Crons erlaubt — zusätzlich, wenn jemand die Liga öffnet.
 * So greift die 24h-Frist zeitnah statt erst beim nächsten nächtlichen Lauf.
 */
export async function autoConfirmOverdue(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - CONFIRM_WINDOW_HOURS * 3600 * 1000).toISOString()
  const { data: overdue } = await admin
    .from("league_matches")
    .select("id")
    .eq("status", "p1_entered")
    .not("winner_id", "is", null)
    .not("entered_at", "is", null)
    .lt("entered_at", cutoff)
    .limit(200)

  let confirmed = 0
  for (const m of overdue || []) {
    const r = await applyLeagueConfirm(admin, m.id)
    if (r.ok) confirmed++
  }
  return confirmed
}

/**
 * Erinnert alle, die sich vor über 24h registriert, aber das Onboarding nie
 * beendet haben (level is null). Jeder bekommt die Mail genau einmal.
 */
export async function remindStuckOnboarding(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: stuck } = await admin
    .from("profiles")
    .select("id,email")
    .is("level", null)
    .is("onboarding_reminded_at", null)
    .lt("created_at", cutoff)
    .limit(100)

  let sent = 0
  for (const p of stuck || []) {
    if (!p.email) continue
    const r = await sendOnboardingReminder({ to: p.email })
    if (r.ok) {
      await admin.from("profiles").update({ onboarding_reminded_at: new Date().toISOString() }).eq("id", p.id)
      sent++
    }
  }
  return sent
}
