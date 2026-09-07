/* Oeffentliches Spielerprofil (07.09.2026): ohne Konto lesbar. Alles hier
   steht in public_profiles und in bestaetigten Liga-Spielen — nichts
   Persoenliches. Das eigene Profil mit Einstellungen bleibt unter /profil.

   Rhythmus (Vorgabe Oliver): SCHWARZER KOPF → OFF-WHITE STATS → SCHWARZER
   INHALT. Der Avatar ist der Mittelpunkt oben, die Aktionen stehen direkt
   darunter — nicht mehr als Aufforderung am Seitenende. */
import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import ProfilAvatar from "@/app/components/ProfilAvatar"
import ProfilAktionen from "@/app/components/ProfilAktionen"
import StatsBand from "@/app/components/StatsBand"
import { NeonTitel } from "@/app/components/V2"

const SCHWARZ = "#080808", CREME = "#F4F1EB", VIOLETT = "#8C3DFF"
const LEISE = "rgba(244,241,235,.62)", TRENN = "rgba(244,241,235,.13)"
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
    .select("id,name,level,elo,matches_played,matches_won,canton,avatar_url")
    .eq("id", id)
    .maybeSingle()
  if (!p) notFound()

  const sb = await createClient()
  const [{ data: { user } }, { data: rohe }, { count: hoeher }] = await Promise.all([
    sb.auth.getUser(),
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

  // Das eigene Profil zeigt den Bild-Knopf und keine Aktionen gegen sich selbst.
  const eigenes = !!user && user.id === id

  const spiele = (rohe || []) as Spiel[]
  const gegnerIds = [...new Set(spiele.map(m => (m.p1_id === id ? m.p2_id : m.p1_id)))]
  const { data: gegner } = gegnerIds.length
    ? await admin.from("public_profiles").select("id,name").in("id", gegnerIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const nameVon = (gid: string) => (gegner || []).find(g => g.id === gid)?.name || "Spieler"

  const gespielt = p.matches_played ?? 0
  const gewonnen = p.matches_won ?? 0
  const quote = gespielt ? Math.round((gewonnen / gespielt) * 100) : null

  return (
    <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER, paddingBottom: 56 }}>

      {/* ── SCHWARZER KOPF: Avatar, Name, Level/Ort, Aktionen ── */}
      <header className="ppl-breit" style={{ paddingTop: 22, paddingBottom: 34 }}>
        <Link href="/rangliste" style={{
          fontFamily: INTER, fontSize: 13, fontWeight: 800, letterSpacing: ".08em",
          textTransform: "uppercase", color: LEISE, textDecoration: "none",
        }}>← Rangliste</Link>

        <NeonTitel text="Game face." groesse="clamp(38px,11vw,64px)" />

        <div style={{ marginTop: 10 }}>
          <ProfilAvatar src={p.avatar_url} name={p.name} groesse={104} editierbar={eigenes} />
        </div>

        <h1 style={{
          fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(42px,12vw,68px)",
          lineHeight: .95, textTransform: "uppercase", margin: "20px 0 0",
        }}>{p.name}</h1>

        <div style={{ fontFamily: INTER, fontSize: 16, color: LEISE, marginTop: 8 }}>
          Level {p.level}{p.canton ? ` · ${p.canton}` : ""}
        </div>

        {eigenes
          ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
              <Link href="/profil" style={{
                flex: "1 1 150px", textAlign: "center", background: VIOLETT, color: CREME,
                borderRadius: 100, padding: "15px 20px", fontFamily: INTER, fontSize: 14,
                fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none",
              }}>Mein Profil</Link>
              <Link href="/liga" style={{
                flex: "1 1 150px", textAlign: "center", background: "transparent", color: CREME,
                border: `1.5px solid rgba(244,241,235,.34)`, borderRadius: 100, padding: "13.5px 20px",
                fontFamily: INTER, fontSize: 14, fontWeight: 900, letterSpacing: ".1em",
                textTransform: "uppercase", textDecoration: "none",
              }}>Liga</Link>
            </div>
          : <ProfilAktionen spielerId={id} name={p.name} angemeldet={!!user} />}
      </header>

      {/* ── OFF-WHITE STATS: der eine helle Kontrast ── */}
      <StatsBand werte={[
        { wert: p.elo ?? 1000, label: "Rating" },
        { wert: `#${(hoeher ?? 0) + 1}`, label: "Rang", akzent: true },
        { wert: gespielt, label: "Matches" },
        { wert: quote !== null ? `${quote}%` : "—", label: "Win Rate" },
      ]} />

      {/* ── SCHWARZER INHALT: letzte Spiele ── */}
      <section className="ppl-breit" style={{ paddingTop: 34 }}>
        <h2 style={{
          fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: ".16em",
          textTransform: "uppercase", color: VIOLETT, margin: "0 0 4px",
        }}>Letzte Spiele</h2>

        {spiele.length ? spiele.map(m => {
          const meins = m.p1_id === id
          const gewann = m.winner_id === id
          const saetze = (m.sets || []).map(s => (meins ? `${s.p1}:${s.p2}` : `${s.p2}:${s.p1}`)).join("  ")
          return (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 0", borderTop: `1px solid ${TRENN}`,
            }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontFamily: INTER, fontSize: 17, fontWeight: 700 }}>{nameVon(meins ? m.p2_id : m.p1_id)}</b>
                <span style={{ display: "block", fontFamily: INTER, fontSize: 14, color: LEISE, marginTop: 3 }}>
                  {saetze || "ohne Sätze"}{m.played_at ? ` · ${new Date(m.played_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                </span>
              </span>
              <span style={{
                fontFamily: INTER, fontSize: 13, fontWeight: 900, letterSpacing: ".08em",
                textTransform: "uppercase", color: gewann ? VIOLETT : LEISE, whiteSpace: "nowrap",
              }}>{gewann ? "Sieg" : "Niederlage"}</span>
            </div>
          )
        }) : (
          <p style={{
            fontFamily: INTER, fontSize: 16, color: LEISE,
            padding: "16px 0", borderTop: `1px solid ${TRENN}`, margin: 0,
          }}>Noch keine bestätigten Spiele.</p>
        )}
      </section>
    </main>
  )
}
