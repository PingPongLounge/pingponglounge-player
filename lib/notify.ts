import type { SupabaseClient } from "@supabase/supabase-js"

// ─── NACHRICHTENZENTRALE ─────────────────────────────────────────────────────
// EIN Helfer, der überall eine In-App-Benachrichtigung erzeugt. Bewusst
// „best effort": schlägt das Schreiben fehl, darf die auslösende Aktion (z.B.
// eine Forderung senden) NICHT scheitern. Push aufs Gerät kommt später mit der
// installierten App dazu — dieselben Datensätze, nur zusätzlich gepusht.

export type NotifType =
  | "challenge" | "challenge_accepted" | "result_confirm" | "result_confirmed"
  | "waitlist_promoted" | "friend_request" | "friend_accepted" | "reminder"

export async function notify(
  admin: SupabaseClient,
  userId: string | null | undefined,
  type: NotifType,
  title: string,
  opts: { body?: string; link?: string } = {},
): Promise<void> {
  if (!userId) return
  try {
    await admin.from("notifications").insert({
      user_id: userId, type, title, body: opts.body ?? null, link: opts.link ?? null,
    })
  } catch (e) {
    console.error("notify fehlgeschlagen:", e)
  }
}
