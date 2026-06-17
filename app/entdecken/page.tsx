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
    <div style={{ position: 'relative', height: 162, overflow: 'hidden', borderRadius: '0 0 22px 22px' }}>
      <svg width="100%" height="162" viewBox="0 0 400 162" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs><linearGradient id="ppl-hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14" /><stop offset="55%" stopColor="#00D4AA" /><stop offset="100%" stopColor="#1FD1C4" /></linearGradient></defs>
        <rect width="400" height="162" fill="url(#ppl-hero)" />
        <g stroke="#06281c" strokeOpacity="0.18" fill="none" strokeWidth="1.6">
          <polygon points="150,86 250,86 224,40 176,40" /><line x1="200" y1="40" x2="200" y2="86" />
        </g>
      </svg>
      <span style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', fontSize: 12, fontWeight: 900, letterSpacing: '0.16em', color: '#06241a' }}>PLAYER</span>
      <div style={{ position: 'absolute', left: 16, right: 16, top: '50%', transform: 'translateY(-42%)', textAlign: 'center' }}>
        {greetTop && <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0a2c20', marginBottom: 2 }}>{greetTop}</div>}
        <div style={{ fontSize: 26, fontWeight: 900, color: '#06241a', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 0.98, whiteSpace: 'pre-line' }}>{titleBig}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0a2c20', marginTop: 5 }}>{titleSub}</div>
      </div>
    </div>
  )
}

const ico = (d: React.ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>

function Circles({ loggedIn }: { loggedIn: boolean }) {
  const href = (real: string) => (loggedIn ? real : '/login')
  const Item = ({ link, label, external, children }: { link: string; label: string; external?: boolean; children: React.ReactNode }) => {
    const inner = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64 }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: CARD, border: '1px solid #2A3340', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>{label}</span>
      </div>
    )
    if (external && loggedIn) return <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
    return <Link href={external ? '/login' : link} style={{ textDecoration: 'none' }}>{inner}</Link>
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0 6px' }}>
      <Item link={href('/buchen')} label="buchen">{ico(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>)}</Item>
      <Item link={href('/match')} label="open game">{ico(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>)}</Item>
      <Item link={EVERSPORTS_TRAINING} label="training" external>{ico(<path d="M3 3l4 4M3 10l7-7 4 4-7 7zM10 14l7 7 4-4-7-7z" />)}</Item>
      <Item link={href('/liga')} label="liga">{ico(<path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z" />)}</Item>
    </div>
  )
}

function FeatureCard({ href, line }: { href: string; line: string }) {
  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none', borderRadius: 14, overflow: 'hidden', position: 'relative', height: 130, margin: '14px 0 4px' }}>
      <svg width="100%" height="130" viewBox="0 0 460 130" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs><linearGradient id="feat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1d3a2a" /><stop offset="1" stopColor="#0f2c2c" /></linearGradient></defs>
        <rect width="460" height="130" fill="url(#feat)" />
        <g stroke="#39FF14" strokeOpacity="0.42" fill="none" strokeWidth="2"><polygon points="150,104 310,104 340,44 120,44" /><line x1="230" y1="44" x2="230" y2="104" /></g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,22,26,0.05), rgba(20,22,26,0.86))' }} />
      <div style={{ position: 'absolute', left: 15, right: 15, bottom: 13 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>heute spielen</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>{line}</div>
        <span style={{ display: 'inline-block', marginTop: 9, background: '#fff', color: BG, borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700 }}>gegner finden</span>
      </div>
    </Link>
  )
}

const sec: React.CSSProperties = { fontSize: 10, color: LABEL, textTransform: 'lowercase', letterSpacing: '0.06em', margin: '16px 0 8px' }
const line: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }
const pill: React.CSSProperties = { background: '#fff', color: BG, borderRadius: 8, padding: '6px 13px', fontSize: 11, fontWeight: 600 }

