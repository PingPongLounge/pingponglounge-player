import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = user.user_metadata?.full_name || 'Unbekannt'
  const avatar = user.user_metadata?.avatar_url
  const email = user.email

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0C', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <a href="/" style={{ color: '#6B6E7A', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</a>
        <div style={{ textAlign: 'center', margin: '40px 0 32px' }}>
          {avatar && <img src={avatar} alt={name} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #FF00C8', marginBottom: '16px' }}/>}
          <h1 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: '#FFF9F3' }}>{name}</h1>
          <p style={{ fontSize: '13px', color: '#6B6E7A', marginTop: '4px' }}>{email}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'ELO', value: '1000', sub: 'Start-Rating' },
            { label: 'Level', value: 'Hobby', sub: 'Selbsteinschätzung' },
            { label: 'Matches', value: '0', sub: 'gespielt' },
            { label: 'Win-Rate', value: '—', sub: 'noch keine Daten' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0D0E12', border: '1px solid #26282E', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#6B6E7A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#FF00C8' }}>{s.value}</p>
              <p style={{ fontSize: '11px', color: '#6B6E7A', marginTop: '2px' }}>{s.sub}</p>
            </div>
          ))}
        </div>
        <div style={{ background: '#0D0E12', border: '1px solid #26282E', borderRadius: '12px', padding: '20px', textAlign: 'center', opacity: 0.6 }}>
          <p style={{ fontSize: '14px', color: '#6B6E7A' }}>Matchhistorie — verfügbar ab Q3 2026</p>
        </div>
      </div>
    </main>
  )
}
