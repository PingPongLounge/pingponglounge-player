import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '../components/LogoutButton'
import PlayerLogo from '../components/PlayerLogo'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,name,level,elo,matches_played,matches_won')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  // PingPoints Balance
  const { data: ppData } = await supabase
    .from('ping_points_transactions')
    .select('amount')
    .eq('player_id', user.id)
  const ppBalance = (ppData || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)

  const name    = profile?.name?.split(' ')[0] || 'Spieler'
  const elo     = profile?.elo ?? 1000
  const level   = profile?.level ?? 'Hobby'
  const played  = profile?.matches_played ?? 0
  const won     = profile?.matches_won ?? 0
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0

  const G      = '#39FF14'
  const PP     = '#FFD700'
  const DARK   = '#0A0A0C'
  const SURFACE = '#111214'
  const BORDER = '#26282E'
  const MUTED  = '#6B6E7A'
  const TEXT   = '#E8E6E1'

  const liveCards = [
    {
      href: '/profil', label: 'Profil', sub: `ELO ${elo} · ${winRate}% Win Rate`, color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
    },
    {
      href: '/feed', label: 'Feed', sub: 'Alle Matches · alle Ligen live', color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
    },
    {
      href: '/matchhistorie', label: 'Matchhistorie', sub: `${played} Matches gespielt`, color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
    },
    {
      href: '/liga', label: 'Liga', sub: 'Stadtweise Saisons · Live-Tabelle', color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
    },
    {
      href: '/rangliste', label: 'Rangliste', sub: 'National · Kantonsweise', color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
    },
    {
      href: '/match', label: 'Find a Match', sub: 'Open Matches · Spontan spielen', color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
    },
    {
      href: '/turniere', label: 'Turniere', sub: 'KO-Bracket · Anmelden · ELO', color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M9.5 20h5"/><path d="M12 14v4"/></svg>
    },
    {
      href: '/achievements', label: 'Achievements', sub: 'Badges · Fortschritt', color: G,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
    },
    {
      href: '/pingpoints', label: 'PingPoints', sub: `${ppBalance} PP · Verdienen & Einlösen`, color: PP,
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PP} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: DARK, padding: '0 0 40px' }}>

      <header style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}><PlayerLogo size="sm" /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/profil" style={{ fontSize: '13px', color: MUTED, textDecoration: 'none' }}>{name} →</Link>
          <LogoutButton />
        </div>
      </header>

      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Dein Rating</p>
        <div style={{ fontSize: '72px', fontWeight: 900, color: G, lineHeight: 1, letterSpacing: '-0.03em' }}>{elo}</div>
        <p style={{ fontSize: '13px', color: MUTED, marginTop: '4px', marginBottom: '32px' }}>{level} · {name}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {liveCards.map(card => (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                {card.icon}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</p>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: card.color, background: `${card.color}18`, borderRadius: '999px', padding: '2px 7px' }}>LIVE</span>
                  </div>
                  <p style={{ fontSize: '12px', color: MUTED, marginTop: '2px' }}>{card.sub}</p>
                </div>
                <span style={{ color: card.color, fontSize: '16px', fontWeight: 700 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <a href="https://pingponglounge.ch" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '13px', color: MUTED, textDecoration: 'none' }}>
          ↗ Zur Ping Pong Lounge
        </a>
      </div>

    </main>
  )
}