import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartMenu from '@/app/components/StartMenu'
import LigaChatHome from '@/app/components/LigaChatHome'

const BG = '#0E1014', CARD = '#1A1D24', CELL = '#23272F', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.82)', MUT = 'rgba(255,255,255,.5)'
const LINE = 'rgba(255,255,255,.07)'
const GRAD = 'linear-gradient(135deg,#39FF14,#1FD1C4)'

const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }
const grp: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: MUT, margin: '22px 18px 9px' }
const t3ttl: React.CSSProperties = { fontSize: 18, fontWeight: 800, textTransform: 'uppercase', color: W }
const t3hook: React.CSSProperties = { fontSize: 12, fontWeight: 300, color: MUT, marginTop: 3 }
const t3right: React.CSSProperties = { marginLeft: 'auto', fontSize: 17, fontWeight: 800, color: W }
const tile: React.CSSProperties = { background: CARD, borderRadius: 16, padding: '16px 8px 13px', textAlign: 'center', textDecoration: 'none', color: SUB }
const tileT: React.CSSProperties = { fontSize: 11, fontWeight: 600, marginTop: 7, letterSpacing: '.02em', color: SUB }

function fmtWhen(date: string | null, hour: number | null) {
  let s = ''
  if (date) { const d = new Date(date); s = d.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }) }
  if (hour != null) s += `${s ? ' · ' : ''}${String(hour).padStart(2, '0')}:00`
  return s || 'Zeit offen'
}

function Logo({ small }: { small?: boolean }) {
  const s = small ? 38 : 56
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#39FF14" /><stop offset="100%" stopColor="#1FD1C4" /></linearGradient></defs>
      <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="63" cy="58" r="6" fill="url(#lg)" />
    </svg>
  )
}

const CIRCLES: [string, string, string][] = [
  ['Open Game', '/match', 'open-game-black'],
  ['Liga', '/liga', 'liga-black'],
  ['Turniere', '/turniere', 'turnier-black'],
  ['Tisch buchen', '/buchen', 'tisch-black'],
]

function Circles({ loggedIn }: { loggedIn: boolean }) {
  const href = (r: string) => loggedIn ? r : '/login'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 18px 0' }}>
      {CIRCLES.map(([label, link, icon]) => (
        <Link key={label} href={href(link)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, width: 74, textDecoration: 'none' }}>
          <div style={{ width: 66, height: 66, borderRadius: '50%', border: '2.5px solid transparent', background: `linear-gradient(#fff,#fff) padding-box, ${GRAD} border-box`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`/icons/${icon}.svg`} alt="" style={{ width: 40, height: 40 }} />
          </div>
          <div style={{ fontSize: 10, color: SUB, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1.15 }}>{label}</div>
        </Link>
      ))}
    </div>
  )
}

