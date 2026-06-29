import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartMenu from '@/app/components/StartMenu'

const BG = '#20242C', CARD = '#2A2F39', HERO = '#14171E', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.9)', MUT = 'rgba(255,255,255,.72)'
const LINE = 'rgba(255,255,255,.08)'
const GRAD = 'linear-gradient(135deg,#39FF14,#1FD1C4)'
const SHADOW = '0 2px 10px rgba(0,0,0,.22)'
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }

const LV = [{ n: 'Rookie', min: 0 }, { n: 'Challenger', min: 1100 }, { n: 'Advanced', min: 1300 }, { n: 'Elite', min: 1500 }]

function Logo() {
  return (
    <svg width={56} height={56} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
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

export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    return (
      <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100, position: 'relative' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 18px 110px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(180deg, rgba(20,23,30,.35) 0%, rgba(20,23,30,.72) 50%, rgba(20,23,30,.97) 100%), url('/hero-poster.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <Logo />
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.26em', marginTop: 8, ...gt }}>PLAYER</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.22em', color: MUT, textTransform: 'uppercase', marginTop: 4 }}>Next Level Table Tennis</div>
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
  const elo = profile?.elo ?? 1000
  const lvl = profile?.level || 'Rookie'
  const firstName = profile?.name?.split(' ')[0] || 'Spieler'
  const wins = profile?.matches_won ?? 0
  const played = profile?.matches_played ?? 0

  const { count: higher } = await sb.from('public_profiles').select('*', { count: 'exact', head: true }).gt('elo', elo).gt('matches_played', 0)
  const rank = (higher ?? 0) + 1

  const { data: ppTx } = await sb.from('ping_points_transactions').select('amount').eq('player_id', user.id)
  const ppBalance = (ppTx || []).reduce((s, t) => s + (t.amount || 0), 0)

  const { data: games } = await sb.from('open_games')
    .select('id,location_name,date,start_hour,level,max_players,current_players,status')
    .eq('status', 'open').order('date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(1)
  const game = games?.[0]
  const gameFrei = game ? Math.max(0, (game.max_players || 2) - (game.current_players || 1)) : 0
  const gameWhen = game ? (() => { let s = ''; if (game.date) { s = new Date(game.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }) } if (game.start_hour != null) s += `${s ? ' · ' : ''}${String(game.start_hour).padStart(2, '0')}:00`; return s || 'Zeit offen' })() : ''

  const next = LV.find(l => l.min > elo)
  const prevMin = [...LV].reverse().find(l => l.min <= elo)?.min ?? 0
  const pct = next ? Math.min(100, Math.max(5, Math.round((elo - prevMin) / (next.min - prevMin) * 100))) : 100

  const { data: tour } = await sb.from('player_tournaments')
    .select('id,name,date,format,status').in('status', ['open', 'running'])
    .order('date', { ascending: true, nullsFirst: false }).limit(1).maybeSingle()

  const { data: membership } = await sb.from('league_registrations')
    .select('season_id, league_seasons(id,city,skill_class)').eq('player_id', user.id).limit(1).maybeSingle()
  const season = (membership as { league_seasons?: { id: string; city: string; skill_class: string } } | null)?.league_seasons
  const seasonId = season?.id || null

  let leagueRank = 0, seasonLabel = ''
  if (seasonId) {
    seasonLabel = `${season?.skill_class || 'Liga'} · ${season?.city || ''}`.trim()
    const { data: regs } = await sb.from('league_registrations').select('player_id').eq('season_id', seasonId)
    const ids = (regs || []).map(r => r.player_id)
    if (ids.length > 0) {
      const { data: profs } = await sb.from('public_profiles').select('id,elo').in('id', ids)
      leagueRank = (profs || []).filter(p => (p.elo ?? 0) > elo).length + 1
    }
  }

  const slT: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: MUT }
  const card: React.CSSProperties = { display: 'block', margin: '0 16px 11px', background: CARD, borderRadius: 16, padding: '15px 16px', textDecoration: 'none', boxShadow: SHADOW }
  const cardT: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: W }
  const cardS: React.CSSProperties = { fontSize: 12, color: MUT, marginTop: 3 }

  return (
    <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '18px 0 90px', position: 'relative' }}>

        {/* Kopf: Begrüssung + Menü */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 6px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: W }}>Hi, {firstName} 👋</div>
          <StartMenu inline name={firstName} sub={`${lvl} · #${rank}`} />
        </div>

        {/* Rang-Display */}
        <div style={{ margin: '8px 16px 0', background: HERO, borderRadius: 20, padding: '18px 20px', boxShadow: SHADOW }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: MUT }}>Dein Rang</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 2 }}>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: .9, ...gt }}>#{rank}</div>
            <div style={{ fontSize: 13, color: SUB, fontWeight: 300, paddingBottom: 7 }}>{lvl} · ELO {elo}</div>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.14)', borderRadius: 6, overflow: 'hidden', marginTop: 12 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: GRAD }} />
          </div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 7 }}>{next ? `Noch ${next.min - elo} Punkte bis ${next.n}` : 'Höchste Liga erreicht 🏆'}</div>
          <Link href="/match" style={{ display: 'block', textAlign: 'center', marginTop: 14, background: GRAD, color: '#06210F', borderRadius: 13, padding: 14, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', textDecoration: 'none' }}>Jetzt spielen</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '12px 16px 0' }}>
          {([[ppBalance.toLocaleString('de-CH'), 'PingPoints', true], [String(wins), 'Siege', false], [String(played), 'Spiele', false]] as [string, string, boolean][]).map(([v, l, g], i) => (
            <div key={i} style={{ background: CARD, borderRadius: 14, padding: '13px 6px', textAlign: 'center', boxShadow: SHADOW }}>
              <div style={{ fontSize: 22, fontWeight: 900, ...(g ? gt : { color: W }) }}>{v}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: MUT, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Heute · Open Game */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 20px 10px' }}>
          <span style={slT}>Heute</span><Link href="/match" style={{ fontSize: 12, color: '#39FF14', textDecoration: 'none', fontWeight: 700 }}>alle ›</Link>
        </div>
        <Link href={game ? `/match/${game.id}` : '/match/create'} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={cardT}>{game ? `Open Game · ${game.location_name}` : 'Open Game erstellen'}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: W }}>{game ? `${game.current_players || 1}/${game.max_players || 2}` : '+'}</span>
          </div>
          <div style={cardS}>{game ? `${gameWhen} · ${game.level} · ${gameFrei} ${gameFrei === 1 ? 'Platz frei' : 'Plätze frei'}` : 'Starte das erste Spiel heute'}</div>
        </Link>

        {/* Wettkampf */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 20px 10px' }}>
          <span style={slT}>Wettkampf</span><Link href="/liga" style={{ fontSize: 12, color: '#39FF14', textDecoration: 'none', fontWeight: 700 }}>zur Liga ›</Link>
        </div>
        <Link href="/liga" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={cardT}>Liga{season ? ` · ${season.skill_class}` : ''}</span>
            <span style={{ fontSize: 16, fontWeight: 800, ...(season ? gt : { color: MUT }) }}>{season ? `#${leagueRank}` : '›'}</span>
          </div>
          <div style={cardS}>{season ? `${season.city} · Saison läuft` : 'Tritt deiner Liga bei'}</div>
        </Link>
        <Link href="/turniere" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={cardT}>{tour ? tour.name : 'Turniere'}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: W }}>{tour ? (tour.date ? new Date(tour.date).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' }) : 'offen') : '›'}</span>
          </div>
          <div style={cardS}>{tour ? `Turnier · ${tour.format === 'ko' ? 'KO-Bracket' : 'Gruppen + KO'}` : 'Erstelle dein eigenes Turnier'}</div>
        </Link>

        {/* Tisch buchen — subtil */}
        <Link href="/buchen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, margin: '10px 16px 0', color: MUT, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Tisch buchen · 6 Standorte ›</Link>

        {/* Spotlight */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 20px 10px' }}>
          <span style={slT}>Spotlight</span>
        </div>
        <Link href="/match" style={{ display: 'block', margin: '0 16px', borderRadius: 16, overflow: 'hidden', background: CARD, textDecoration: 'none', boxShadow: SHADOW }}>
          <img src="/spotlight.jpg" alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
          <div style={{ padding: '15px 16px 16px' }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 11.5, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span>📅 Heute 19:00</span><span>📍 Glattbrugg</span>
            </div>
            <div style={{ fontSize: 21, fontWeight: 900, color: W, marginTop: 8, lineHeight: 1.05 }}>Open Game · 1 Platz frei</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <span style={{ display: 'inline-block', borderRadius: 12, padding: '11px 22px', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', color: '#fff', border: '1.5px solid transparent', background: `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` }}>Mitspielen</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: MUT }}>PPL · Open Game</span>
            </div>
          </div>
        </Link>

        {/* Mehr */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 20px 10px' }}>
          <span style={slT}>Mehr</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, margin: '0 16px' }}>
          {([['/training', 'paddles', 'Training'], ['/freunde', 'people', 'Freunde'], ['/achievements', 'levelup', 'Erfolge'], ['/matchhistorie', 'stats', 'Historie']] as [string, string, string][]).map(([href, icon, label]) => (
            <Link key={label} href={href} style={{ background: CARD, borderRadius: 14, padding: '14px 6px 11px', textAlign: 'center', textDecoration: 'none', boxShadow: SHADOW }}>
              <img src={`/icons/${icon}.svg`} alt="" style={{ width: 28, height: 28, margin: '0 auto', display: 'block' }} />
              <div style={{ fontSize: 10.5, fontWeight: 600, color: SUB, marginTop: 7 }}>{label}</div>
            </Link>
          ))}
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
