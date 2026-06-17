import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'

const BG     = '#14161A'
const CARD   = '#1B1E25'
const BORDER = '#1E2230'
const TEXT   = '#FFFFFF'
const SUB    = 'rgba(255,255,255,0.66)'
const LABEL  = 'rgba(255,255,255,0.6)'
const GRAD   = 'linear-gradient(135deg, #39FF14 0%, #00D4AA 50%, #1FD1C4 100%)'
const EVERSPORTS_TRAINING = 'https://www.eversports.ch/widget/w/5a5zxf'

function Hero({ greetTop, titleBig, titleSub }: { greetTop?: string; titleBig: string; titleSub: string }) {
  return (
    <div style={{ position: 'relative', height: 196, overflow: 'hidden', borderRadius: '0 0 22px 22px' }}>
      <svg width="100%" height="196" viewBox="0 0 400 196" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ppl-hero" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#39FF14" /><stop offset="55%" stopColor="#00D4AA" /><stop offset="100%" stopColor="#1FD1C4" />
          </linearGradient>
        </defs>
        <rect width="400" height="196" fill="url(#ppl-hero)" />
        {/* dezente Tisch/Netz-Grafik nur im oberen Bereich — kreuzt den Titel nicht */}
        <g stroke="#06281c" strokeOpacity="0.22" fill="none" strokeWidth="1.6">
          <polygon points="128,96 272,96 244,44 156,44" />
          <line x1="200" y1="44" x2="200" y2="96" />
          <line x1="150" y1="72" x2="250" y2="72" strokeWidth="2" />
          <line x1="150" y1="72" x2="150" y2="82" />
          <line x1="250" y1="72" x2="250" y2="82" />
        </g>
      </svg>
      <span style={{ position: 'absolute', top: 15, left: 18, fontSize: 12, fontWeight: 900, letterSpacing: '0.16em', color: '#06241a' }}>PLAYER</span>
      <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
        {greetTop && <div style={{ fontSize: 11, fontWeight: 600, color: '#0a2c20', marginBottom: 2 }}>{greetTop}</div>}
        <div style={{ fontSize: 25, fontWeight: 900, color: '#06241a', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 0.98, whiteSpace: 'pre-line' }}>{titleBig}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0a2c20', marginTop: 5 }}>{titleSub}</div>
      </div>
    </div>
  )
}

function QuickActions({ loggedIn }: { loggedIn: boolean }) {
  const href = (real: string) => (loggedIn ? real : '/login')
  const Item = ({ link, label, external, children }: { link: string; label: string; external?: boolean; children: React.ReactNode }) => {
    const inner = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', width: 64 }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: CARD, border: `1px solid #2A3340`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.82)', fontWeight: 600, textAlign: 'center', lineHeight: 1.1 }}>{label}</span>
      </div>
    )
    if (external && loggedIn) return <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
    return <Link href={external ? '/login' : link} style={{ textDecoration: 'none' }}>{inner}</Link>
  }
  const ico = (d: React.ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <Item link={href('/buchen')} label="buchen">{ico(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>)}</Item>
      <Item link={href('/match')} label="open game">{ico(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>)}</Item>
      <Item link={EVERSPORTS_TRAINING} label="training" external>{ico(<><path d="M3 3l4 4M3 10l7-7 4 4-7 7zM10 14l7 7 4-4-7-7z" /></>)}</Item>
      <Item link={href('/liga')} label="liga">{ico(<><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z" /></>)}</Item>
    </div>
  )
}

const sec: React.CSSProperties = { fontSize: 10, color: LABEL, textTransform: 'lowercase', letterSpacing: '0.06em', margin: '14px 0 8px' }
const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }

