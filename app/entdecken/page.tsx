import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StartHomeV2, { Game } from '@/app/components/StartHomeV2'
import { PlayerZeichen } from '@/app/components/PlayerLogo'
import PlayerKopf from '@/app/components/PlayerKopf'
import {
  IconOpenGames, IconLiga, IconRangliste, IconTurniere, IconSpieler,
  IconMatches, IconPfeil, IconChevron,
} from '@/app/components/Icons'
import {
  DUNKEL, BG, TEXT, LEISE, KANTE, NEON, AKZENT, DUNKEL_KANTE, ANTON, INTER,
} from '@/app/design'



const LV = [
  { n: 'Level 1', min: 0 }, { n: 'Level 2', min: 1050 }, { n: 'Level 3', min: 1150 },
  { n: 'Level 4', min: 1250 }, { n: 'Level 5', min: 1350 }, { n: 'Level 6', min: 1450 }, { n: 'Level 7', min: 1600 },
]

function initialsFrom(name?: string | null): string {
  if (!name) return 'PP'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/* ---------- Oeffentliche Startseite: Tokens und Bausteine -------------------
   Auf Modulebene, nicht im Render-Rumpf: React-Komponenten, die beim Rendern
   neu erzeugt werden, verlieren bei jedem Durchlauf ihren Zustand (next lint
   "Cannot create components during render").

   Die Werte sind die des Design-Systems V3 (siehe app/globals.css). Sie
   stehen hier als Konstanten, damit Inline-Styles sie nutzen koennen; die
   CSS-Variablen in globals.css sind dieselben Werte fuer die Klassen. */
/* 24.09.2026: Die Werte standen hier als eigene Zeichenketten. Sie kommen
   jetzt aus app/design.ts — derselben Datei, aus der auch V2.tsx und
   theme.ts sie beziehen. Die kurzen P_-Namen bleiben, weil die Seite sie
   an ueber hundert Stellen benutzt; die Werte sind identisch. */
const P_DARK   = DUNKEL
const P_BG     = BG
const P_TEXT   = TEXT
const P_LEISE  = LEISE
const P_KANTE  = KANTE
const P_NEON   = NEON     // nur auf dunkel, sehr sparsam
const P_AKZENT = AKZENT   // nur auf hell, sehr sparsam
const P_DARK_KANTE = DUNKEL_KANTE
const P_ANTON = ANTON
const P_INTER = INTER

const leerZeile: React.CSSProperties = {
  margin: 0, padding: '18px', fontFamily: P_INTER, fontSize: 14, fontWeight: 400, color: P_LEISE,
}

const tagKurz = (d?: string | null) => d
  ? new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'short' }).replace('.', '')
  : '—'
const tagZahl = (d?: string | null) => d ? new Date(`${d}T12:00:00`).getDate() : '—'
const tagMon = (d?: string | null) => d
  ? new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { month: 'short' }).replace('.', '')
  : ''

/* Datumskachel: Wochentag, Zahl, Monat. Sie macht aus einer Liste einen
   Spielplan. `voll` = schwarz gefuellt, damit Turniere sich von Open Games
   auf einen Blick unterscheiden. */
function Datum({ d, voll = false }: { d?: string | null; voll?: boolean }) {
  return (
    <span className={voll ? 'p-datum voll' : 'p-datum'}>
      <span className="wt">{tagKurz(d)}</span>
      <span className="tag">{tagZahl(d)}</span>
      <span className="mon">{tagMon(d)}</span>
    </span>
  )
}

/* Initialen-Avatar. Von rund dreissig Spielern hat einer ein Foto — die
   Initialen sind hier also der Normalfall, nicht der Notbehelf. Deshalb
   ruhig und grafisch: Kreis in Weiss, feine Kante, dunkle Schrift. Kein
   Gruen; sonst haette die Seite dreissig gruene Kreise. */
function Initialen({ name, avatar }: { name?: string | null; avatar?: string | null }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt="" style={{
      width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto',
    }} />
  }
  return (
    <span aria-hidden style={{
      width: 46, height: 46, borderRadius: '50%', margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFFFFF', border: `1.5px solid ${P_KANTE}`, color: P_TEXT,
      fontFamily: P_INTER, fontSize: 14.5, fontWeight: 600, letterSpacing: '.02em',
    }}>{initialsFrom(name)}</span>
  )
}


