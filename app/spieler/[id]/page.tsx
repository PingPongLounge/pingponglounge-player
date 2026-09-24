/* Oeffentliches Spielerprofil (07.09.2026): ohne Konto lesbar. Alles hier
   steht in public_profiles und in bestaetigten Liga-Spielen — nichts
   Persoenliches. Das eigene Profil mit Einstellungen bleibt unter /profil.

   24.09.2026: auf das Design-System V3 gezogen. Derselbe Kopf wie die
   Startseite (PlayerKopf, eine Anton-Zeile, Eyebrow, Kennzahlenstreifen),
   darunter .p-karte / .p-kopf / .p-zeile. Daten, Abfragen und Aktionen
   sind unveraendert. */
import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import ProfilAvatar from "@/app/components/ProfilAvatar"
import ProfilAktionen from "@/app/components/ProfilAktionen"
import PlayerKopf from "@/app/components/PlayerKopf"
import { ANTON, INTER, TEXT, LEISE, BG, knopf, knopfUmriss } from "@/app/design"

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
    <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>

      <header className="p-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/training-hero.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
        <div aria-hidden className="p-hero-schleier" />

        <PlayerKopf />

        <div className="p-spalte p-hero-inhalt">
          <Link href="/rangliste" className="p-zurueck">← Rangliste</Link>
          <h1 className="p-h1">{p.name}</h1>
          <p className="p-eyebrow">Level {p.level}{p.canton ? ` · ${p.canton}` : ""}</p>

          <div className="p-streifen">
            <div>
              <span className="zahl">{p.elo ?? 1000}</span>
              <span className="was">Rating</span>
            </div>
            <div>
              <span className="zahl">#{(hoeher ?? 0) + 1}</span>
              <span className="was">Rang</span>
            </div>
            <div>
              <span className="zahl">{quote !== null ? `${quote}%` : "—"}</span>
              <span className="was">Win Rate</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>

        <section className="p-karte">
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18 }}>
            <ProfilAvatar src={p.avatar_url} name={p.name} groesse={64} editierbar={eigenes} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{
                display: "block", fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(24px,6.5vw,32px)",
                lineHeight: 1, textTransform: "uppercase", overflowWrap: "anywhere",
              }}>{p.name}</strong>
              <span style={{ display: "block", marginTop: 6, fontSize: 13, fontWeight: 400, color: LEISE }}>
                {gespielt} {gespielt === 1 ? "Match" : "Matches"} · {gewonnen} gewonnen
              </span>
            </div>
          </div>
        </section>

        <div className="p-abschnitt">
          {eigenes
            ? <div className="p-knopfreihe" style={{ marginTop: 0 }}>
                <Link href="/profil" style={knopf}>Mein Profil</Link>
                <Link href="/liga" style={knopfUmriss}>Liga</Link>
              </div>
            : <ProfilAktionen spielerId={id} name={p.name} angemeldet={!!user} />}
        </div>

        <section className="p-karte p-abschnitt">
          <div className="p-kopf"><h2>Letzte Spiele</h2></div>
          {spiele.length ? spiele.map(m => {
            const meins = m.p1_id === id
            const gewann = m.winner_id === id
            const saetze = (m.sets || []).map(x => (meins ? `${x.p1}:${x.p2}` : `${x.p2}:${x.p1}`)).join("  ")
            return (
              <div key={m.id} className="p-zeile">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>
                    vs. {nameVon(meins ? m.p2_id : m.p1_id)}
                  </b>
                  <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
                    {saetze || "ohne Sätze"}{m.played_at ? ` · ${new Date(m.played_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </span>
                </span>
                <span className={gewann ? "p-pille gut" : "p-pille"}>{gewann ? "Sieg" : "Niederlage"}</span>
              </div>
            )
          }) : (
            <p className="p-leer">Noch keine bestätigten Spiele.</p>
          )}
        </section>
      </div>
    </main>
  )
}
