import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartHomeV2, { Game } from '@/app/components/StartHomeV2'

const BG = '#20242C', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.9)', MUT = 'rgba(255,255,255,.85)'
const GRAD = 'linear-gradient(135deg,#39FF14,#1FD1C4)'
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }

const LV = [
  { n: 'Level 1', min: 0 }, { n: 'Level 2', min: 1050 }, { n: 'Level 3', min: 1150 },
  { n: 'Level 4', min: 1250 }, { n: 'Level 5', min: 1350 }, { n: 'Level 6', min: 1450 }, { n: 'Level 7', min: 1600 },
]

function Logo() {
  return (
    <svg width={56} height={56} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#39FF14" /><stop offset="100%" stopColor="#1FD1C4" /></linearGradient></defs>
      {/* P immer nur Outline; um -2 verschoben, damit das P selbst mittig sitzt (Ball hängt raus) */}
      <g transform="translate(-2,0)">
        <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="63" cy="58" r="6" fill="url(#lg)" />
      </g>
    </svg>
  )
}

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
    // Wie viele spielen schon mit? Der stärkste Grund mitzumachen ist,
    // dass es bereits läuft.
    const { count: spielerCount } = await sb
      .from('public_profiles')
      .select('id', { count: 'exact', head: true })

    // Eine Zeile im Block — dasselbe Muster wie überall: Icon, Text, Linie.
    const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.07)' }
    const RIC: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, background: '#353B46', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

    return (
      <main style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* Ein Bild, ein Satz, ein Knopf. Vorher: Hero + VIER Karten + eine
              Bottom-Nav, die für Ausgeloggte überall in die Login-Wand lief. */}
          <div style={{ position: 'relative', minHeight: 470, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '26px 22px 30px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(180deg, rgba(20,23,30,.2) 0%, rgba(20,23,30,.72) 52%, ${BG} 100%), url('/hero-pokal.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Logo mittig und gross: P über der Wortmarke, Tagline exakt auf
                  Wortmarkenbreite. Das P bleibt Outline, der Ball sitzt rechts unten. */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                <svg width="72" height="72" viewBox="0 0 80 80" fill="none" aria-hidden>
                  <defs><linearGradient id="hlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14" /><stop offset="1" stopColor="#1FD1C4" /></linearGradient></defs>
                  <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#hlg)" strokeWidth="3.6" strokeLinejoin="round" />
                  <circle cx="63" cy="58" r="6.5" fill="url(#hlg)" />
                </svg>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 8 }}>
                  <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '.24em', lineHeight: 1, paddingLeft: '.24em', ...gt }}>PLAYER</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: SUB, textTransform: 'uppercase', marginTop: 7, textAlign: 'justify', textAlignLast: 'justify' }}>Pingpong Next Level</div>
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#06210F', background: GRAD, borderRadius: 999, padding: '3px 8px', marginTop: 12 }}>Beta</span>
              </div>

              <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.025em', margin: '0 0 11px', color: W, textAlign: 'center' }}>
                Spiel. Trag ein.<br /><span style={gt}>Steig auf.</span>
              </h1>
              <p style={{ fontSize: 14.5, color: SUB, fontWeight: 300, lineHeight: 1.55, margin: '0 0 26px', textAlign: 'center' }}>
                Liga, Turniere und Trainings — vom Anfänger bis zum Profi.
                {spielerCount ? ` ${spielerCount} Spieler sind dabei.` : ''}
              </p>

              <Link href="/login" style={{ display: 'block', textAlign: 'center', borderRadius: 15, padding: 17, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', color: '#06210F', background: GRAD, textDecoration: 'none' }}>Login / Registrieren</Link>
              <Link href="/spielen" style={{ display: 'block', textAlign: 'center', marginTop: 14, color: SUB, fontSize: 13.5, fontWeight: 500, textDecoration: 'none' }}>Schon gespielt? Resultat eintragen →</Link>
            </div>
          </div>

          {/* EIN Block statt vier Karten — drei Zeilen sagen, was einen erwartet. */}
          <div style={{ margin: '4px 14px 0', background: '#14171E', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.14)' }}>
            <div style={{ padding: '15px 18px 3px', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: MUT }}>Was dich erwartet</div>

            <div style={{ ...ROW, borderTop: 'none', paddingTop: 12 }}>
              <span style={RIC}><img src="/icons/liga.svg" alt="" style={{ width: 19, height: 19 }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: W }}>Liga</span>
                <span style={{ display: 'block', fontSize: 12, color: MUT, marginTop: 2 }}>Fordere andere, trag dein Resultat ein, steig in der Tabelle.</span>
              </span>
            </div>

            <div style={ROW}>
              <span style={RIC}><img src="/icons/open-game.svg" alt="" style={{ width: 19, height: 19 }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: W }}>Open Game</span>
                <span style={{ display: 'block', fontSize: 12, color: MUT, marginTop: 2 }}>Tisch und Zeit reinstellen — wer Lust hat, spielt mit.</span>
              </span>
            </div>

            <div style={ROW}>
              <span style={RIC}><img src="/icons/turnier.svg" alt="" style={{ width: 19, height: 19 }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: W }}>Turnier &amp; Training</span>
                <span style={{ display: 'block', fontSize: 12, color: MUT, marginTop: 2 }}>K.o.-Bracket, Podest, PingPoints. Dazu Coaching &amp; Drills.</span>
              </span>
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
    />
  )
}
