import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import StartMenu from '@/app/components/StartMenu'

const BG='#15181E', CARD='#1E222A', CELL='#262B33', W='#FFFFFF'
const SUB='rgba(255,255,255,.85)', MUT='rgba(255,255,255,.6)'
const GRAD='linear-gradient(135deg,#39FF14,#00E5FF)'
const SHADOW='0 4px 14px rgba(0,0,0,.35)'
const EVERSPORTS_TRAINING='https://www.eversports.ch/widget/w/5a5zxf'

const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent' }
const secHead: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', margin:'24px 18px 9px' }
const hStyle: React.CSSProperties = { fontSize:20, fontWeight:900, textTransform:'uppercase', letterSpacing:'.04em', color:W }
const aStyle: React.CSSProperties = { fontSize:12, fontWeight:500, color:MUT, textDecoration:'none' }
const wrap: React.CSSProperties = { padding:'0 10px' }
const card: React.CSSProperties = { background:CARD, borderRadius:18, boxShadow:SHADOW, overflow:'hidden' }
const ttl: React.CSSProperties = { fontSize:23, fontWeight:900, letterSpacing:'.02em', color:W, marginTop:3 }
const dateS: React.CSSProperties = { fontSize:11, color:MUT, fontWeight:300 }
const subC: React.CSSProperties = { fontSize:13, color:'rgba(255,255,255,.9)', fontWeight:300, margin:'9px 0 0', lineHeight:1.45 }
const grid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:15 }
const cell: React.CSSProperties = { background:CELL, borderRadius:12, padding:'12px 13px' }
const ck: React.CSSProperties = { fontSize:9.5, color:MUT, fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:2 }
const cv: React.CSSProperties = { fontSize:13, fontWeight:500, color:W }
const arow: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid rgba(255,255,255,.06)', marginTop:15, paddingTop:14 }
const ev: React.CSSProperties = { fontSize:12, color:SUB, fontWeight:300 }
const btnInCard: React.CSSProperties = { display:'inline-block', border:'1.5px solid transparent', borderRadius:11, padding:'9px 18px', fontSize:14, fontWeight:700, color:W, textDecoration:'none', background:`linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` }
const btnOnPage: React.CSSProperties = { display:'block', textAlign:'center', border:'1.5px solid transparent', borderRadius:12, padding:'13px', fontSize:15, fontWeight:700, color:W, textDecoration:'none', background:`linear-gradient(${BG},${BG}) padding-box, ${GRAD} border-box` }
const lrow: React.CSSProperties = { display:'flex', alignItems:'center', gap:12, padding:'16px', borderTop:'1px solid rgba(255,255,255,.06)', textDecoration:'none' }
const lt: React.CSSProperties = { fontSize:16, fontWeight:700, color:W }
const chip: React.CSSProperties = { fontSize:10.5, fontWeight:500, color:SUB, background:CELL, borderRadius:8, padding:'4px 9px' }
const lmeta: React.CSSProperties = { fontSize:15, fontWeight:700, color:W }

function Logo({ small }: { small?: boolean }) {
  const s = small ? 40 : 60
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
      <div style={{ fontSize: small?13:18, fontWeight:700, letterSpacing:'.24em', marginTop: small?6:8, ...gt }}>PLAYER</div>
      <div style={{ fontSize: small?8:10, fontWeight:600, letterSpacing:'.22em', color:MUT, textTransform:'uppercase', marginTop: small?3:6 }}>Next Level Table Tennis</div>
    </div>
  )
}

