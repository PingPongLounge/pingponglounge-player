import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('id,name,level,elo,matches_played').eq('id', user?.id ?? '').single()
  if (!profile) redirect('/onboarding')

  const name = profile?.name?.split(' ')[0] || 'Spieler'
  const elo = profile?.elo ?? 1000
  const level = profile?.level ?? 'Hobby'
  const matchesPlayed = profile?.matches_played ?? 0

  const DARK = "#0A0A0C"
  const CARD = "#15161A"
  const BORDER = "#26282E"
  const TEXT = "#E8E6E1"
  const MUTED = "#6B6E7A"
  const G = "#39FF14"

  return (
    <main style={{ minHeight: '100vh', background: DARK }}>

      {/* Header */}
      <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '640px', margin: '0 auto', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="11" fill="rgba(57,255,20,0.1)" stroke={G} strokeWidth="1.5"/>
            <circle cx="14" cy="14" r="2" fill={G}/>
            <rect x="22" y="20" width="7" height="3" rx="1.5" fill={G} transform="rotate(-40 22 20)"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PLAYER</span>
        </div>
        <Link href="/profil" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: '999px', padding: '6px 12px', fontSize: '12px', color: MUTED }}>
            {name}
          </div>
        </Link>
      </header>

      {/* ELO Hero */}
      <section style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Dein Rating</p>
        <div style={{ fontSize: '72px', fontWeight: 900, color: G, lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.03em' }}>{elo}</div>
        <p style={{ fontSize: '13px', color: MUTED }}>ELO · {level} · {matchesPlayed} Matches</p>
      </section>

      {/* Nav Cards */}
      <section style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        <Link href="/profil" style={{ textDecoration: 'none' }}>
          <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(57,255,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Profil</p>
              <p style={{ fontSize: '12px', color: MUTED }}>ELO-Verlauf, Level, Statistiken</p>
            </div>
            <span style={{ color: G, fontSize: '16px', fontWeight: 700 }}>→</span>
          </div>
        </Link>

        {[
          { href: '/liga', label: 'Liga', sub: 'Stadtweise Saisons · Auf-/Abstieg · Live-Tabelle', icon: '<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M9.5 20h5"/><path d="M12 14v4"/>' },
          { href: '/turniere', label: 'Turniere', sub: 'Community Turniere · Gruppenphase · QR-Resultate', icon: '<rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/>' },
          { href: '/match', label: 'Find a Match', sub: 'Spontan mitspielen · Gegner nach Level finden', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="#6B6E7A" stroke="none"/>' },
        ].map(item => (
          <div key={item.href} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.45 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6E7A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.icon }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <p style={{ fontSize: '14px', fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                <span style={{ fontSize: '9px', fontWeight: 700, color: MUTED, background: '#1A1B1F', borderRadius: '999px', padding: '2px 7px', letterSpacing: '0.08em' }}>Q3 2026</span>
              </div>
              <p style={{ fontSize: '12px', color: MUTED }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid ' + BORDER }}>
        <p style={{ fontSize: '11px', color: MUTED, letterSpacing: '0.1em' }}>PLAYER <span style={{ color: '#3A3C42' }}>·</span> by Ping Pong Lounge</p>
      </footer>
    </main>
  )
}
