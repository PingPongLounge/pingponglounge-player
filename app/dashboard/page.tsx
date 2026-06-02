import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '../components/LogoutButton'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id,name,level,elo,matches_played').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  const name = profile?.name?.split(' ')[0] || 'Spieler'
  const elo = profile?.elo ?? 1000
  const level = profile?.level ?? 'Hobby'

  const G = '#39FF14'
  const DARK = '#0A0A0C'
  const SURFACE = '#111214'
  const BORDER = '#26282E'
  const MUTED = '#6B6E7A'
  const TEXT = '#E8E6E1'

  return (
    <main style={{ minHeight: '100vh', background: DARK, padding: '0 0 40px' }}>
      <header style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <svg viewBox="0 0 360 80" fill="none" style={{ width: '110px', height: 'auto' }}>
          <path d="M 6 68 L 6 12 L 30 12 C 44 12 52 20 52 34 C 52 48 44 56 30 56 L 22 56 L 22 68 Z" fill={G}/>
          <circle cx="62" cy="64" r="7" fill={G}/>
          <text x="76" y="66" fontFamily="'League Spartan', system-ui, sans-serif" fontSize="58" fontWeight="900" letterSpacing="2" fill="none" stroke={G} strokeWidth="2.2" paintOrder="stroke">PLAYER</text>
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/profil" style={{ fontSize: '13px', color: MUTED, textDecoration: 'none' }}>{name} →</Link>
          <LogoutButton />
        </div>
      </header>

      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Dein Rating</p>
        <div style={{ fontSize: '72px', fontWeight: 900, color: G, lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.03em' }}>{elo}</div>
        <p style={{ fontSize: '13px', color: MUTED, marginBottom: '4px' }}>{level}</p>
        <h1 style={{ fontSize: 'clamp(28px,6vw,44px)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, marginBottom: '8px', color: TEXT }}>Hey {name}</h1>
        <p style={{ fontSize: '15px', color: MUTED, marginBottom: '40px' }}>Bereit zu spielen?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/profil" style={{ textDecoration: 'none' }}>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profil</p>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: G, background: 'rgba(57,255,20,0.12)', borderRadius: '999px', padding: '2px 7px' }}>LIVE</span>
                </div>
                <p style={{ fontSize: '13px', color: MUTED, marginTop: '2px' }}>ELO, Level, Statistiken</p>
              </div>
              <span style={{ color: G, fontSize: '18px' }}>→</span>
            </div>
          </Link>
          {/* LIGA — LIVE */}
          <Link href="/liga" style={{ textDecoration: 'none' }}>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Liga</p>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: G, background: 'rgba(57,255,20,0.12)', borderRadius: '999px', padding: '2px 7px' }}>LIVE</span>
                </div>
                <p style={{ fontSize: '13px', color: MUTED, marginTop: '2px' }}>Stadtweise Saisons · Round Robin · ELO</p>
              </div>
              <span style={{ color: G, fontSize: '18px' }}>→</span>
            </div>
          </Link>

          {/* Q3 2026 — Turniere & Find a Match */}
          {[
            { href: '/turniere', label: 'Turniere', sub: 'Community Turniere & Brackets', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M9.5 20h5"/><path d="M12 14v4"/></svg> },
            { href: '/match', label: 'Find a Match', sub: 'Spontan mitspielen', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg> },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
                {item.icon}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '17px', fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: MUTED, background: '#1A1B1F', borderRadius: '999px', padding: '2px 7px' }}>Q3 2026</span>
                  </div>
                  <p style={{ fontSize: '13px', color: MUTED, marginTop: '2px' }}>{item.sub}</p>
                </div>
                <span style={{ color: MUTED, fontSize: '18px' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer style={{ maxWidth: '700px', margin: '48px auto 0', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: MUTED, letterSpacing: '0.1em' }}>PLAYER <span style={{ color: '#3A3C42' }}>·</span> by Ping Pong Lounge</p>
        <a href="https://pingponglounge.ch" target="_blank" rel="noopener" style={{ fontSize: '12px', color: G, textDecoration: 'none', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'inline-block', marginTop: '8px' }}>↗ Zur Ping Pong Lounge</a>
      </footer>
    </main>
  )
}
