import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartHomeV2, { Game } from '@/app/components/StartHomeV2'

const BG = '#20242C', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.9)', MUT = 'rgba(255,255,255,.72)'
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

const CIRCLES: [string, string, string][] = [
  ['Open Game', '/match', 'open-game-black'],
  ['Liga', '/liga', 'liga-black'],
  ['Turniere', '/turniere', 'turnier-black'],
  ['Tisch buchen', '/buchen', 'tisch-black'],
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
    return (
      <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100, position: 'relative' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 18px 110px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(180deg, rgba(20,23,30,.35) 0%, rgba(20,23,30,.72) 50%, rgba(20,23,30,.97) 100%), url('/hero-poster.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Logo-Block: P mittig über PLAYER, Tagline exakt auf Wortmarken-Breite */}
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}><Logo /></div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.26em', marginTop: 8, textAlign: 'center', ...gt }}>PLAYER</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: MUT, textTransform: 'uppercase', marginTop: 5, textAlign: 'justify', textAlignLast: 'justify' }}>Next Level Table Tennis</div>
            </div>
            <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#06210F', background: GRAD, borderRadius: 999, padding: '3px 9px', marginTop: 10 }}>Beta Version</div>
            <div style={{ marginTop: 26 }}>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', borderRadius: 15, padding: 17, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#06210F', background: GRAD, textDecoration: 'none' }}>Login / Registrieren</Link>
              <Link href="/spielen" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: SUB, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Schon gespielt? Resultat eintragen →</Link>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '26px 0 0' }}>
              {CIRCLES.map(([label, , icon]) => (
                <Link key={label} href="/login" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 64, textDecoration: 'none' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid transparent', background: `linear-gradient(#fff,#fff) padding-box, ${GRAD} border-box`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`/icons/${icon}.svg`} alt="" style={{ width: 32, height: 32 }} />
                  </div>
                  <div style={{ fontSize: 8.5, color: SUB, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
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
  const ppBalance = (ppRes.data || []).reduce((s, t) => s + (t.amount || 0), 0)

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
  const nextLabel = next ? `Noch ${next.min - elo} Punkte bis ${next.n}` : 'Höchste Liga erreicht 🏆'

  const season = (membershipRes.data as { league_seasons?: { id: string; city: string; skill_class: string } } | null)?.league_seasons
  const seasonId = season?.id || null

  let leagueRank = 0, seasonLabel = ''
  if (seasonId) {
    seasonLabel = season?.skill_class || 'Liga'
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
