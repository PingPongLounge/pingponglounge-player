import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartMenu from '@/app/components/StartMenu'

const BG='#0E1013', CARD='#171A1F', BORDER='#232833', W='#FFFFFF'
const SUB='rgba(255,255,255,.85)', GRAD='linear-gradient(135deg,#39FF14,#00E5FF)'
const EVERSPORTS_TRAINING='https://www.eversports.ch/widget/w/5a5zxf'

const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent' }
const secHead: React.CSSProperties = { display:'flex', alignItems:'baseline', justifyContent:'space-between', margin:'26px 0 4px', padding:'0 16px' }
const hStyle: React.CSSProperties = { fontSize:19, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', ...gt }
const aStyle: React.CSSProperties = { fontSize:12, fontWeight:500, textDecoration:'none', ...gt }
const subT: React.CSSProperties = { fontSize:11.5, color:'rgba(255,255,255,.9)', fontWeight:300, margin:'0 16px 11px' }
const wrap: React.CSSProperties = { padding:'0 16px' }
const card: React.CSSProperties = { background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden' }
const dateS: React.CSSProperties = { fontSize:11, color:SUB, fontWeight:300 }
const ttl: React.CSSProperties = { fontSize:23, fontWeight:700, marginTop:3, letterSpacing:'.03em', ...gt }
const grid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginTop:14 }
const cell: React.CSSProperties = { display:'flex', alignItems:'center', gap:9, border:`1px solid ${BORDER}`, borderRadius:11, padding:'10px 11px' }
const ck: React.CSSProperties = { fontSize:9, color:'rgba(255,255,255,.8)', fontWeight:300, textTransform:'uppercase', letterSpacing:'.04em' }
const cv: React.CSSProperties = { fontSize:12, fontWeight:400, color:W }
const arow: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${BORDER}`, marginTop:14, paddingTop:13 }
const ev: React.CSSProperties = { fontSize:12, color:SUB, fontWeight:300 }
const moreS: React.CSSProperties = { background:'#fff', color:BG, borderRadius:9, padding:'8px 18px', fontSize:13, fontWeight:600, textTransform:'lowercase', textDecoration:'none' }
const lrow: React.CSSProperties = { display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid #20242E`, textDecoration:'none' }
const lt: React.CSSProperties = { fontSize:15, fontWeight:500, color:W }
const ld: React.CSSProperties = { fontSize:11, color:SUB, fontWeight:300, marginTop:3 }
const lmeta: React.CSSProperties = { fontSize:13, fontWeight:600, ...gt }
const cellIcon = (d: React.ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>

function Cell({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return <div style={cell}>{icon}<div><div style={ck}>{k}</div><div style={cv}>{v}</div></div></div>
}

function Logo({ small }: { small?: boolean }) {
  const s = small ? 40 : 64
  return (
    <div style={{ textAlign:'center' }}>
      <svg width={s} height={s} viewBox="0 0 80 80" fill="none" style={{ display:'block', margin:'0 auto' }}>
        <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#39FF14"><animate attributeName="stop-color" values="#39FF14;#00E5FF;#39FF14" dur="8s" repeatCount="indefinite"/></stop>
          <stop offset="100%" stopColor="#00E5FF"><animate attributeName="stop-color" values="#00E5FF;#39FF14;#00E5FF" dur="8s" repeatCount="indefinite"/></stop>
        </linearGradient></defs>
        <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round"/>
        <path d="M 36 10 L 36 50" stroke="url(#lg)" strokeWidth="1" strokeOpacity="0.4"/>
        <circle cx="63" cy="58" r="6" fill="url(#lg)"/>
      </svg>
      <div style={{ fontSize: small?13:19, fontWeight:600, letterSpacing:'.26em', marginTop: small?5:8, ...gt }}>PLAYER</div>
      <div style={{ fontSize: small?8:10, fontWeight:300, letterSpacing:'.22em', color:'rgba(255,255,255,.85)', textTransform:'uppercase', marginTop: small?3:6 }}>next level table tennis</div>
    </div>
  )
}

function Circles({ loggedIn }: { loggedIn: boolean }) {
  const href = (r: string) => loggedIn ? r : '/login'
  const items: [string,string,string][] = [
    ['open game','/match','open-game'], ['liga','/liga','liga'], ['turniere','/turniere','turnier'], ['tisch buchen','/buchen','tisch'],
  ]
  return (
    <div style={{ display:'flex', justifyContent:'space-between', margin:'22px 0 6px' }}>
      {items.map(([label,link,icon]) => (
        <Link key={label} href={href(link)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:70, textDecoration:'none' }}>
          <div style={{ width:62, height:62, borderRadius:'50%', background:'linear-gradient(135deg,#39FF14,#1FD1C4)', padding:2 }}>
            <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'#13161B', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={`/icons/${icon}.svg`} alt="" style={{ width:34, height:34 }} />
            </div>
          </div>
          <div style={{ fontSize:9.5, color:'rgba(255,255,255,.95)', fontWeight:500, textAlign:'center', lineHeight:1.25, textTransform:'uppercase', letterSpacing:'.10em' }}>{label}</div>
        </Link>
      ))}
    </div>
  )
}

function AcademyCard() {
  return (
    <>
      <div style={secHead}><span style={hStyle}>academy</span><a href={EVERSPORTS_TRAINING} target="_blank" rel="noopener noreferrer" style={aStyle}>alle ansehen</a></div>
      <div style={subT}>from beginner to pro</div>
      <div style={wrap}><div style={{ ...card, padding:16 }}>
        <div style={dateS}>wöchentliches training</div>
        <div style={ttl}>LEVEL UP</div>
        <div style={{ fontSize:12.5, color:SUB, fontWeight:300, lineHeight:1.45, margin:'10px 0 2px' }}>von beginner bis pro — ping pong lounge glattbrugg. termine &amp; preise live auf eversports.</div>
        <div style={arow}><div style={ev}>📍 ping pong lounge glattbrugg</div><a href={EVERSPORTS_TRAINING} target="_blank" rel="noopener noreferrer" style={moreS}>more</a></div>
      </div></div>
    </>
  )
}

function fmtWhen(date: string | null, hour: number | null) {
  let s = ''
  if (date) { const d = new Date(date); s = d.toLocaleDateString('de-CH',{ weekday:'short', day:'numeric', month:'short' }) }
  if (hour != null) s += `${s? ' · ':''}${String(hour).padStart(2,'0')}:00`
  return s || 'zeit offen'
}

export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  // ---------- AUSGELOGGT ----------
  if (!user) {
    return (
      <main style={{ minHeight:'100vh', background:BG, paddingBottom:40 }}>
        <div style={{ maxWidth:480, margin:'0 auto', padding:'22px 16px 40px' }}>
          <Logo />
          <div style={{ marginTop:24 }}>
            <Link href="/login" style={{ display:'block', textAlign:'center', background:'#fff', color:BG, borderRadius:13, padding:14, fontSize:15, fontWeight:700, textTransform:'lowercase', textDecoration:'none' }}>login / registrieren</Link>
            <Link href="/spielen" style={{ display:'block', textAlign:'center', background:'transparent', border:'1px solid #2A3340', color:W, borderRadius:12, padding:12, fontSize:13, fontWeight:400, textTransform:'lowercase', textDecoration:'none', marginTop:10 }}>schon gespielt? resultat eintragen →</Link>
          </div>
          <Circles loggedIn={false} />
          <AcademyCard />
        </div>
      </main>
    )
  }

  // ---------- DATEN ----------
  const { data: profile } = await sb.from('profiles').select('id,name,level,elo,matches_played,matches_won').eq('id', user.id).maybeSingle()
  const elo = profile?.elo ?? 1000
  const { count: higher } = await sb.from('public_profiles').select('*', { count:'exact', head:true }).gt('elo', elo).gt('matches_played', 0)
  const rank = (higher ?? 0) + 1
  const NEXT = [{ n:'challenger', e:1100 }, { n:'advanced', e:1300 }, { n:'elite', e:1500 }].find(t => t.e > elo)
  const rankSub = NEXT ? `${(profile?.level||'rookie').toLowerCase()} · elo ${elo} · noch ${NEXT.e-elo} bis ${NEXT.n} ▲` : `${(profile?.level||'elite').toLowerCase()} · elo ${elo}`

  const { data: games } = await sb.from('open_games')
    .select('id,location_name,date,start_hour,level,max_players,current_players,status')
    .eq('status','open').order('date',{ ascending:true, nullsFirst:false }).order('created_at',{ ascending:false }).limit(3)

  const { data: tour } = await sb.from('player_tournaments')
    .select('id,name,city,date,format,max_players,status,entry_fee_chf,tournament_registrations(count)')
    .in('status',['open','running']).order('date',{ ascending:true, nullsFirst:false }).limit(1).maybeSingle()
  const tourRegs = (tour?.tournament_registrations as { count:number }[] | undefined)?.[0]?.count ?? 0

  const { data: membership } = await sb.from('league_registrations')
    .select('season_id, league_seasons(name,city,skill_class,status)').eq('player_id', user.id).limit(1).maybeSingle()
  const season = (membership as { league_seasons?: { name:string; city:string; skill_class:string; status:string } } | null)?.league_seasons

  const firstName = profile?.name?.split(' ')[0] || 'Spieler'

  return (
    <main style={{ minHeight:'100vh', background:BG, paddingBottom:100 }}>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'22px 16px 80px', position:'relative' }}>

        <StartMenu name={firstName} sub={`${(profile?.level||'rookie').toLowerCase()} · #${rank}`} />
        <Logo small />

        {/* Rang */}
        <div style={{ ...card, textAlign:'center', padding:'18px 14px', margin:'16px 0 2px' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', letterSpacing:'.1em', textTransform:'uppercase' }}>dein rang</div>
          <div style={{ fontSize:50, fontWeight:800, lineHeight:1, filter:'drop-shadow(0 0 14px rgba(57,255,20,.22))', ...gt }}>#{rank}</div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,.92)', fontWeight:300, marginTop:5 }}>{rankSub}</div>
        </div>

        <Circles loggedIn />

        <AcademyCard />

        {/* OPEN GAME */}
        <div style={secHead}><span style={hStyle}>open game</span><Link href="/match" style={aStyle}>alle ansehen</Link></div>
        <div style={subT}><span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:GRAD, marginRight:6, verticalAlign:'middle' }} />lerne neue leute kennen</div>
        <div style={wrap}><div style={card}>
          {(games && games.length>0) ? games.map((g, i) => (
            <Link key={g.id} href={`/match/${g.id}`} style={{ ...lrow, borderTop: i===0?'none':lrow.borderTop }}>
              <div style={{ flex:1 }}>
                <div style={lt}>{g.location_name} · {fmtWhen(g.date, g.start_hour)}</div>
                <div style={ld}>{g.level} · {Math.max(0,(g.max_players||2)-(g.current_players||1))} {((g.max_players||2)-(g.current_players||1))===1?'platz frei':'plätze frei'}</div>
              </div>
              <span style={lmeta}>{g.current_players||1}/{g.max_players||2}</span>
            </Link>
          )) : (
            <Link href="/match/create" style={{ ...lrow, borderTop:'none' }}><div style={{ flex:1 }}><div style={lt}>noch keine offenen spiele</div><div style={ld}>erstelle das erste open game</div></div><span style={lmeta}>+</span></Link>
          )}
        </div></div>

        {/* LIGA */}
        <div style={secHead}><span style={hStyle}>liga</span><Link href="/liga" style={aStyle}>zur liga</Link></div>
        <div style={subT}>spiel in deiner klasse, steig auf &amp; gewinne punkte</div>
        <div style={wrap}>
          {season ? (
            <div style={{ ...card, padding:16 }}>
              <div style={dateS}>saison läuft</div>
              <div style={ttl}>{(season.skill_class||'liga').toUpperCase()} · {(season.city||'').toUpperCase()}</div>
              <div style={grid}>
                <Cell icon={cellIcon(<path d="M5 20V10M12 20V4M19 20v-7"/>)} k="klasse" v={season.skill_class||'—'} />
                <Cell icon={cellIcon(<><path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z"/><circle cx="12" cy="11" r="2"/></>)} k="stadt" v={season.city||'—'} />
                <Cell icon={cellIcon(<><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/></>)} k="status" v="läuft" />
                <Cell icon={cellIcon(<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>)} k="ziel" v="top 16" />
              </div>
              <div style={arow}><div style={ev}>📍 {season.city}</div><Link href="/liga" style={moreS}>zur liga</Link></div>
            </div>
          ) : (
            <div style={{ ...card, padding:16 }}>
              <div style={ttl}>LIGA BEITRETEN</div>
              <div style={{ fontSize:12, color:SUB, fontWeight:300, margin:'8px 0 13px' }}>spiel in deiner klasse, steig auf und qualifiziere dich fürs turnier.</div>
              <Link href="/liga" style={{ ...moreS, display:'inline-block' }}>liga ansehen</Link>
            </div>
          )}
        </div>

        {/* TURNIER */}
        <div style={secHead}><span style={hStyle}>turnier</span><Link href="/turniere" style={aStyle}>alle ansehen</Link></div>
        <div style={subT}>erstelle ein eigenes oder sieh das nächste</div>
        <div style={wrap}>
          {tour ? (
            <div style={{ ...card, padding:16 }}>
              <div style={dateS}>nächstes turnier · {tour.status==='open'?'anmeldung offen':'läuft'}</div>
              <div style={ttl}>{(tour.name||'turnier').toUpperCase()}</div>
              <div style={grid}>
                <Cell icon={cellIcon(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>)} k="datum" v={tour.date? new Date(tour.date).toLocaleDateString('de-CH',{ day:'numeric', month:'short' }) : 'offen'} />
                <Cell icon={cellIcon(<path d="M3 6h5v5h4M3 16h5v-5M12 11h5"/>)} k="format" v={tour.format==='ko'?`${tour.max_players}er ko`:'gruppen+ko'} />
                <Cell icon={cellIcon(<><circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/></>)} k="plätze" v={`${tourRegs} / ${tour.max_players}`} />
                <Cell icon={cellIcon(<><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 2.5-2.5 2-2.5 4M12 17.5h.01"/></>)} k="startgeld" v={tour.entry_fee_chf? `chf ${tour.entry_fee_chf}`:'gratis'} />
              </div>
              <div style={arow}><div style={ev}>📍 {tour.city||'standort offen'}</div><Link href={`/turniere/${tour.id}`} style={moreS}>ansehen</Link></div>
            </div>
          ) : (
            <div style={{ ...card, padding:16 }}>
              <div style={ttl}>EIGENES TURNIER</div>
              <div style={{ fontSize:12, color:SUB, fontWeight:300, margin:'8px 0 13px' }}>noch kein turnier geplant — erstelle in 30 sekunden dein eigenes.</div>
              <Link href="/turniere/neu" style={{ ...moreS, display:'inline-block' }}>turnier erstellen</Link>
            </div>
          )}
          <Link href="/turniere/neu" style={{ display:'block', textAlign:'center', background:'transparent', border:'1px solid #2A3340', color:W, borderRadius:12, padding:12, fontSize:13, fontWeight:400, textTransform:'lowercase', textDecoration:'none', marginTop:10 }}>+ eigenes turnier erstellen</Link>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
