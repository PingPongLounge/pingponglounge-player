import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartHomeV2, { Game } from '@/app/components/StartHomeV2'

const BG = '#12151A', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.9)', MUT = 'rgba(255,255,255,.85)'

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

export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    // Oeffentliche Startseite (06.09.2026): PLAYER → Ping Pong spielen →
    // Rating, Ranking, Liga, Community → Login. Vier Elemente, mehr nicht.
    // Vorher stand hier der alte pinke Auftritt (#FF00C8/#FF5CDC) mit Hero,
    // drei Erklaerzeilen und Verlaufsschrift. Farben hier bewusst als
    // Konstanten im Block, weil app/theme.ts noch die alten Werte fuehrt.
    const SCHWARZ = '#0A0A0C', CREME = '#FFF9F3', VIOLETT = '#8C3DFF'
    const LEISE = 'rgba(255,249,243,.65)'
    const SAEULEN = ['Rating', 'Ranking', 'Liga', 'Community']

    const { count: spielerCount } = await sb
      .from('public_profiles')
      .select('id', { count: 'exact', head: true })

    return (
      <main style={{ minHeight: '100dvh', background: SCHWARZ, display: 'flex', flexDirection: 'column' }}>
        {/* Das Foto traegt die Stimmung, der Verlauf traegt die Schrift —
            kein Text sitzt auf einer hellen Bildstelle. */}
        <div style={{ position: 'relative', flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 540, padding: '0 22px 44px' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: "url('/hero-pokal.jpg')", backgroundSize: 'cover', backgroundPosition: '52% 42%' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(10,10,12,.60) 0%, rgba(10,10,12,.32) 26%, rgba(10,10,12,.86) 66%, ${SCHWARZ} 100%)` }} />

          <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 520, margin: '0 auto' }}>
            {/* Wortmarke: P als Outline, der Ball violett. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
              <svg width="40" height="40" viewBox="0 0 80 80" fill="none" aria-hidden>
                <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke={CREME} strokeWidth="5" strokeLinejoin="round" />
                <circle cx="63" cy="58" r="7" fill={VIOLETT} />
              </svg>
              <span style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 30, letterSpacing: '.06em', color: CREME, lineHeight: 1 }}>PLAYER</span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', fontWeight: 400, fontSize: 'clamp(46px,13vw,76px)', lineHeight: .93, letterSpacing: '.005em', textTransform: 'uppercase', margin: '0 0 20px', color: CREME }}>
              Ping Pong<br />spielen.
            </h1>

            {/* Die vier Saeulen als eine Zeile — keine Karten, keine Erklaerungen. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', marginBottom: 32 }}>
              {SAEULEN.map((wort, i) => (
                <span key={wort} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  {i > 0 ? <span aria-hidden style={{ width: 5, height: 5, borderRadius: 100, background: VIOLETT }} /> : null}
                  <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: CREME }}>{wort}</span>
                </span>
              ))}
            </div>

            <Link href="/login" style={{ display: 'block', textAlign: 'center', background: CREME, color: SCHWARZ, borderRadius: 100, padding: '17px 24px', fontSize: 16, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Login / Registrieren
            </Link>

            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <Link href="/spielen" style={{ fontSize: 16, fontWeight: 600, color: CREME, textDecoration: 'none' }}>
                Schon gespielt? Resultat eintragen
              </Link>
              {spielerCount ? (
                <div style={{ marginTop: 10, fontSize: 16, color: LEISE }}>{spielerCount} Spieler sind dabei.</div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    )
  }

  const { data: profile } = await sb.from('profiles').select('id,name,level,elo,matches_played,matches_won').eq('id', user.id).maybeSingle()
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
    />
  )
}