export default async function EntdeckenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Ausgeloggt: öffentliche Startseite mit Login ──────────────────────────
  if (!user) {
    return (
      <main style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Hero titleBig={'dein tischtennis-\nzuhause'} titleSub="rang sammeln · gegner finden · liga spielen" />
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 15, margin: '-16px 15px 16px', position: 'relative', zIndex: 5 }}>
            <Link href="/login" style={{ display: 'block', width: '100%', background: '#fff', color: BG, borderRadius: 10, padding: 13, fontSize: 13.5, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>login / registrieren</Link>
            <Link href="/spielen" style={{ display: 'block', width: '100%', background: 'transparent', border: '1px solid #2A3340', color: TEXT, borderRadius: 10, padding: 11, fontSize: 12.5, fontWeight: 500, textAlign: 'center', textDecoration: 'none', marginTop: 8 }}>schon gespielt? resultat eintragen</Link>
          </div>
          <div style={{ padding: '0 15px' }}>
            <div style={sec}>so funktioniert player</div>
            {[
              { ic: (<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>), t: 'tisch buchen', d: 'reserviere deinen tisch an unseren standorten' },
              { ic: (<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></>), t: 'open game', d: 'spontan gegen andere spielen — finde mitspieler in deiner nähe' },
              { ic: (<><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z"/></>), t: 'liga & turniere', d: 'spiel um deinen rang, steig auf und gewinn turniere' },
              { ic: (<><path d="M3 3l4 4M3 10l7-7 4 4-7 7zM10 14l7 7 4-4-7-7z"/></>), t: 'training', d: 'jeden donnerstag training in glattbrugg' },
            ].map((f) => (
              <div key={f.t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: CARD, border: '1px solid #2A3340', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{f.ic}</svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{f.t}</div>
                  <div style={{ fontSize: 11.5, color: SUB, marginTop: 1, lineHeight: 1.35 }}>{f.d}</div>
                </div>
              </div>
            ))}

            <div style={sec}>heute · oerlikon</div>
            <div style={card}><div><div style={{ fontSize: 13, fontWeight: 600 }}>spieler suchen gegner</div><div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>jeden tag offene spiele</div></div><span style={{ fontSize: 10, color: SUB }}>🔒 login</span></div>
            <div style={sec}>deine liga</div>
            <div style={card}><div><div style={{ fontSize: 13, fontWeight: 600 }}>challenger league</div><div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>spiel dich nach oben</div></div><span style={{ fontSize: 10, color: SUB }}>🔒 login</span></div>
          </div>
        </div>
      </main>
    )
  }

  // ── Eingeloggt ────────────────────────────────────────────────────────────
  // Kein Zwangs-Onboarding mehr: die Startseite lädt IMMER. Ohne Profil zeigt sie
  // eine "profil einrichten"-Karte statt Rang.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,name,level,elo,matches_played,matches_won,avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  const hasProfile = !!profile

  const { data: membership } = await supabase
    .from('league_members')
    .select('season_id, seasons(name, leagues(name, city))')
    .eq('player_id', user.id)
    .limit(1)
    .maybeSingle()

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

  const { data: openMatches } = await supabase
    .from('open_matches')
    .select('id, scheduled_at, location, slots_total, slots_filled, price_per_player')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(2)

  const { data: ppTx } = await supabase
    .from('ping_points_transactions')
    .select('amount')
    .eq('player_id', user.id)
  const pingpoints = (ppTx || []).reduce((s: number, t: { amount: number }) => s + (t.amount || 0), 0)

  const name    = profile?.name?.split(' ')[0] || user.email?.split('@')[0] || 'Spieler'
  const elo     = profile?.elo ?? 1000
  const played  = profile?.matches_played ?? 0
  const won     = profile?.matches_won ?? 0
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0
  // @ts-expect-error supabase nested typing
  const ligaCity: string | null = membership?.seasons?.leagues?.city ?? null
  const top16   = rang !== null && rang <= 16
  const hour    = new Date().getHours()
  const greeting = hour < 12 ? 'guten morgen' : hour < 18 ? 'guten tag' : 'guten abend'

  return (
    <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <Hero greetTop={greeting} titleBig={name} titleSub={hasProfile ? `${(profile!.level || 'rookie').toLowerCase()} · elo ${elo}` : 'willkommen — richte kurz dein profil ein'} />

        {hasProfile ? (
          /* Rang direkt unter dem Hero */
          <Link href="/profil" style={{ textDecoration: 'none' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, margin: '-18px 15px 14px', position: 'relative', zIndex: 5, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: LABEL, letterSpacing: '0.04em' }}>dein rang{ligaCity ? ` · ${ligaCity}` : ''}</div>
              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{rang ? `#${rang}` : elo}</div>
              <div style={{ fontSize: 11.5, color: SUB, marginTop: 5 }}>{winRate}% siege · {played} spiele</div>
            </div>
          </Link>
        ) : (
          /* Kein Profil → einrichten-Karte (kein Zwangs-Onboarding) */
          <Link href="/onboarding" style={{ textDecoration: 'none' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, margin: '-18px 15px 14px', position: 'relative', zIndex: 5 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>profil einrichten</div>
              <div style={{ fontSize: 11.5, color: SUB, marginTop: 3, marginBottom: 12 }}>name &amp; level festlegen, dann hast du deinen rang</div>
              <span style={{ display: 'block', width: '100%', background: '#fff', color: BG, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>los geht&apos;s</span>
            </div>
          </Link>
        )}

        <div style={{ padding: '0 15px' }}>
          <QuickActions loggedIn />

          {openMatches && openMatches.length > 0 && (
            <>
              <div style={sec}>heute spielen</div>
              {openMatches.map((m: { id: string; scheduled_at: string; location: string; slots_total: number; slots_filled: number; price_per_player: number }) => {
                const time = new Date(m.scheduled_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
                const free = m.slots_total - m.slots_filled
                return (
                  <Link key={m.id} href="/match" style={card}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{time} · {m.location}</div><div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>{free} {free === 1 ? 'platz' : 'plätze'} frei · CHF {m.price_per_player}</div></div>
                    <span style={{ background: '#fff', color: BG, borderRadius: 8, padding: '6px 13px', fontSize: 11, fontWeight: 600 }}>mitspielen</span>
                  </Link>
                )
              })}
            </>
          )}

          {hasProfile && (
            <>
              <div style={sec}>deine liga</div>
              <Link href="/liga" style={card}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{ligaCity ? `challenger league · ${ligaCity}` : 'liga beitreten'}{rang ? ` · #${rang}` : ''}</div>
                  <div style={{ fontSize: 10.5, color: top16 ? 'rgba(57,255,20,0.85)' : SUB, marginTop: 1 }}>{top16 ? 'top 16 · turnier-qualifikation ✓' : 'top 16 → turnier-qualifikation'}</div>
                </div>
                <span style={{ color: SUB }}>›</span>
              </Link>

              <div style={sec}>pingpoints</div>
              <Link href="/pingpoints" style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{pingpoints} punkte</div>
                <span style={{ background: '#fff', color: BG, borderRadius: 8, padding: '6px 13px', fontSize: 11, fontWeight: 600 }}>einlösen</span>
              </Link>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