export default async function EntdeckenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Ausgeloggt: öffentliche Startseite mit Login ──────────────────────────
  if (!user) {
    return (
      <main style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Hero titleBig={'next level\ntable tennis'} titleSub="rang sammeln · gegner finden · liga spielen" />
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 15, margin: '-16px 15px 8px', position: 'relative', zIndex: 5 }}>
            <Link href="/login" style={{ display: 'block', width: '100%', background: '#fff', color: BG, borderRadius: 10, padding: 13, fontSize: 13.5, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>login / registrieren</Link>
            <Link href="/spielen" style={{ display: 'block', width: '100%', background: 'transparent', border: '1px solid #2A3340', color: TEXT, borderRadius: 10, padding: 11, fontSize: 12.5, fontWeight: 500, textAlign: 'center', textDecoration: 'none', marginTop: 8 }}>schon gespielt? resultat eintragen</Link>
          </div>
          <div style={{ padding: '0 15px' }}>
            <FeatureCard href="/login" line="finde einen gegner in deiner nähe" />
            <Circles loggedIn={false} />
            <div style={sec}>deine liga</div>
            <div style={line}><div><div style={{ fontSize: 13, fontWeight: 600 }}>challenger league</div><div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>spiel dich nach oben</div></div><span style={{ fontSize: 10, color: SUB }}>🔒 login</span></div>
            <div style={sec}>pingpoints</div>
            <div style={line}><div><div style={{ fontSize: 13, fontWeight: 600 }}>punkte sammeln</div><div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>für shop, tisch &amp; mehr</div></div><span style={{ fontSize: 10, color: SUB }}>🔒 login</span></div>
          </div>
        </div>
      </main>
    )
  }

  // ── Eingeloggt ────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles').select('id,name,level,elo,matches_played,matches_won').eq('id', user.id).maybeSingle()
  const hasProfile = !!profile

  const { data: membership } = await supabase
    .from('league_members').select('season_id, seasons(name, leagues(name, city))').eq('player_id', user.id).limit(1).maybeSingle()

  let rang: number | null = null
  if (membership?.season_id) {
    const { data: members } = await supabase
      .from('league_members').select('player_id, elo').eq('season_id', membership.season_id).order('elo', { ascending: false })
    if (members) { const idx = members.findIndex(m => m.player_id === user.id); rang = idx >= 0 ? idx + 1 : null }
  }

  const { data: openMatches } = await supabase
    .from('open_matches').select('id, city').eq('status', 'open').order('created_at', { ascending: false }).limit(20)
  const openCount = openMatches?.length ?? 0

  const { data: ppTx } = await supabase.from('ping_points_transactions').select('amount').eq('player_id', user.id)
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

  const NEXT = [{ n: 'challenger', e: 1100 }, { n: 'advanced', e: 1300 }, { n: 'elite', e: 1500 }].find(t => t.e > elo)
  const rankSub = NEXT ? `elo ${elo} · noch ${NEXT.e - elo} bis ${NEXT.n} ▲` : `elo ${elo} · elite`

  return (
    <main style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <Hero greetTop={greeting} titleBig={name} titleSub={hasProfile ? (profile!.level || 'rookie').toLowerCase() : 'willkommen'} />

        {hasProfile ? (
          <Link href="/profil" style={{ textDecoration: 'none' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, margin: '-18px 15px 0', position: 'relative', zIndex: 5, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: LABEL, letterSpacing: '0.04em' }}>dein rang{ligaCity ? ` · ${ligaCity}` : ''}</div>
              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{rang ? `#${rang}` : elo}</div>
              <div style={{ fontSize: 11.5, color: SUB, marginTop: 5 }}>{rankSub}{played > 0 ? ` · ${winRate}% siege` : ''}</div>
            </div>
          </Link>
        ) : (
          <Link href="/onboarding" style={{ textDecoration: 'none' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, margin: '-18px 15px 0', position: 'relative', zIndex: 5 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>profil einrichten</div>
              <div style={{ fontSize: 11.5, color: SUB, marginTop: 3, marginBottom: 12 }}>name &amp; level festlegen, dann hast du deinen rang</div>
              <span style={{ display: 'block', width: '100%', background: '#fff', color: BG, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>los geht&apos;s</span>
            </div>
          </Link>
        )}

        <div style={{ padding: '0 15px' }}>
          <FeatureCard href="/match" line={openCount > 0 ? `${openCount} ${openCount === 1 ? 'offenes spiel' : 'offene spiele'} · finde einen gegner` : 'erstelle dein open game'} />
          <Circles loggedIn />

          {hasProfile && (
            <>
              <div style={sec}>deine liga</div>
              <Link href="/liga" style={line}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{ligaCity ? `challenger league · ${ligaCity}` : 'liga beitreten'}{rang ? ` · #${rang}` : ''}</div>
                  <div style={{ fontSize: 10.5, color: top16 ? 'rgba(57,255,20,0.85)' : SUB, marginTop: 1 }}>{top16 ? 'top 16 · turnier-quali ✓' : 'top 16 → turnier-quali'}</div>
                </div>
                <span style={{ color: SUB }}>›</span>
              </Link>

              <div style={sec}>pingpoints</div>
              <Link href="/pingpoints" style={line}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{pingpoints} punkte</div><div style={{ fontSize: 10.5, color: SUB, marginTop: 1 }}>für shop, tisch &amp; mehr</div></div>
                <span style={pill}>einlösen</span>
              </Link>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
