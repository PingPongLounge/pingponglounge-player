import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '@/app/components/BottomNav'
import PlayerLogo from '@/app/components/PlayerLogo'
import LogoutButton from '@/app/components/LogoutButton'

const BG     = '#0C0D10'
const CARD   = '#111318'
const BORDER = '#1E2230'
const TEXT   = '#FFFFFF'
const SUB    = 'rgba(255,255,255,0.35)'
const LABEL  = 'rgba(255,255,255,0.25)'
const GRAD   = 'linear-gradient(135deg, #39FF14 0%, #00D4AA 50%, #1FD1C4 100%)'

export default async function EntdeckenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,name,level,elo,matches_played,matches_won,avatar_url')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  // Aktuelle Liga
  const { data: membership } = await supabase
    .from('league_members')
    .select('season_id, seasons(name, leagues(name, city))')
    .eq('player_id', user.id)
    .limit(1)
    .maybeSingle()

  // Rang in der Liga
  let rang: number | null = null
  if (membership?.season_id) {
    const { data: members } = await supabase
      .from('league_members')
      .select('player_id, elo')
      .eq('season_id', membership.season_id)
      .order('elo', { ascending: false })
    if (members) {
      const idx = members.findIndex(m => m.player_id === user.id)
      rang = idx >= 0 ? idx + 1 : null
    }
  }

  // Offene Matches
  const { data: openMatches } = await supabase
    .from('open_matches')
    .select('id, scheduled_at, location, slots_total, slots_filled, price_per_player')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(2)

  const name    = profile.name?.split(' ')[0] || 'Spieler'
  const elo     = profile.elo ?? 1000
  const played  = profile.matches_played ?? 0
  const won     = profile.matches_won ?? 0
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0

  // @ts-ignore
  const ligaName = membership?.seasons?.leagues?.city ?? null
  const top16    = rang !== null && rang <= 16

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'guten morgen' : hour < 18 ? 'guten tag' : 'guten abend'

  return (
    <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>

      {/* Header */}
      <header style={{
        padding: '20px 20px 0',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', maxWidth: 480, margin: '0 auto',
      }}>
        <div />
        <Link href="/entdecken" style={{ display: 'flex', textDecoration: 'none' }}>
          <PlayerLogo size="sm" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', justifySelf: 'end' }}>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 0' }}>

        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: LABEL, letterSpacing: '.04em', marginBottom: 3 }}>{greeting}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{name} 👋</div>
          </div>
          <Link href="/profil">
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: CARD, border: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, textDecoration: 'none',
              overflow: 'hidden',
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : '🏓'}
            </div>
          </Link>
        </div>

        {/* Photo Banner */}
        <div style={{ borderRadius: 12, overflow: 'hidden', height: 90, position: 'relative', marginBottom: 20 }}>
          <img
            src="/loc-oerlikon.jpg"
            alt="Ping Pong Lounge"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,13,16,0.1) 0%, rgba(12,13,16,0.6) 100%)' }} />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>

          {/* Book */}
          <Link href="/buchen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: CARD, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <span style={{ fontSize: 9, color: SUB }}>book</span>
          </Link>

          {/* Learn */}
          <Link href="/liga" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: CARD, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <span style={{ fontSize: 9, color: SUB }}>learn</span>
          </Link>

          {/* Competition */}
          <Link href="/liga" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: CARD, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
            </div>
            <span style={{ fontSize: 9, color: SUB }}>competition</span>
          </Link>

          {/* Find a Match */}
          <Link href="/match" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: CARD, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
              </svg>
            </div>
            <span style={{ fontSize: 9, color: SUB }}>find a match</span>
          </Link>

        </div>

        {/* ELO Card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: LABEL, marginBottom: 2 }}>dein rating</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.02em', background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {elo}
            </div>
            <div style={{ fontSize: 10, color: SUB, marginTop: 1 }}>{profile.level?.toLowerCase()} · {winRate}% wins</div>
          </div>
          <Link href="/profil" style={{ fontSize: 11, color: SUB, textDecoration: 'none' }}>profil →</Link>
        </div>

        {/* Open Games */}
        {openMatches && openMatches.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: LABEL, letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>
              open games heute
            </div>
            {openMatches.map((m: any) => {
              const time = new Date(m.scheduled_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
              const free = m.slots_total - m.slots_filled
              return (
                <Link key={m.id} href="/match" style={{ textDecoration: 'none' }}>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{time} · {m.location}</div>
                      <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>{free} {free === 1 ? 'platz' : 'plätze'} frei · CHF {m.price_per_player}</div>
                    </div>
                    <button style={{ background: '#fff', color: '#0C0D10', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                      join
                    </button>
                  </div>
                </Link>
              )
            })}
          </>
        )}

        {/* Liga Card */}
        {ligaName && (
          <>
            <div style={{ fontSize: 10, color: LABEL, letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>
              deine liga
            </div>
            <Link href="/liga" style={{ textDecoration: 'none' }}>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{ligaName} · {rang ? `rang #${rang}` : 'aktiv'}</div>
                  {top16
                    ? <div style={{ fontSize: 10, color: 'rgba(57,255,20,0.7)', marginTop: 2 }}>top 16 · turnier-qualifikation ✓</div>
                    : <div style={{ fontSize: 10, color: SUB, marginTop: 2 }}>top 16 → turnier-qualifikation</div>
                  }
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SUB} strokeWidth="1.8"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          </>
        )}

        {/* No liga CTA */}
        {!ligaName && (
          <>
            <div style={{ fontSize: 10, color: LABEL, letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>
              liga
            </div>
            <Link href="/liga" style={{ textDecoration: 'none' }}>
              <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 12, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>liga beitreten</div>
                  <div style={{ fontSize: 10, color: LABEL, marginTop: 2 }}>zürich · basel · st. gallen · luzern · tessin</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          </>
        )}

      </div>

      <BottomNav />
    </main>
  )
}