export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    /* Oeffentliche Startseite — PLAYER ist ohne Konto browsbar.

       23.09.2026, Phase 1 des Design-Systems V3 (Referenzbild von Oliver):
       Swiss Sports Editorial. Die Grundwelt ist Schwarz / Weiss / neutrales
       Hellgrau; Gruen ist nur Akzent — Logo-Punkt, freie Plaetze, der eine
       Liga-Knopf, Rang 1, das Rating-Delta. Sonst nichts.

       Struktur von oben nach unten (mobil wie Desktop dieselbe Reihenfolge,
       ab 1100px liegen Open Games / Liga und Turniere / Spieler / Rangliste
       nebeneinander):
         Hero (dunkles Foto)  ·  drei Einstiege  ·  Open Games + Liga-Plakat
         Turniere + Spieler + Rangliste  ·  letzte Matches  ·  Konto-Plakat

       Alle Zahlen und Zeilen kommen aus der Datenbank. Keine Preise hier —
       die gehoeren auf die Detailseite. Community bleibt verborgen. */

    const heute = new Date().toISOString().slice(0, 10)

    /* Fehlt der Service-Key, warf createAdminClient() und die oeffentliche
       Startseite antwortete mit 500 — die eine Seite, die jeder Besucher
       zuerst sieht. Sie faellt auf den normalen Server-Client zurueck:
       alles hier ist ohnehin oeffentlich lesbar. */
    const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : sb

    const [spielerRes, topRes, gamesRes, gamesZahlRes, seasonRes, tourRes, tourZahlRes, feedRes, neueRes] =
      await Promise.all([
        admin.from('public_profiles').select('id', { count: 'exact', head: true }),
        // Vier holen, drei zeigen: faellt einer ohne Namen raus, steht die
        // Rangliste trotzdem auf drei Zeilen.
        admin.from('public_profiles').select('id,name,elo,level,matches_played')
          .gt('matches_played', 0).order('elo', { ascending: false }).limit(4),
        admin.from('open_games').select('id,location_name,date,start_hour,max_players,current_players,level')
          .not('kind', 'in', '(training,single_night)').in('status', ['open', 'full', 'p1_entered'])
          .not('date', 'is', null).gte('date', heute)
          .order('date', { ascending: true }).order('start_hour', { ascending: true }).limit(3),
        // Dieselben Bedingungen, nur gezaehlt — die Zahl im Kopf muss zu der
        // Liste darunter passen, sonst steht dort eine Behauptung.
        admin.from('open_games').select('id', { count: 'exact', head: true })
          .not('kind', 'in', '(training,single_night)').in('status', ['open', 'full', 'p1_entered'])
          .not('date', 'is', null).gte('date', heute),
        admin.from('league_seasons').select('id,name,city,status,start_date,max_players')
          .eq('is_global', false).eq('is_private', false).in('status', ['open', 'running'])
          .order('start_date', { ascending: true }).limit(1),
        admin.from('player_tournaments').select('id,name,date,city,start_time,status')
          .eq('published_player', true).neq('visibility', 'private')
          .in('status', ['published', 'registration_open', 'open', 'full', 'waitlist'])
          .gte('date', heute).order('date', { ascending: true }).limit(3),
        admin.from('player_tournaments').select('id', { count: 'exact', head: true })
          .eq('published_player', true).neq('visibility', 'private')
          .in('status', ['published', 'registration_open', 'open', 'full', 'waitlist'])
          .gte('date', heute),
        admin.from('league_matches')
          .select('id,winner_id,p1_id,p2_id,sets,confirmed_at,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name)')
          .eq('status', 'confirmed').order('confirmed_at', { ascending: false }).limit(3),
        admin.from('public_profiles').select('id,name,elo,avatar_url,created_at')
          .order('created_at', { ascending: false }).limit(14),
      ])

    const spielerCount = spielerRes.count || 0
    const gamesCount = gamesZahlRes.count || 0
    const tourCount = tourZahlRes.count || 0
    const top = (topRes.data || []).filter(p => !!p.name).slice(0, 3)
    const games = gamesRes.data || []
    const touren = tourRes.data || []
    const saison = (seasonRes.data || [])[0] || null

    /* Supabase typisiert die verbundenen Profile als Array — beim Lesen ist
       es jeweils genau eines. Deshalb ueber unknown normalisieren. */
    type FeedZeile = {
      id: string; winner_id: string | null; p1_id: string; p2_id: string
      sets: Array<{ p1: number; p2: number }> | null
      confirmed_at: string | null
      p1?: { name: string } | { name: string }[] | null
      p2?: { name: string } | { name: string }[] | null
    }
    const einer = (x: { name: string } | { name: string }[] | null | undefined) => Array.isArray(x) ? x[0] : x
    const feedRoh = (feedRes.data || []) as unknown as FeedZeile[]

    /* Rating-Aenderung steht nicht im Match, sondern in elo_history — eine
       Zeile je Spieler und Match. Wir holen nur die des Siegers. Fehlt eine,
       bleibt die Angabe weg statt eine Zahl zu erfinden. */
    const feedIds = feedRoh.map(m => m.id)
    const { data: deltaRoh } = feedIds.length
      ? await admin.from('elo_history').select('match_id,player_id,delta').in('match_id', feedIds)
      : { data: [] as Array<{ match_id: string; player_id: string; delta: number }> }

    /* Einmal ablesen, nicht pro Zeile — sonst rechnet jede Zeile mit einem
       leicht anderen "jetzt" (und next lint verbietet Date.now() im Render). */
    const jetzt = new Date().getTime()
    const seither = (iso?: string | null) => {
      if (!iso) return ''
      const min = Math.floor((jetzt - new Date(iso).getTime()) / 60000)
      if (min < 1) return 'gerade eben'
      if (min < 60) return `vor ${min} Min.`
      const std = Math.floor(min / 60)
      if (std < 24) return `vor ${std} Std.`
      const tage = Math.floor(std / 24)
      if (tage === 1) return 'gestern'
      if (tage < 31) return `vor ${tage} Tagen`
      const mon = Math.floor(tage / 30)
      return `vor ${mon} ${mon === 1 ? 'Monat' : 'Monaten'}`
    }

    const feed = feedRoh.map(m => {
      const p1win = m.winner_id === m.p1_id
      return {
        id: m.id,
        sieger: (p1win ? einer(m.p1) : einer(m.p2))?.name || 'Spieler',
        verlierer: (p1win ? einer(m.p2) : einer(m.p1))?.name || 'Spieler',
        // Jeder Satz aus Sicht des Siegers — "11:7 · 11:8 · 11:6".
        saetze: (m.sets || []).map(x => p1win ? `${x.p1}:${x.p2}` : `${x.p2}:${x.p1}`),
        delta: (deltaRoh || []).find(d => d.match_id === m.id && d.player_id === m.winner_id)?.delta ?? null,
        wann: seither(m.confirmed_at),
      }
    })

    type NeuZeile = { id: string; name: string | null; elo: number | null; avatar_url: string | null }
    const neueSpieler = ((neueRes.data || []) as NeuZeile[]).filter(x => !!x.name)

    const datumLang = (d?: string | null) => d
      ? new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'Datum offen'
    const uhr = (h?: number | null) => h != null ? `${String(h).padStart(2, '0')}:00` : ''

    return (
      <main className="p-seite" style={{ minHeight: '100dvh', background: P_BG, color: P_TEXT, fontFamily: P_INTER }}>

        {/* ══════════ HERO ══════════
            Dunkles Ping-Pong-Foto, kein Verlaufsschein. PLAYER gross und
            weiss — nicht gruen; gruen ist hier nur der Punkt im Logo.
            Keine Marketingzeile, kein "Umschauen geht ohne Konto". */}
        <header style={{ position: 'relative', background: P_DARK, color: '#FFFFFF', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/player-hero.jpg" alt="" aria-hidden className="p-foto"
            style={{ objectPosition: "50% 62%" }} />
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg,rgba(8,11,13,.80) 0%,rgba(8,11,13,.34) 30%,rgba(8,11,13,.52) 62%,rgba(8,11,13,.88) 100%)',
          }} />

          <div className="p-spalte" style={{ position: 'relative', zIndex: 2, paddingTop: 16, paddingBottom: 24 }}>
            {/* 24.09.2026: Der Kopf dieser Seite ist jetzt PlayerKopf — dieselbe
                Komponente, die auch Liga, Rangliste, Turniere und die
                eingeloggte Startseite tragen. Gerendert wird exakt dasselbe
                wie vorher; eigeneSpalte=false, weil die p-spalte hier schon
                den Hero-Block traegt. */}
            <PlayerKopf eigeneSpalte={false} />

            <div className="ent-heroBlock">
              <div>
                <h1 style={{
                  fontFamily: P_ANTON, fontWeight: 400, textTransform: 'uppercase', color: '#FFFFFF',
                  // A · Display. Mobil 48px statt 56, damit die Zeile darunter
                  // noch atmen kann; Desktop bis 92.
                  fontSize: 'clamp(46px,13vw,92px)', lineHeight: .92, letterSpacing: '-.005em', margin: 0,
                }}>Player</h1>
                <p style={{
                  // E · Eyebrow: 600 statt 800, Tracking .14em statt .2em.
                  margin: '14px 0 0', fontSize: 12, fontWeight: 600, letterSpacing: '.14em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,.88)', lineHeight: 1.6,
                }}>Die Ping Pong Liga<br />der Schweiz.</p>
              </div>

              <div className="ent-heroRechts">
                <div style={{
                  display: 'flex', borderTop: `1px solid ${P_DARK_KANTE}`, borderBottom: `1px solid ${P_DARK_KANTE}`,
                }}>
                  {[[spielerCount, 'Spieler'], [gamesCount, 'Open Games'], [tourCount, 'Turniere']].map(([w, t], i) => (
                    <div key={t as string} style={{
                      flex: 1, padding: '13px 0', textAlign: 'center',
                      borderLeft: i === 0 ? 'none' : `1px solid ${P_DARK_KANTE}`,
                    }}>
                      <div style={{ fontFamily: P_ANTON, fontWeight: 400, fontSize: 28, lineHeight: 1 }}>{w}</div>
                      <div style={{
                        marginTop: 6, fontSize: 10, fontWeight: 600, letterSpacing: '.13em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,.60)',
                      }}>{t}</div>
                    </div>
                  ))}
                </div>
                <Link href="/login" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16, minHeight: 52,
                  // Knopf, kein Plakat: Inter 600, Tracking .12em.
                  background: '#FFFFFF', color: P_DARK, fontSize: 12, fontWeight: 600,
                  letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none',
                }}>Login / Registrieren</Link>
                {/* 24.09.2026: /spielen — der Einstieg OHNE Konto — war von
                    keiner Seite aus verlinkt. Wer kein Konto hat, kam nicht
                    mehr hin, obwohl die Seite und /api/spielen/preview
                    durchgehend liefen. */}
                <Link href="/spielen" style={{
                  display: 'block', marginTop: 12, textAlign: 'center', minHeight: 44, lineHeight: '44px',
                  fontSize: 13, color: 'rgba(255,255,255,.72)', textDecoration: 'none',
                }}>Noch kein Konto? Finde in zwei Schritten dein Rating →</Link>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════ DREI EINSTIEGE ══════════
            Was es bei PLAYER gibt — Icon, Anton-Titel, ein Satz, Pfeil.
            Auch auf 375px drei Spalten, getrennt durch feine Linien. */}
        <div className="p-spalte" style={{ paddingTop: 18 }}>
          <div className="p-karte ent-einstiege">
            {[
              { href: '/match', ikon: <IconOpenGames size={50} />, titel: 'Open Games', text: 'Spontan mitspielen.' },
              { href: '/liga', ikon: <IconLiga size={50} />, titel: 'Liga', text: 'Matches & Rating.' },
              { href: '/turniere', ikon: <IconTurniere size={50} />, titel: 'Turniere', text: 'Turniere spielen.' },
            ].map(e => (
              <Link key={e.href} href={e.href} className="ent-einstieg">
                <span className="ei-ik">{e.ikon}</span>
                <h3>{e.titel}</h3>
                <p>{e.text}</p>
                <IconPfeil size={22} />
              </Link>
            ))}
          </div>
        </div>

        {/* ══════════ OPEN GAMES + LIGA ══════════ */}
        <div className="p-spalte">
          <div className="ent-raster ent-r-oben">

            <section className="p-karte">
              <div className="p-kopf">
                <h2><IconOpenGames size={26} /> Open Games</h2>
                <Link href="/match" className="p-mehr">Alle <IconPfeil size={15} /></Link>
              </div>
              {games.length ? games.map(g => {
                const frei = Math.max(0, (g.max_players || 2) - (g.current_players || 1))
                return (
                  <Link key={g.id} href={`/match/${g.id}`} className="p-zeile">
                    <Datum d={g.date} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{g.location_name || 'Open Game'}</b>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: P_LEISE, marginTop: 3 }}>
                        {uhr(g.start_hour)}{g.level ? ` · ${g.level}` : ' · alle'}
                      </span>
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, letterSpacing: '.02em', whiteSpace: 'nowrap',
                      color: frei > 0 ? P_AKZENT : P_LEISE,
                    }}>{frei > 0 ? `${frei} frei` : 'voll'}</span>
                    <span style={{ color: P_LEISE }}><IconChevron size={19} /></span>
                  </Link>
                )
              }) : <p style={leerZeile}>Zurzeit kein offenes Spiel ausgeschrieben.</p>}
            </section>

            {/* Das Liga-Plakat: der eine Bruch in der hellen Seite. Hier darf
                Neon-Gruen einmal kraeftig als Knopf stehen — sonst nirgends.
                Laeuft keine Saison, steht hier der echte Zustand. */}
            <section style={{ position: 'relative', background: P_DARK, color: '#FFFFFF', overflow: 'hidden', minHeight: 210 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/player-hero.jpg" alt="" aria-hidden className="p-foto"
                style={{ objectPosition: "72% 58%" }} />
              <div aria-hidden style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(100deg,rgba(8,11,13,.96) 0%,rgba(8,11,13,.86) 46%,rgba(8,11,13,.42) 100%)',
              }} />
              <div style={{ position: 'relative', zIndex: 2, padding: '26px 22px 28px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, fontWeight: 600,
                  letterSpacing: '.13em', textTransform: 'uppercase',
                  color: saison?.status === 'open' ? P_NEON : 'rgba(255,255,255,.72)',
                }}>
                  <IconLiga size={20} /> Liga{saison ? (saison.status === 'open' ? ' · Anmeldung offen' : ' · läuft') : ''}
                </div>

                {saison ? (
                  <>
                    <div style={{
                      fontFamily: P_ANTON, fontWeight: 400, textTransform: 'uppercase',
                      fontSize: 'clamp(30px,7.6vw,50px)', lineHeight: .96, letterSpacing: '-.004em', margin: '14px 0 9px',
                    }}>{saison.name}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 400, lineHeight: 1.45, color: 'rgba(255,255,255,.72)' }}>
                      {saison.city ? `${saison.city} · ` : ''}Start {datumLang(saison.start_date)}
                      {saison.max_players ? ` · ${saison.max_players} Plätze` : ''}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      fontFamily: P_ANTON, fontWeight: 400, textTransform: 'uppercase',
                      fontSize: 'clamp(30px,7.6vw,50px)', lineHeight: .96, letterSpacing: '-.004em', margin: '14px 0 9px',
                    }}>Ping Pong Liga</div>
                    <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.70)', maxWidth: '40ch' }}>
                      Zurzeit ist keine Saison ausgeschrieben. Die nächste steht hier, sobald sie offen ist.
                    </div>
                  </>
                )}

                <Link href="/liga" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 20, minHeight: 48,
                  padding: '0 24px', background: P_NEON, color: P_DARK, fontSize: 12, fontWeight: 600,
                  letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none',
                }}>Liga ansehen <IconPfeil size={16} /></Link>
              </div>
            </section>
          </div>
        </div>

        {/* ══════════ TURNIERE · SPIELER · RANGLISTE ══════════ */}
        <div className="p-spalte">
          <div className="ent-raster ent-r-drei">

            <section className="p-karte">
              <div className="p-kopf">
                <h2><IconTurniere size={26} /> Turniere</h2>
                <Link href="/turniere" className="p-mehr">Alle <IconPfeil size={15} /></Link>
              </div>
              {touren.length ? touren.map(t => (
                <Link key={t.id} href={`/turniere/${t.id}`} className="p-zeile">
                  <Datum d={t.date} voll />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 15, fontWeight: 600, lineHeight: 1.28 }}>{t.name}</b>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: P_LEISE, marginTop: 3 }}>
                      {t.city || 'Ping Pong Lounge'}{t.start_time ? ` · ${String(t.start_time).slice(0, 5)}` : ''}
                    </span>
                  </span>
                  {/* Kein Preis auf /entdecken — der steht auf der Detailseite,
                      wo man sich tatsaechlich anmeldet. */}
                  <span style={{ color: P_LEISE }}><IconChevron size={19} /></span>
                </Link>
              )) : <p style={leerZeile}>Zurzeit kein Turnier ausgeschrieben.</p>}
            </section>

            <section className="p-karte">
              <div className="p-kopf">
                <h2><IconSpieler size={26} /> Spieler</h2>
                <Link href="/rangliste" className="p-mehr">Alle <IconPfeil size={15} /></Link>
              </div>
              {neueSpieler.length ? (
                <div className="ent-spieler">
                  {neueSpieler.map(sp => (
                    <Link key={sp.id} href={`/spieler/${sp.id}`}>
                      <Initialen name={sp.name} avatar={sp.avatar_url} />
                      {/* Person → Sportwert: der Name tritt zurueck (Inter 500),
                          das Rating fuehrt (Anton). */}
                      <span style={{
                        display: 'block', marginTop: 10, fontSize: 12.5, fontWeight: 500, color: P_LEISE,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{sp.name}</span>
                      <span style={{ display: 'block', marginTop: 3, fontFamily: P_ANTON, fontSize: 21, lineHeight: 1 }}>
                        {sp.elo ?? 1000}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : <p style={leerZeile}>Noch keine Spieler.</p>}
            </section>

            <section className="p-karte">
              <div className="p-kopf">
                <h2><IconRangliste size={26} /> Rangliste</h2>
                <Link href="/rangliste" className="p-mehr">Alle <IconPfeil size={15} /></Link>
              </div>
              {top.length ? top.map((p, i) => (
                <Link key={p.id} href={`/spieler/${p.id}`} className="p-zeile">
                  {/* Nur Rang 1 bekommt den gruenen Akzent. Sonst waere die
                      ganze Spalte gruen und das Zeichen bedeutungslos. */}
                  {/* Drei klar getrennte Ebenen: Position fuehrt (Anton 30),
                      Rating folgt (Anton 23), der Name traegt nur Information
                      (Inter 500). Vorher waren Position und Rating fast gleich
                      gross — dann sagt keines von beiden etwas. */}
                  <span style={{
                    width: 24, fontFamily: P_ANTON, fontWeight: 400, fontSize: 30, lineHeight: 1,
                    color: i === 0 ? P_AKZENT : P_TEXT,
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontFamily: P_ANTON, fontWeight: 400, fontSize: 23, lineHeight: 1 }}>{p.elo ?? 1000}</span>
                  <span style={{ color: P_LEISE }}><IconChevron size={19} /></span>
                </Link>
              )) : <p style={leerZeile}>Noch keine gewerteten Spiele.</p>}
            </section>
          </div>
        </div>

        {/* ══════════ LETZTE MATCHES ══════════
            Sportresultat, keine Social-Karte: wer gegen wen, die Saetze,
            dann klein das Delta und wann. Kein Ort — league_matches
            speichert keinen. */}
        <div className="p-spalte">
          <section className="p-karte" style={{ marginTop: 18 }}>
            <div className="p-kopf">
              <h2><IconMatches size={24} /> Letzte Matches</h2>
              <Link href="/feed" className="p-mehr">Feed <IconPfeil size={15} /></Link>
            </div>
            {feed.length ? (
              <div className="ent-matches">
                {feed.map(m => (
                  <div key={m.id} className="ent-match">
                    <div style={{ fontSize: 14.5, fontWeight: 400, lineHeight: 1.35 }}>
                      <b style={{ fontWeight: 600 }}>{m.sieger}</b>
                      <span style={{ color: P_LEISE }}> gewinnt gegen </span>
                      <span style={{ fontWeight: 400 }}>{m.verlierer}</span>
                    </div>
                    {/* Das Resultat ist die Sportzahl der Zeile — Anton, aber
                        kleiner als eine Rangposition. Es soll auffallen, nicht
                        die ganze Liste beherrschen. */}
                    {m.saetze.length > 0 && (
                      <div style={{ fontFamily: P_ANTON, fontWeight: 400, fontSize: 18, lineHeight: 1.2, marginTop: 7 }}>
                        {m.saetze.join(' · ')}
                      </div>
                    )}
                    {(m.delta != null || m.wann) && (
                      <div style={{ fontSize: 12.5, fontWeight: 400, color: P_LEISE, marginTop: 7 }}>
                        {m.delta != null && (
                          <span style={{ color: m.delta > 0 ? P_AKZENT : P_LEISE, fontWeight: 600 }}>
                            {m.delta > 0 ? '+' : ''}{m.delta}
                          </span>
                        )}
                        {m.delta != null && m.wann ? ' · ' : ''}{m.wann}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <p style={leerZeile}>Noch keine bestätigten Resultate.</p>}
          </section>
        </div>

        {/* ══════════ KONTO ══════════
            Der Abschluss ist ein eigenes kleines Plakat. Kein Erklaerabsatz. */}
        <footer style={{ position: 'relative', background: P_DARK, color: '#FFFFFF', overflow: 'hidden', marginTop: 34 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/player-hero.jpg" alt="" aria-hidden className="p-foto"
            style={{ objectPosition: "50% 78%", opacity: .75 }} />
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg,rgba(8,11,13,.97) 0%,rgba(8,11,13,.86) 52%,rgba(8,11,13,.55) 100%)',
          }} />
          <div className="p-spalte ent-fuss" style={{ position: 'relative', zIndex: 2, paddingTop: 30, paddingBottom: 34 }}>
            <div className="ent-fussLinks">
              <PlayerZeichen gross />
              <div style={{
                fontFamily: P_ANTON, fontWeight: 400, textTransform: 'uppercase',
                fontSize: 'clamp(28px,7.4vw,46px)', lineHeight: .98, letterSpacing: '-.004em', margin: '15px 0 0',
              }}>Jetzt Teil von Player.</div>
            </div>
            <Link href="/login" className="ent-fussKnopf" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52,
              padding: '0 28px', background: '#FFFFFF', color: P_DARK, fontSize: 12, fontWeight: 600,
              letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none',
            }}>Konto erstellen <IconPfeil size={16} /></Link>
            <div className="ent-fussRechts" style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '.13em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,.48)', lineHeight: 1.9, textAlign: 'right',
            }}>
              Same game.<br />Higher people.<br />player.ch
            </div>
          </div>
        </footer>
      </main>
    )
  }

  const { data: profile } = await sb.from('profiles').select('id,name,level,elo,matches_played,matches_won,avatar_url,canton').eq('id', user.id).maybeSingle()
  // Level-Gate: Wer noch keine Einstufung hat, wird zuerst zum Onboarding (Level-Abfrage) geschickt.
  if (!profile || !profile.level) redirect('/onboarding')
  const elo = profile?.elo ?? 1000
  const lvl = profile?.level || '1'
  const firstName = profile?.name?.split(' ')[0] || 'Spieler'
  const initials = initialsFrom(profile?.name)
  const wins = profile?.matches_won ?? 0
  const played = profile?.matches_played ?? 0

  // Alle unabhängigen Abfragen parallel
  const [higherRes, ppRes, gamesRes, tourRes, membershipRes] = await Promise.all([
    sb.from('public_profiles').select('*', { count: 'exact', head: true }).gt('elo', elo).gt('matches_played', 0),
    sb.from('ping_points_transactions').select('amount').eq('player_id', user.id),
    // Nur bevorstehende Spiele — vorher standen Spiele von letzter Woche ganz
    // oben in der Liste, weil das Datum nicht gefiltert wurde.
    sb.from('open_games').select('id,location_name,date,start_hour,level,max_players,current_players,status').eq('status', 'open').not('date', 'is', null).gte('date', new Date().toISOString().slice(0, 10)).order('date', { ascending: true }).order('start_hour', { ascending: true, nullsFirst: false }).limit(12),
    sb.from('player_tournaments').select('id,name,date,format,status').in('status', ['open', 'running']).order('date', { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
    sb.from('league_registrations').select('season_id, league_seasons(id,city,skill_class)').eq('player_id', user.id).limit(1).maybeSingle(),
  ])

  // WAS LAEUFT — echte Aktivitaet, nichts Erfundenes: offene Forderungen an
  // mich und wer zuletzt in meiner Saison dazugekommen ist.
  const meineSaison = (membershipRes.data as { season_id?: string } | null)?.season_id || null
  const [fordRes, neuRes] = await Promise.all([
    sb.from('league_matches').select('id,p1_id,season_id,created_at')
      .eq('p2_id', user.id).eq('status', 'challenge_sent')
      .order('created_at', { ascending: false }).limit(3),
    meineSaison
      ? sb.from('league_registrations').select('player_id,created_at')
          .eq('season_id', meineSaison).neq('player_id', user.id)
          .order('created_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] as Array<{ player_id: string; created_at: string }> }),
  ])
  const aktivIds = [
    ...(fordRes.data || []).map(f => f.p1_id),
    ...((neuRes.data || []) as Array<{ player_id: string }>).map(n => n.player_id),
  ]
  const { data: aktivProfile } = aktivIds.length
    ? await sb.from('public_profiles').select('id,name,avatar_url').in('id', [...new Set(aktivIds)])
    : { data: [] as Array<{ id: string; name: string; avatar_url: string | null }> }
  const profVon = (pid: string) => (aktivProfile || []).find(x => x.id === pid)
  const aktivitaet = [
    ...(fordRes.data || []).map(f => ({
      art: 'forderung' as const, id: f.id, spielerId: f.p1_id,
      name: profVon(f.p1_id)?.name || 'Spieler', avatar: profVon(f.p1_id)?.avatar_url || null,
      text: 'hat dich herausgefordert',
    })),
    ...((neuRes.data || []) as Array<{ player_id: string }>).map(n => ({
      art: 'neu' as const, id: n.player_id, spielerId: n.player_id,
      name: profVon(n.player_id)?.name || 'Spieler', avatar: profVon(n.player_id)?.avatar_url || null,
      text: 'neu in deiner Liga',
    })),
  ].slice(0, 5)

  /* DEINE LETZTEN MATCHES (Referenz HOME) — dieselbe Quelle wie im Profil:
     bestaetigte Liga-Spiele, in denen ich vorkomme. Nichts Erfundenes; gibt
     es keine, faellt der Block weg. */
  const { data: letzteRoh } = await sb.from('league_matches')
    .select('id,p1_id,p2_id,winner_id,sets,played_at,confirmed_at')
    .eq('status', 'confirmed')
    .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    .order('confirmed_at', { ascending: false }).limit(3)
  type MRoh = { id: string; p1_id: string; p2_id: string; winner_id: string | null; sets: Array<{ p1: number; p2: number }> | null; played_at: string | null }
  const mListe = (letzteRoh || []) as MRoh[]
  const gegnerIds = [...new Set(mListe.map(m => (m.p1_id === user.id ? m.p2_id : m.p1_id)))]
  const { data: gegnerProfile } = gegnerIds.length
    ? await sb.from('public_profiles').select('id,name,avatar_url').in('id', gegnerIds)
    : { data: [] as Array<{ id: string; name: string; avatar_url: string | null }> }
  const letzteMatches = mListe.map(m => {
    const ichP1 = m.p1_id === user.id
    const gid = ichP1 ? m.p2_id : m.p1_id
    const g = (gegnerProfile || []).find(x => x.id === gid)
    // Satzstaende aus meiner Sicht: gewonnene Saetze zuerst.
    const meine = (m.sets || []).filter(x => (ichP1 ? x.p1 > x.p2 : x.p2 > x.p1)).length
    const seine = (m.sets || []).filter(x => (ichP1 ? x.p2 > x.p1 : x.p1 > x.p2)).length
    return {
      id: m.id, gegnerId: gid, gegner: g?.name || 'Spieler', avatar: g?.avatar_url || null,
      satz: (m.sets || []).length ? `${meine}:${seine}` : '',
      sieg: m.winner_id === user.id,
    }
  })

  const rank = (higherRes.count ?? 0) + 1
  const ppBalance = (ppRes.data || []).reduce((s, t) => s + Number(t.amount || 0), 0)

  // Dein nächstes Spiel: die früheste bevorstehende Buchung des Users (nur wenn vorhanden).
  const heuteStr = new Date().toISOString().slice(0, 10)
  let nextGame: { href: string; when: string; location: string } | null = null
  const { data: myPlays } = await sb.from('open_game_players').select('game_id').eq('user_id', user.id).neq('status', 'left')
  const myIds = (myPlays || []).map(r => r.game_id)
  if (myIds.length > 0) {
    const { data: ng } = await sb.from('open_games')
      .select('id,location_name,date,start_hour')
      .in('id', myIds).in('status', ['open', 'full', 'p1_entered']).gte('date', heuteStr)
      .order('date', { ascending: true }).order('start_hour', { ascending: true, nullsFirst: false })
      .limit(1).maybeSingle()
    if (ng) {
      const wd = ng.date ? new Date(`${ng.date}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
      const t = ng.start_hour != null ? ` · ${String(ng.start_hour).padStart(2, '0')}:00` : ''
      nextGame = { href: `/match/${ng.id}`, when: `${wd}${t}`, location: ng.location_name || 'Ping Pong Lounge' }
    }
  }

  const games: Game[] = (gamesRes.data || []).map(g => {
    const max = g.max_players || 2
    const cur = g.current_players || 1
    const frei = Math.max(0, max - cur)
    const day = g.date ? new Date(g.date).toLocaleDateString('de-CH', { weekday: 'short' }).replace('.', '') : '—'
    const time = g.start_hour != null ? `${String(g.start_hour).padStart(2, '0')}:00` : '—'
    return { id: g.id, href: `/match/${g.id}`, day, time, title: g.location_name || 'Open Game', sub: g.level || 'Alle Level', frei, full: frei <= 0, ratio: `${cur}/${max}` }
  })

  const tourRaw = tourRes.data
  const tour = tourRaw ? {
    name: tourRaw.name || 'Turnier',
    dateLabel: tourRaw.date ? new Date(tourRaw.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Datum offen',
    formatLabel: tourRaw.format === 'ko' ? 'KO-Bracket' : 'Gruppen + KO',
  } : null

  const next = LV.find(l => l.min > elo)
  const prevMin = [...LV].reverse().find(l => l.min <= elo)?.min ?? 0
  const pct = next ? Math.min(100, Math.max(5, Math.round((elo - prevMin) / (next.min - prevMin) * 100))) : 100
  const nextLabel = next ? `Noch ${next.min - elo} bis ${next.n}` : 'Höchste Liga erreicht 🏆'

  const season = (membershipRes.data as { league_seasons?: { id: string; city: string; skill_class: string } } | null)?.league_seasons
  const seasonId = season?.id || null

  let leagueRank = 0, seasonLabel = ''
  if (seasonId) {
    // "4-7" ist der interne Schlüssel, kein Name für Spieler. In der App heissen
    // die Klassen Einstieg (Level 1–3) und Pro (Level 4–7).
    // Nicht der Klassen-Bereich ("4-7"), sondern die Klasse plus DEIN Level.
    const sc = season?.skill_class || ''
    const klasse = /4|5|6|7/.test(sc) ? 'Pro' : /1|2|3/.test(sc) ? 'Einstieg' : (sc || 'Liga')
    seasonLabel = lvl ? `${klasse} · Level ${lvl}` : klasse
    const { data: regs } = await sb.from('league_registrations').select('player_id').eq('season_id', seasonId)
    const ids = (regs || []).map(r => r.player_id)
    if (ids.length > 0) {
      const { data: profs } = await sb.from('public_profiles').select('id,elo').in('id', ids)
      leagueRank = (profs || []).filter(p => (p.elo ?? 0) > elo).length + 1
    }
  }

  return (
    <StartHomeV2
      firstName={firstName}
      initials={initials}
      avatarUrl={profile?.avatar_url || null}
      canton={profile?.canton || null}
      aktivitaet={aktivitaet}
      lvl={lvl}
      rank={rank}
      elo={elo}
      pct={pct}
      nextLabel={nextLabel}
      ppBalance={ppBalance}
      wins={wins}
      played={played}
      games={games}
      season={{ has: !!season, label: seasonLabel, city: season?.city || '', leagueRank }}
      tour={tour}
      nextGame={nextGame}
      letzteMatches={letzteMatches}
    />
  )
}