export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    return (
      <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100, position: 'relative' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 18px 110px' }}>
          {/* Foto-Hintergrund: Leute am Spielen */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(180deg, rgba(14,16,20,.35) 0%, rgba(14,16,20,.72) 50%, rgba(14,16,20,.97) 100%), url('/hero-poster.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <Logo />
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.26em', marginTop: 8, ...gt }}>PLAYER</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.22em', color: MUT, textTransform: 'uppercase', marginTop: 4 }}>Next Level Table Tennis</div>
            <div style={{ marginTop: 26 }}>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', borderRadius: 15, padding: 17, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#08120a', background: GRAD, textDecoration: 'none' }}>Login / Registrieren</Link>
              <Link href="/spielen" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: SUB, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Schon gespielt? Resultat eintragen →</Link>
            </div>
            <Circles loggedIn={false} />
          </div>
        </div>
        <BottomNav />
      </main>
    )
  }

  const { data: profile } = await sb.from('profiles').select('id,name,level,elo,matches_played,matches_won').eq('id', user.id).maybeSingle()
  const elo = profile?.elo ?? 1000
  const lvl = profile?.level || 'Rookie'
  const firstName = profile?.name?.split(' ')[0] || 'Spieler'

  const { count: higher } = await sb.from('public_profiles').select('*', { count: 'exact', head: true }).gt('elo', elo).gt('matches_played', 0)
  const rank = (higher ?? 0) + 1

  const { data: ppTx } = await sb.from('ping_points_transactions').select('amount').eq('player_id', user.id)
  const ppBalance = (ppTx || []).reduce((s, t) => s + (t.amount || 0), 0)

  const wins = profile?.matches_won ?? 0
  const played = profile?.matches_played ?? 0

  const { data: games } = await sb.from('open_games')
    .select('id,location_name,date,start_hour,level,max_players,current_players,status')
    .eq('status', 'open').order('date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(1)
  const game = games?.[0]
  const gameFrei = game ? Math.max(0, (game.max_players || 2) - (game.current_players || 1)) : 0

  const { data: tour } = await sb.from('player_tournaments')
    .select('id,name,city,date,format,max_players,status')
    .in('status', ['open', 'running']).order('date', { ascending: true, nullsFirst: false }).limit(1).maybeSingle()

  const { data: membership } = await sb.from('league_registrations')
    .select('season_id, league_seasons(id,name,city,skill_class,status)').eq('player_id', user.id).limit(1).maybeSingle()
  const season = (membership as { league_seasons?: { id: string; name: string; city: string; skill_class: string; status: string } } | null)?.league_seasons
  const seasonId = season?.id || null

  let leagueRank = 0, leagueTotal = 0, seasonLabel = ''
  if (seasonId) {
    seasonLabel = `${season?.skill_class || 'Liga'} · ${season?.city || ''}`.trim()
    const { data: regs } = await sb.from('league_registrations').select('player_id').eq('season_id', seasonId)
    const ids = (regs || []).map(r => r.player_id)
    leagueTotal = ids.length
    if (ids.length > 0) {
      const { data: profs } = await sb.from('public_profiles').select('id,elo').in('id', ids)
      leagueRank = (profs || []).filter(p => (p.elo ?? 0) > elo).length + 1
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '22px 0 90px', position: 'relative' }}>
        <StartMenu name={firstName} sub={`${lvl} · #${rank}`} />

        {/* Top */}
        <div style={{ padding: '0 18px 4px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.26em', ...gt }}>PLAYER</span>
        </div>

        {/* TIER 1 — Hero */}
        <div style={{ margin: '10px 18px 0', padding: '28px 24px 24px', borderRadius: 24, background: `radial-gradient(120% 90% at 50% 0%, rgba(57,255,20,.10), rgba(0,229,255,.05) 45%, transparent 70%), ${CARD}`, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: MUT }}>Dein Rang</div>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: .82, letterSpacing: '-.04em', margin: '6px 0 2px', ...gt }}>#{rank}</div>
          <div style={{ fontSize: 15, fontWeight: 300, color: SUB }}>{lvl} · ELO {elo}</div>
          <Link href="/match" style={{ display: 'block', marginTop: 20, borderRadius: 15, padding: 17, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#08120a', background: GRAD, textDecoration: 'none' }}>Spielen</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '12px 18px 0' }}>
          {[[ppBalance.toLocaleString('de-CH'), 'PingPoints', true], [String(wins), 'Siege', false], [String(played), 'Spiele', false]].map(([v, l, g], i) => (
            <div key={i} style={{ background: CARD, borderRadius: 16, padding: '14px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, ...(g ? gt : { color: W }) }}>{v}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: MUT, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* TIER 2 — Heute / Open Game */}
        <div style={grp}>Heute</div>
        <Link href={game ? `/match/${game.id}` : '/match/create'} style={{ margin: '0 18px', padding: 22, borderRadius: 20, background: CARD, textDecoration: 'none', color: W, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: MUT }}>Open Game</div>
            <div style={{ fontSize: 30, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, margin: '6px 0' }}>{game ? 'Mitspielen' : 'Erstellen'}</div>
            <div style={{ fontSize: 15, fontWeight: 300, color: SUB }}>
              {game ? <><b style={{ fontWeight: 700 }}>{gameFrei} {gameFrei === 1 ? 'Platz frei' : 'Plätze frei'}</b> · {game.location_name} · {fmtWhen(game.date, game.start_hour)}</> : 'Noch kein offenes Spiel — starte das erste'}
            </div>
          </div>
          <span style={{ fontSize: 26, color: MUT, fontWeight: 300 }}>›</span>
        </Link>

        {/* TIER 3 — Wettkampf */}
        <div style={grp}>Wettkampf</div>
        <div style={{ margin: '0 18px', borderRadius: 20, background: CARD, overflow: 'hidden' }}>
          <Link href="/liga" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 22px', textDecoration: 'none', color: W }}>
            <div><div style={t3ttl}>Liga</div><div style={t3hook}>{season ? seasonLabel : 'Tritt deiner Liga bei'}</div></div>
            <span style={{ ...t3right, ...(season ? gt : {}) }}>{season ? `#${leagueRank}` : '›'}</span>
          </Link>
          <Link href="/turniere" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 22px', textDecoration: 'none', color: W, borderTop: `1px solid ${LINE}` }}>
            <div><div style={t3ttl}>Turnier</div><div style={t3hook}>{tour ? `${tour.name} · ${tour.date ? new Date(tour.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Datum offen'}` : 'Kein Turnier geplant'}</div></div>
            <span style={t3right}>{tour ? '›' : '+'}</span>
          </Link>
          <Link href="/buchen" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 22px', textDecoration: 'none', color: W, borderTop: `1px solid ${LINE}` }}>
            <div><div style={t3ttl}>Tisch buchen</div><div style={t3hook}>6 Standorte · ab CHF 18</div></div>
            <span style={t3right}>›</span>
          </Link>
        </div>

        {/* 4 Kreise */}
        <Circles loggedIn />

        {/* Liga-Chat */}
        {seasonId ? (
          <>
            <div style={grp}>Liga-Chat</div>
            <LigaChatHome seasonId={seasonId} seasonLabel={seasonLabel} playerCount={leagueTotal} isMember={true} meId={user.id} />
          </>
        ) : null}

        {/* TIER 4 — Mehr */}
        <div style={grp}>Mehr</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '0 18px' }}>
          <Link href="/training" style={tile}><img src="/icons/paddles.svg" alt="" style={{ width: 30, height: 30, margin: '0 auto', display: 'block' }} /><div style={tileT}>Training</div></Link>
          <Link href="/freunde" style={tile}><img src="/icons/people.svg" alt="" style={{ width: 30, height: 30, margin: '0 auto', display: 'block' }} /><div style={tileT}>Freunde</div></Link>
          <Link href="/feed" style={tile}><img src="/icons/stats.svg" alt="" style={{ width: 30, height: 30, margin: '0 auto', display: 'block' }} /><div style={tileT}>Aktivität</div></Link>
          <Link href="/achievements" style={tile}><img src="/icons/levelup.svg" alt="" style={{ width: 30, height: 30, margin: '0 auto', display: 'block' }} /><div style={tileT}>Erfolge</div></Link>
          <Link href="/matchhistorie" style={tile}><img src="/icons/stats.svg" alt="" style={{ width: 30, height: 30, margin: '0 auto', display: 'block' }} /><div style={tileT}>Historie</div></Link>
          <Link href="/pingpoints" style={tile}><img src="/icons/settings.svg" alt="" style={{ width: 30, height: 30, margin: '0 auto', display: 'block' }} /><div style={tileT}>Guthaben</div></Link>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
