import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('id,name').eq('id', user?.id ?? '').single()
  if (!profile) redirect('/onboarding')
  const name = profile?.name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Spieler'

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0C', padding: '0 0 40px' }}>
      <header style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#FF00C8', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ping Pong Lounge</p>
        <Link href="/profil" style={{ fontSize: '13px', color: '#6B6E7A', textDecoration: 'none' }}>{name} →</Link>
      </header>
      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 20px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(36px,8vw,60px)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 0.95, marginBottom: '8px', color: '#FFF9F3' }}>Hey {name}</h1>
        <p style={{ fontSize: '15px', color: '#6B6E7A', marginBottom: '48px' }}>Bereit zu spielen?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <Link href="/profil" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#0D0E12', border: '1px solid #26282E', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF00C8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFF9F3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profil</p>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#FF00C8', background: 'rgba(255,0,200,0.12)', borderRadius: '999px', padding: '2px 7px' }}>LIVE</span>
                </div>
                <p style={{ fontSize: '13px', color: '#6B6E7A', marginTop: '2px' }}>ELO, Level, Statistiken</p>
              </div>
              <span style={{ color: '#FF00C8', fontSize: '18px' }}>→</span>
            </div>
          </Link>

          <div style={{ background: '#0D0E12', border: '1px solid #26282E', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF9F3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M9.5 20h5"/><path d="M12 14v4"/></svg>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFF9F3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Liga</p>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B6E7A', background: '#1A1B1F', borderRadius: '999px', padding: '2px 7px' }}>Q3 2026</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6B6E7A', marginTop: '2px' }}>Stadtweise Saisons</p>
            </div>
            <span style={{ color: '#6B6E7A', fontSize: '18px' }}>→</span>
          </div>

          <div style={{ background: '#0D0E12', border: '1px solid #26282E', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF9F3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFF9F3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Turniere</p>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B6E7A', background: '#1A1B1F', borderRadius: '999px', padding: '2px 7px' }}>Q3 2026</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6B6E7A', marginTop: '2px' }}>Anmelden & mitspielen</p>
            </div>
            <span style={{ color: '#6B6E7A', fontSize: '18px' }}>→</span>
          </div>

          <div style={{ background: '#0D0E12', border: '1px solid #26282E', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF9F3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="#FFF9F3" stroke="none"/></svg>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFF9F3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Find a Match</p>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B6E7A', background: '#1A1B1F', borderRadius: '999px', padding: '2px 7px' }}>Q3 2026</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6B6E7A', marginTop: '2px' }}>Spontan mitspielen</p>
            </div>
            <span style={{ color: '#6B6E7A', fontSize: '18px' }}>→</span>
          </div>

        </div>
      </section>
    </main>
  )
}
