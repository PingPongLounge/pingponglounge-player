import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  const DARK = "#0A0A0C"
  const CARD = "#15161A"
  const BORDER = "#26282E"
  const TEXT = "#E8E6E1"
  const MUTED = "#6B6E7A"
  const G = "#39FF14"

  const LEVEL_COLOR: Record<string, string> = {
    Locker: "#3FA9FF", Hobby: "#2FD08A", Fortgeschritten: "#FF9F2E", Competitive: G
  }
  const lc = LEVEL_COLOR[profile.level] || G

  async function signOut() {
    "use server"
    const supabase2 = await createClient()
    await supabase2.auth.signOut()
    redirect('/login')
  }

  return (
    <main style={{ minHeight: '100vh', background: DARK }}>
      <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '640px', margin: '0 auto', borderBottom: '1px solid ' + BORDER }}>
        <Link href="/" style={{ fontSize: '13px', color: MUTED, textDecoration: 'none' }}>← Dashboard</Link>
        <span style={{ fontSize: '11px', fontWeight: 700, color: G, letterSpacing: '0.14em', textTransform: 'uppercase' }}>PROFIL</span>
        <form action={signOut}>
          <button type="submit" style={{ background: 'none', border: 'none', fontSize: '12px', color: MUTED, cursor: 'pointer', fontFamily: 'inherit' }}>Abmelden</button>
        </form>
      </header>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px 40px' }}>

        {/* Avatar + Name */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {user.user_metadata?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt={profile.name} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid ' + G, display: 'block', margin: '0 auto 14px' }} />
          )}
          {!user.user_metadata?.avatar_url && (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid ' + G, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: 'rgba(57,255,20,0.06)' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: G }}>{profile.name[0]?.toUpperCase()}</span>
            </div>
          )}
          <h1 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: TEXT, letterSpacing: '-0.01em', marginBottom: '4px' }}>{profile.name}</h1>
          <p style={{ fontSize: '12px', color: MUTED }}>{profile.location} · {user.email}</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'ELO', value: profile.elo, highlight: true },
            { label: 'Level', value: profile.level, color: lc },
            { label: 'Matches', value: profile.matches_played || 0, sub: 'gespielt' },
            { label: 'Win-Rate', value: profile.matches_played ? Math.round((profile.matches_won / profile.matches_played) * 100) + '%' : '—', sub: 'aller Spiele' },
          ].map(s => (
            <div key={s.label} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700 }}>{s.label}</p>
              <p style={{ fontSize: '26px', fontWeight: 900, color: s.color || (s.highlight ? G : TEXT), letterSpacing: '-0.02em' }}>{s.value}</p>
              {s.sub && <p style={{ fontSize: '11px', color: MUTED, marginTop: '2px' }}>{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Matchhistorie Placeholder */}
        <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: '12px', padding: '24px', textAlign: 'center', opacity: 0.5 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 10px' }}>
            <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
          </svg>
          <p style={{ fontSize: '13px', color: MUTED }}>Matchhistorie verfügbar ab Q3 2026</p>
        </div>
      </div>
    </main>
  )
}