function Circles({ loggedIn }: { loggedIn: boolean }) {
  const href = (r: string) => loggedIn ? r : '/login'
  const items: [string,string,string][] = [
    ['Open Game','/match','open-game'], ['Liga','/liga','liga'], ['Turniere','/turniere','turnier'], ['Tisch buchen','/buchen','tisch'],
  ]
  return (
    <div style={{ display:'flex', justifyContent:'space-between', margin:'24px 8px 6px' }}>
      {items.map(([label,link,icon]) => (
        <Link key={label} href={href(link)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:9, width:72, textDecoration:'none' }}>
          <div style={{ width:66, height:66, borderRadius:'50%', background:CELL, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:SHADOW }}>
            <img src={`/icons/${icon}.svg`} alt="" style={{ width:36, height:36 }} />
          </div>
          <div style={{ fontSize:10, color:SUB, fontWeight:600, textAlign:'center', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
        </Link>
      ))}
    </div>
  )
}

function AcademyCard() {
  return (
    <>
      <div style={secHead}><span style={hStyle}>Academy</span><a href={EVERSPORTS_TRAINING} target="_blank" rel="noopener noreferrer" style={aStyle}>Alle ansehen ›</a></div>
      <div style={wrap}><div style={{ ...card, padding:18 }}>
        <div style={dateS}>Training · wöchentlich</div>
        <div style={ttl}>LEVEL UP</div>
        <div style={subC}>Dein Tischtennis-Training von Beginner bis Pro.</div>
        <div style={grid}>
          <div style={cell}><div style={ck}>Wann</div><div style={cv}>Do · 19:00–20:30</div></div>
          <div style={cell}><div style={ck}>Wo</div><div style={cv}>Glattbrugg</div></div>
          <div style={cell}><div style={ck}>Levels</div><div style={cv}>Rookie–Advanced</div></div>
          <div style={cell}><div style={ck}>Preis</div><div style={cv}>CHF 35</div></div>
        </div>
        <div style={arow}><div style={ev}>📍 Ping Pong Lounge Glattbrugg</div><a href={EVERSPORTS_TRAINING} target="_blank" rel="noopener noreferrer" style={btnInCard}>Mehr</a></div>
      </div></div>
    </>
  )
}

function fmtWhen(date: string | null, hour: number | null) {
  let s = ''
  if (date) { const d = new Date(date); s = d.toLocaleDateString('de-CH',{ weekday:'short', day:'numeric', month:'short' }) }
  if (hour != null) s += `${s? ' · ':''}${String(hour).padStart(2,'0')}:00`
  return s || 'Zeit offen'
}

export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    return (
      <main style={{ minHeight:'100vh', background:BG, paddingBottom:40 }}>
        <div style={{ maxWidth:480, margin:'0 auto', padding:'22px 10px 40px' }}>
          <Logo />
          <div style={{ padding:'24px 6px 0' }}>
            <Link href="/login" style={{ ...btnOnPage, background:'#fff', color:BG, border:'none' }}>Login / Registrieren</Link>
            <Link href="/spielen" style={{ ...btnOnPage, marginTop:10 }}>Schon gespielt? Resultat eintragen →</Link>
          </div>
          <Circles loggedIn={false} />
          <AcademyCard />
        </div>
      </main>
    )
  }

  const { data: profile } = await sb.from('profiles').select('id,name,level,elo,matches_played,matches_won').eq('id', user.id).maybeSingle()
  const elo = profile?.elo ?? 1000
  const { count: higher } = await sb.from('public_profiles').select('*', { count:'exact', head:true }).gt('elo', elo).gt('matches_played', 0)
  const rank = (higher ?? 0) + 1
  const NEXT = [{ n:'Challenger', e:1100 }, { n:'Advanced', e:1300 }, { n:'Elite', e:1500 }].find(t => t.e > elo)
  const lvl = (profile?.level || 'Rookie')
  const rankSub = NEXT ? `${lvl} · ELO ${elo} · noch ${NEXT.e-elo} bis ${NEXT.n} ▲` : `${lvl} · ELO ${elo}`

  const { data: games } = await sb.from('open_games')
    .select('id,location_name,date,start_hour,level,max_players,current_players,price_per_player,status')
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
      <div style={{ maxWidth:480, margin:'0 auto', padding:'22px 10px 80px', position:'relative' }}>
        <StartMenu name={firstName} sub={`${lvl} · #${rank}`} />
        <Logo small />

        {/* Rang */}
        <div style={{ ...card, textAlign:'center', padding:'22px 16px', margin:'18px 6px 2px' }}>
          <div style={{ fontSize:11, color:MUT, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:600 }}>Dein Rang</div>
          <div style={{ fontSize:54, fontWeight:800, lineHeight:1, marginTop:2, ...gt }}>#{rank}</div>
          <div style={{ fontSize:13, color:SUB, fontWeight:500, marginTop:6 }}>{rankSub}</div>
        </div>

        <Circles loggedIn />
        <AcademyCard />

        {/* OPEN GAME */}
        <div style={secHead}><span style={hStyle}>Open Game</span><Link href="/match" style={aStyle}>Alle ansehen ›</Link></div>
        <div style={wrap}><div style={card}>
          {(games && games.length>0) ? games.map((g, i) => {
            const frei = Math.max(0,(g.max_players||2)-(g.current_players||1))
            return (
              <Link key={g.id} href={`/match/${g.id}`} style={{ ...lrow, borderTop: i===0?'none':lrow.borderTop }}>
                <div style={{ flex:1 }}>
                  <div style={lt}>{g.location_name} · {fmtWhen(g.date, g.start_hour)}</div>
                  <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                    <span style={chip}>{g.level}</span>
                    <span style={chip}>{frei} {frei===1?'Platz frei':'Plätze frei'}</span>
                    <span style={chip}>{g.price_per_player>0?`CHF ${g.price_per_player}`:'Gratis'}</span>
                  </div>
                </div>
                <span style={lmeta}>{g.current_players||1}/{g.max_players||2}</span>
              </Link>
            )
          }) : (
            <Link href="/match/create" style={{ ...lrow, borderTop:'none' }}><div style={{ flex:1 }}><div style={lt}>Noch keine offenen Spiele</div><div style={{ fontSize:12, color:SUB, fontWeight:300, marginTop:3 }}>Erstelle das erste Open Game</div></div><span style={lmeta}>+</span></Link>
          )}
        </div></div>

        {/* LIGA */}
        <div style={secHead}><span style={hStyle}>Liga</span><Link href="/liga" style={aStyle}>Zur Liga ›</Link></div>
        <div style={wrap}>
          {season ? (
            <div style={{ ...card, padding:18 }}>
              <div style={dateS}>Saison läuft</div>
              <div style={ttl}>{(season.skill_class||'Liga').toUpperCase()} · {(season.city||'').toUpperCase()}</div>
              <div style={grid}>
                <div style={cell}><div style={ck}>Klasse</div><div style={cv}>{season.skill_class||'—'}</div></div>
                <div style={cell}><div style={ck}>Stadt</div><div style={cv}>{season.city||'—'}</div></div>
                <div style={cell}><div style={ck}>Status</div><div style={cv}>Läuft</div></div>
                <div style={cell}><div style={ck}>Ziel</div><div style={cv}>Top 16</div></div>
              </div>
              <div style={arow}><div style={ev}>📍 {season.city}</div><Link href="/liga" style={btnInCard}>Zur Liga</Link></div>
            </div>
          ) : (
            <div style={{ ...card, padding:18 }}>
              <div style={ttl}>LIGA BEITRETEN</div>
              <div style={subC}>Spiel in deiner Klasse, steig auf und qualifiziere dich fürs Turnier.</div>
              <div style={{ marginTop:14 }}><Link href="/liga" style={btnInCard}>Liga ansehen</Link></div>
            </div>
          )}
        </div>

        {/* TURNIER */}
        <div style={secHead}><span style={hStyle}>Turnier</span><Link href="/turniere" style={aStyle}>Alle ansehen ›</Link></div>
        <div style={wrap}>
          {tour ? (
            <div style={{ ...card, padding:18 }}>
              <div style={dateS}>Nächstes Turnier · {tour.status==='open'?'Anmeldung offen':'läuft'}</div>
              <div style={ttl}>{(tour.name||'Turnier').toUpperCase()}</div>
              <div style={grid}>
                <div style={cell}><div style={ck}>Datum</div><div style={cv}>{tour.date? new Date(tour.date).toLocaleDateString('de-CH',{ day:'numeric', month:'short' }) : 'offen'}</div></div>
                <div style={cell}><div style={ck}>Format</div><div style={cv}>{tour.format==='ko'?`${tour.max_players}er KO`:'Gruppen + KO'}</div></div>
                <div style={cell}><div style={ck}>Plätze</div><div style={cv}>{tourRegs} / {tour.max_players}</div></div>
                <div style={cell}><div style={ck}>Startgeld</div><div style={cv}>{tour.entry_fee_chf? `CHF ${tour.entry_fee_chf}`:'Gratis'}</div></div>
              </div>
              <div style={arow}><div style={ev}>📍 {tour.city||'Standort offen'}</div><Link href={`/turniere/${tour.id}`} style={btnInCard}>Ansehen</Link></div>
            </div>
          ) : (
            <div style={{ ...card, padding:18 }}>
              <div style={ttl}>EIGENES TURNIER</div>
              <div style={subC}>Noch kein Turnier geplant — erstelle in 30 Sekunden dein eigenes.</div>
              <div style={{ marginTop:14 }}><Link href="/turniere/neu" style={btnInCard}>Turnier erstellen</Link></div>
            </div>
          )}
          <div style={{ marginTop:10 }}><Link href="/turniere/neu" style={btnOnPage}>+ Eigenes Turnier erstellen</Link></div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
