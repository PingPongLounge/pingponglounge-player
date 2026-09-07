/* Oeffentliches Spielerprofil (07.09.2026, Oliver): ohne Konto lesbar.
   Alles hier steht in public_profiles und in bestaetigten Liga-Spielen —
   nichts Persoenliches. Wer herausfordern oder befreunden will, braucht ein
   Konto; dafuer steht unten der eine Knopf. Das eigene Profil mit Einstellungen
   bleibt unter /profil und weiterhin angemeldet. */
import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"

const SCHWARZ = "#0A0A0C", CREME = "#FFF9F3", VIOLETT = "#8C3DFF"
const LEISE = "rgba(255,249,243,.65)", TRENN = "rgba(255,249,243,.13)"
const ANTON = "var(--font-anton), Impact, sans-serif"
const INTER = "var(--font-inter), system-ui, sans-serif"

type Satz = { p1: number; p2: number }
type Spiel = { id: string; p1_id: string; p2_id: string; winner_id: string | null; sets: Satz[] | null; played_at: string | null }

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const { data } = await admin.from("public_profiles").select("name,elo").eq("id", id).maybeSingle()
  return data
    ? { title: `${data.name} — Rating ${data.elo ?? 1000} | PPL Player`, description: `Profil, Rating und letzte Spiele von ${data.name}.` }
    : { title: "Spieler | PPL Player" }
}

export default async function SpielerSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: p } = await admin
    .from("public_profiles")
    .select("id,name,level,elo,matches_played,matches_won,canton")
    .eq("id", id)
    .maybeSingle()
  if (!p) notFound()

  const [{ data: rohe }, { count: hoeher }] = await Promise.all([
    admin.from("league_matches")
      .select("id,p1_id,p2_id,winner_id,sets,played_at")
      .eq("status", "confirmed")
      .or(`p1_id.eq.${id},p2_id.eq.${id}`)
      .order("played_at", { ascending: false })
      .limit(8),
    admin.from("public_profiles")
      .select("id", { count: "exact", head: true })
      .gt("elo", p.elo ?? 1000).gt("matches_played", 0),
  ])

  const spiele = (rohe || []) as Spiel[]
  const gegnerIds = [...new Set(spiele.map(m => (m.p1_id === id ? m.p2_id : m.p1_id)))]
  const { data: gegner } = gegnerIds.length
    ? await admin.from("public_profiles").select("id,name").in("id", gegnerIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const nameVon = (gid: string) => (gegner || []).find(g => g.id === gid)?.name || "Spieler"

  const gespielt = p.matches_played ?? 0
  const gewonnen = p.matches_won ?? 0
  const quote = gespielt ? Math.round((gewonnen / gespielt) * 100) : null
  const rang = (hoeher ?? 0) + 1

  const zahl: React.CSSProperties = { fontFamily: ANTON, fontWeight: 400, fontSize: 30, color: CREME, lineHeight: 1 }
  const zahlLabel: React.CSSProperties = { display: "block", fontFamily: INTER, fontSize: 13, color: LEISE, marginTop: 5 }

  return (
    <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER, paddingBottom: 60 }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 22px" }}>

        <div style={{ padding: "22px 0 0" }}>
          <Link href="/rangliste" style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: LEISE, textDecoration: "none" }}>← Rangliste</Link>
        </div>

        <header style={{ padding: "26px 0 24px", borderBottom: `1px solid ${TRENN}` }}>
          <div style={{ fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", color: VIOLETT }}>Spieler</div>
          <h1 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(40px,11vw,68px)", lineHeight: .95, textTransform: "uppercase", margin: "10px 0 0" }}>{p.name}</h1>
          <div style={{ fontFamily: INTER, fontSize: 16, color: LEISE, marginTop: 8 }}>
            Level {p.level}{p.canton ? ` · ${p.canton}` : ""}
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "22px 0", borderBottom: `1px solid ${TRENN}` }}>
          <div><strong style={zahl}>{p.elo ?? 1000}</strong><small style={zahlLabel}>Rating</small></div>
          <div><strong style={zahl}>{rang}</strong><small style={zahlLabel}>Rang</small></div>
          <div><strong style={zahl}>{gespielt}</strong><small style={zahlLabel}>Matches</small></div>
          <div><strong style={zahl}>{quote !== null ? `${quote}%` : "—"}</strong><small style={zahlLabel}>Win Rate</small></div>
        </section>

        <section style={{ padding: "26px 0" }}>
          <div style={{ fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", color: VIOLETT, marginBottom: 6 }}>Letzte Spiele</div>
          {spiele.length ? spiele.map(m => {
            const meins = m.p1_id === id
            const gewann = m.winner_id === id
            const saetze = (m.sets || []).map(s => (meins ? `${s.p1}:${s.p2}` : `${s.p2}:${s.p1}`)).join("  ")
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: `1px solid ${TRENN}` }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{nameVon(meins ? m.p2_id : m.p1_id)}</b>
                  <span style={{ display: "block", fontFamily: INTER, fontSize: 14, color: LEISE, marginTop: 2 }}>
                    {saetze || "ohne Sätze"}{m.played_at ? ` · ${new Date(m.played_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </span>
                </span>
                <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: gewann ? VIOLETT : LEISE }}>
                  {gewann ? "Sieg" : "Niederlage"}
                </span>
              </div>
            )
          }) : <p style={{ fontFamily: INTER, fontSize: 15, color: LEISE, padding: "14px 0", borderTop: `1px solid ${TRENN}`, margin: 0 }}>Noch keine bestätigten Spiele.</p>}
        </section>

        {/* Erst hier braucht es ein Konto. */}
        <section style={{ borderTop: `1px solid ${TRENN}`, paddingTop: 26 }}>
          <p style={{ fontFamily: INTER, fontSize: 16, color: LEISE, margin: "0 0 18px", maxWidth: "44ch" }}>
            {p.name} herausfordern oder als Freund hinzufügen? Dafür brauchst du ein Konto.
          </p>
          <Link href={`/login?returnTo=${encodeURIComponent(`/spieler/${id}`)}`} style={{ display: "inline-block", background: CREME, color: SCHWARZ, borderRadius: 100, padding: "16px 30px", fontFamily: INTER, fontSize: 15, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}>
            Login / Registrieren
          </Link>
        </section>
      </div>
    </main>
  )
}
