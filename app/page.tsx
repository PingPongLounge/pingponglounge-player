import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from './components/LogoutButton'
import PlayerLogo from './components/PlayerLogo'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('id,name,level,elo,matches_played').eq('id', user?.id ?? '').single()
  if (!profile) redirect('/onboarding')

  const name = profile?.name?.split(' ')[0] || 'Spieler'
  const elo  = profile?.elo ?? 1000
  const level = profile?.level ?? 'Hobby'
  const G = "#39FF14"; const DARK = "#1A1B1F"; const SURFACE = "#111214"
  const BORDER = "#26282E"; const TEXT = "#E8E6E1"; const MUTED = "#7B7E8A"

  return (
    <main style={{ minHeight: '100vh', background: DARK, padding: '0 0 60px' }}>

      {/* Header */}
      <header style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <PlayerLogo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/profil" style={{ fontSize: '13px', color: MUTED, textDecoration: 'none' }}>{name}</Link>
          <LogoutButton />
        </div>
      </header>

      {/* ELO Hero */}
      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Dein Rating</p>
        <div style={{ fontSize: '80px', fontWeight: 900, color: G, lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.03em' }}>{elo}</div>
        <p style={{ fontSize: '14px', color: MUTED, marginBottom: '48px' }}>{level} · {name}</p>

        {/* Nav Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <Link href="/profil" style={{ textDecoration: 'none' }}>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Profil</p>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: G, background: 'rgba(57,255,20,0.12)', borderRadius: '999px', padding: '2px 7px' }}>LIVE</span>
                </div>
                <p style={{ fontSize: '13px', color: MUTED, marginTop: '2px' }}>ELO, Level, Statistiken</p>
              </div>
              <span style={{ color: G }}>→</span>
            </div>
          </Link>

          {[
            { href: '/liga',     label: 'Liga',         sub: 'Stadtweise Saisons, Live-Tabelle', icon: <><path d="M3 3h18v4H3z"/><path d="M3 10h18v4H3z"/><path d="M3 17h18v4H3z"/></> },
            { href: '/turniere', label: 'Turniere',     sub: 'Community Turniere, ELO',          icon: <><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M9.5 20h5"/><path d="M12 14v4"/></> },
            { href: '/match',    label: 'Find a Match', sub: 'Spontan Mitspieler finden',        icon: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></> },
          ].map(item => (
            <div key={item.href} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{item.label}</p>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: MUTED, background: '#1E2028', borderRadius: '999px', padding: '2px 7px' }}>Q3 2026</span>
                </div>
                <p style={{ fontSize: '13px', color: MUTED, marginTop: '2px' }}>{item.sub}</p>
              </div>
              <span style={{ color: MUTED }}>→</span>
            </div>
          ))}

        </div>

        {/* PPL Link */}
        <p style={{ marginTop: '40px', fontSize: '11px', color: MUTED }}>
          <a href="https://pingponglounge.ch" target="_blank" rel="noopener" style={{ color: G, textDecoration: 'none', fontWeight: 700 }}>↗ Zur Ping Pong Lounge</a>
        </p>
      </section>
    </main>
  )
}
