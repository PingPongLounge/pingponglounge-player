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
import {
  Hero, Inhalt, AbschnittKopf, Feld, StatsReihe, ListenZeile, Pille,
  knopfPrimaer, knopfOutlineHell, TEXT_LEISE, FLAECHE,
} from "@/app/components/V2"

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
    <>
    <main style={{ minHeight: "100dvh", background: FLAECHE, color: SCHWARZ, fontFamily: INTER }}>

      <Hero
        bild="/ppl-equipment.jpg" pos="50% 52%"
        etikett="Player"
        titel={p.name}
        subline={`Level ${p.level}${p.canton ? ` · ${p.canton}` : ""}`}
        kopf={
          <div className="ppl-breit" style={{ paddingTop: 16 }}>
            <Link href="/rangliste" style={{
              fontFamily: INTER, fontSize: 13, fontWeight: 800, letterSpacing: ".08em",
              textTransform: "uppercase", color: "rgba(255,255,255,.8)", textDecoration: "none",
            }}>← Rangliste</Link>
          </div>
        }
      />

      <Inhalt>
        <Feld padding="18px 16px">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ProfilAvatar src={p.avatar_url} name={p.name} groesse={64} editierbar={eigenes} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(24px,6.5vw,32px)", lineHeight: 1, textTransform: "uppercase" }}>{p.name}</strong>
              <span style={{ display: "block", fontSize: 14.5, color: TEXT_LEISE, marginTop: 5 }}>Level {p.level}{p.canton ? ` · ${p.canton}` : ""}</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(8,8,8,.10)", marginTop: 16 }}>
            <StatsReihe werte={[
              { wert: p.elo ?? 1000, label: "Rating" },
              { wert: `#${(hoeher ?? 0) + 1}`, label: "Rang", akzent: true },
              { wert: gespielt, label: "Matches" },
              { wert: quote !== null ? `${quote}%` : "—", label: "Win Rate" },
            ]} />
          </div>
        </Feld>

        <div style={{ marginTop: 18 }}>
          {eigenes
            ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 480 }}>
                <Link href="/profil" style={{ ...knopfPrimaer, flex: "1 1 150px" }}>Mein Profil</Link>
                <Link href="/liga" style={{ ...knopfOutlineHell, flex: "1 1 150px" }}>Liga</Link>
              </div>
            : <ProfilAktionen spielerId={id} name={p.name} angemeldet={!!user} />}
        </div>

        <div style={{ marginTop: 26 }}>
          <AbschnittKopf titel="Letzte Spiele" />
          <Feld>
            {spiele.length ? spiele.map((m, i) => {
              const meins = m.p1_id === id
              const gewann = m.winner_id === id
              const saetze = (m.sets || []).map(x => (meins ? `${x.p1}:${x.p2}` : `${x.p2}:${x.p1}`)).join("  ")
              return (
                <ListenZeile
                  key={m.id}
                  erste={i === 0}
                  titel={`vs. ${nameVon(meins ? m.p2_id : m.p1_id)}`}
                  unter={`${saetze || "ohne Sätze"}${m.played_at ? ` · ${new Date(m.played_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" })}` : ""}`}
                  rechts={<Pille text={gewann ? "Sieg" : "Niederlage"} ton={gewann ? "gut" : "warn"} />}
                />
              )
            }) : (
              <div style={{ padding: 16, fontSize: 15, color: TEXT_LEISE }}>Noch keine bestätigten Spiele.</div>
            )}
          </Feld>
        </div>
      </Inhalt>
    </main>
    </>
  )
}
