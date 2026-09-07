import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StartHomeV2, { Game } from '@/app/components/StartHomeV2'


const LV = [
  { n: 'Level 1', min: 0 }, { n: 'Level 2', min: 1050 }, { n: 'Level 3', min: 1150 },
  { n: 'Level 4', min: 1250 }, { n: 'Level 5', min: 1350 }, { n: 'Level 6', min: 1450 }, { n: 'Level 7', min: 1600 },
]

function initialsFrom(name?: string | null): string {
  if (!name) return 'PP'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function EntdeckenPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    // Oeffentliche Startseite (07.09.2026, Oliver): PLAYER ist ohne Konto
    // browsbar. Unter dem Kopf steht echter Inhalt aus der Datenbank —
    // Open Games, Rangliste, Liga, Events, Community. Angemeldet werden muss
    // erst, wer etwas TUT; jeder Knopf hier fuehrt auf eine Leseansicht.
    const SCHWARZ = '#0A0A0C', CREME = '#FFF9F3', VIOLETT = '#8C3DFF'
    const FENSTER = '#121214', LEISE = 'rgba(255,249,243,.65)', TRENN = 'rgba(255,249,243,.13)'
    const ANTON = 'var(--font-anton), Impact, sans-serif'
    const INTER = 'var(--font-inter), system-ui, sans-serif'
    const heute = new Date().toISOString().slice(0, 10)
    const admin = createAdminClient()

    // Alles parallel — die Seite soll nicht fuenf Abfragen hintereinander warten.
    const [spielerRes, topRes, gamesRes, seasonRes, tourRes, feedRes] = await Promise.all([
      admin.from('public_profiles').select('id', { count: 'exact', head: true }),
      admin.from('public_profiles').select('id,name,elo,level,matches_played')
        .gt('matches_played', 0).order('elo', { ascending: false }).limit(5),
      admin.from('open_games').select('id,location_name,date,start_hour,max_players,current_players,level')
        .not('kind', 'in', '(training,single_night)').in('status', ['open', 'full', 'p1_entered'])
        .not('date', 'is', null).gte('date', heute)
        .order('date', { ascending: true }).order('start_hour', { ascending: true }).limit(4),
      admin.from('league_seasons').select('id,name,city,status,start_date,max_players')
        .eq('is_global', false).eq('is_private', false).in('status', ['open', 'running'])
        .order('start_date', { ascending: true }).limit(3),
      admin.from('player_tournaments').select('id,name,date,city,start_time,entry_fee_chf,status')
        .eq('published_player', true).neq('visibility', 'private')
        .in('status', ['published', 'registration_open', 'open', 'full', 'waitlist'])
        .gte('date', heute).order('date', { ascending: true }).limit(3),
      admin.from('league_matches')
        .select('id,winner_id,p1_id,p2_id,confirmed_at,p1:profiles!league_matches_p1_id_fkey(name),p2:profiles!league_matches_p2_id_fkey(name)')
        .eq('status', 'confirmed').order('confirmed_at', { ascending: false }).limit(4),
    ])

    const spielerCount = spielerRes.count || 0
    const top = topRes.data || []
    const games = gamesRes.data || []
    const seasons = seasonRes.data || []
    const touren = tourRes.data || []
    // Supabase typisiert die verbundenen Profile als Array — beim Lesen ist
    // es jeweils genau eines. Deshalb ueber unknown normalisieren.
    type FeedZeile = { id: string; winner_id: string | null; p1_id: string; p2_id: string; p1?: { name: string } | { name: string }[] | null; p2?: { name: string } | { name: string }[] | null }
    const einer = (x: { name: string } | { name: string }[] | null | undefined) => Array.isArray(x) ? x[0] : x
    const feed = ((feedRes.data || []) as unknown as FeedZeile[]).map(m => ({
      id: m.id, winner_id: m.winner_id, p1_id: m.p1_id, p2_id: m.p2_id,
      p1: einer(m.p1) || null, p2: einer(m.p2) || null,
    }))

    const tag = (d?: string | null) => d
      ? new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'Datum offen'
    const uhr = (h?: number | null) => h != null ? `${String(h).padStart(2, '0')}:00` : ''

    const NAV = [
      { href: '/match', label: 'Open Games' },
      { href: '/rangliste', label: 'Ranking' },
      { href: '/liga', label: 'Liga' },
      { href: '/turniere', label: 'Events' },
      { href: '/feed', label: 'Community' },
    ]

    const abschnitt: React.CSSProperties = { padding: '30px 22px', borderTop: `1px solid ${TRENN}`, maxWidth: 620, margin: '0 auto' }
    const kopf: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, marginBottom: 16 }
    const etikett: React.CSSProperties = { fontFamily: INTER, fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', color: VIOLETT }
    const mehr: React.CSSProperties = { fontFamily: INTER, fontSize: 13, fontWeight: 700, color: CREME, textDecoration: 'none', whiteSpace: 'nowrap' }
    const zeile: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: `1px solid ${TRENN}`, textDecoration: 'none', color: CREME }
    const leer: React.CSSProperties = { fontFamily: INTER, fontSize: 15, color: LEISE, padding: '13px 0', borderTop: `1px solid ${TRENN}`, margin: 0 }

    return (
      <main style={{ minHeight: '100dvh', background: SCHWARZ, fontFamily: INTER }}>

        {/* Oeffentliche Navigation — sichtbar ohne Konto, Login blockiert nichts. */}
        <nav style={{ borderBottom: `1px solid ${TRENN}`, background: SCHWARZ, position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: 620, margin: '0 auto', padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 18, overflowX: 'auto' }}>
            {NAV.map(n => (
              <Link key={n.href} href={n.href} style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: CREME, textDecoration: 'none', whiteSpace: 'nowrap' }}>{n.label}</Link>
            ))}
            <Link href="/login" style={{ marginLeft: 'auto', fontFamily: INTER, fontSize: 13, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: VIOLETT, textDecoration: 'none', whiteSpace: 'nowrap' }}>Login</Link>
          </div>
        </nav>

        {/* Kopf: Foto traegt die Stimmung, der Verlauf traegt die Schrift. */}
        <header style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 480, padding: '0 22px 40px' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: "url('/hero-pokal.jpg')", backgroundSize: 'cover', backgroundPosition: '52% 42%' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(10,10,12,.58) 0%, rgba(10,10,12,.30) 24%, rgba(10,10,12,.86) 66%, ${SCHWARZ} 100%)` }} />

          <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 620, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <svg width="38" height="38" viewBox="0 0 80 80" fill="none" aria-hidden>
                <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke={CREME} strokeWidth="5" strokeLinejoin="round" />
                <circle cx="63" cy="58" r="7" fill={VIOLETT} />
              </svg>
              <span style={{ fontFamily: ANTON, fontSize: 29, letterSpacing: '.06em', color: CREME, lineHeight: 1 }}>PLAYER</span>
            </div>

            <h1 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 'clamp(46px,12.5vw,74px)', lineHeight: .93, textTransform: 'uppercase', margin: '0 0 18px', color: CREME }}>
              Ping Pong<br />spielen.
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', marginBottom: 28 }}>
              {['Rating', 'Ranking', 'Liga', 'Community'].map((wort, i) => (
                <span key={wort} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  {i > 0 ? <span aria-hidden style={{ width: 5, height: 5, borderRadius: 100, background: VIOLETT }} /> : null}
                  <span style={{ fontFamily: INTER, fontSize: 15, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: CREME }}>{wort}</span>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/match" style={{ flex: '1 1 200px', textAlign: 'center', background: CREME, color: SCHWARZ, borderRadius: 100, padding: '16px 24px', fontFamily: INTER, fontSize: 15, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Umschauen
              </Link>
              <Link href="/login" style={{ flex: '1 1 200px', textAlign: 'center', background: 'transparent', color: CREME, border: `1px solid ${TRENN}`, borderRadius: 100, padding: '15px 24px', fontFamily: INTER, fontSize: 15, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Login / Registrieren
              </Link>
            </div>
            {spielerCount ? <div style={{ marginTop: 14, fontFamily: INTER, fontSize: 15, color: LEISE }}>{spielerCount} Spieler sind dabei.</div> : null}
          </div>
        </header>

        {/* 1 · OPEN GAMES */}
        <section style={abschnitt}>
          <div style={kopf}>
            <div>
              <div style={etikett}>Open Games</div>
              <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 32, textTransform: 'uppercase', margin: '6px 0 0', color: CREME }}>Nächste Spiele</h2>
            </div>
            <Link href="/match" style={mehr}>Alle →</Link>
          </div>
          {games.length ? games.map(g => {
            const frei = Math.max(0, (g.max_players || 2) - (g.current_players || 1))
            return (
              <Link key={g.id} href={`/match/${g.id}`} style={zeile}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{g.location_name || 'Open Game'}</b>
                  <span style={{ display: 'block', fontFamily: INTER, fontSize: 14, color: LEISE, marginTop: 2 }}>{tag(g.date)} {uhr(g.start_hour)} · {g.level || 'Alle Level'}</span>
                </span>
                <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: frei > 0 ? VIOLETT : LEISE, whiteSpace: 'nowrap' }}>{frei > 0 ? `${frei} frei` : 'voll'}</span>
              </Link>
            )
          }) : <p style={leer}>Zurzeit kein offenes Spiel ausgeschrieben.</p>}
        </section>

        {/* 2 · RANKING */}
        <section style={abschnitt}>
          <div style={kopf}>
            <div>
              <div style={etikett}>Ranking</div>
              <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 32, textTransform: 'uppercase', margin: '6px 0 0', color: CREME }}>Top-Spieler</h2>
            </div>
            <Link href="/rangliste" style={mehr}>Rangliste →</Link>
          </div>
          {top.length ? top.map((p, i) => (
            <Link key={p.id} href={`/spieler/${p.id}`} style={zeile}>
              <span style={{ fontFamily: ANTON, fontSize: 22, width: 34, color: i < 3 ? VIOLETT : LEISE }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{p.name}</b>
                <span style={{ display: 'block', fontFamily: INTER, fontSize: 14, color: LEISE, marginTop: 2 }}>Level {p.level} · {p.matches_played} Matches</span>
              </span>
              <span style={{ fontFamily: ANTON, fontSize: 22, color: CREME }}>{p.elo ?? 1000}</span>
            </Link>
          )) : <p style={leer}>Noch keine gewerteten Spiele.</p>}
        </section>

        {/* 3 · LIGA */}
        <section style={abschnitt}>
          <div style={kopf}>
            <div>
              <div style={etikett}>Liga</div>
              <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 32, textTransform: 'uppercase', margin: '6px 0 0', color: CREME }}>Saisons</h2>
            </div>
            <Link href="/liga" style={mehr}>Liga ansehen →</Link>
          </div>
          {seasons.length ? seasons.map(s => (
            <Link key={s.id} href="/liga" style={zeile}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{s.name}</b>
                <span style={{ display: 'block', fontFamily: INTER, fontSize: 14, color: LEISE, marginTop: 2 }}>{s.city} · Start {tag(s.start_date)}</span>
              </span>
              <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: s.status === 'open' ? VIOLETT : LEISE, textTransform: 'uppercase' }}>{s.status === 'open' ? 'offen' : 'läuft'}</span>
            </Link>
          )) : <p style={leer}>Zurzeit läuft keine offene Saison.</p>}
        </section>

        {/* 4 · EVENTS */}
        <section style={abschnitt}>
          <div style={kopf}>
            <div>
              <div style={etikett}>Events</div>
              <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 32, textTransform: 'uppercase', margin: '6px 0 0', color: CREME }}>Nächste Turniere</h2>
            </div>
            <Link href="/turniere" style={mehr}>Alle Events →</Link>
          </div>
          {touren.length ? touren.map(t => (
            <Link key={t.id} href={`/turniere/${t.id}`} style={zeile}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontFamily: INTER, fontSize: 16, fontWeight: 700 }}>{t.name}</b>
                <span style={{ display: 'block', fontFamily: INTER, fontSize: 14, color: LEISE, marginTop: 2 }}>{tag(t.date)}{t.start_time ? ` · ${String(t.start_time).slice(0, 5)}` : ''}{t.city ? ` · ${t.city}` : ''}</span>
              </span>
              {t.entry_fee_chf ? <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: CREME, whiteSpace: 'nowrap' }}>CHF {t.entry_fee_chf}.–</span> : null}
            </Link>
          )) : <p style={leer}>Zurzeit kein Turnier ausgeschrieben.</p>}
        </section>

        {/* 5 · COMMUNITY */}
        <section style={{ ...abschnitt, paddingBottom: 46 }}>
          <div style={kopf}>
            <div>
              <div style={etikett}>Community</div>
              <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 32, textTransform: 'uppercase', margin: '6px 0 0', color: CREME }}>Wer hat gespielt?</h2>
            </div>
            <Link href="/feed" style={mehr}>Feed →</Link>
          </div>
          {feed.length ? feed.map(m => {
            const p1win = m.winner_id === m.p1_id
            return (
              <div key={m.id} style={{ ...zeile, cursor: 'default' }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: INTER, fontSize: 16 }}>
                  <b style={{ fontWeight: 700, color: p1win ? VIOLETT : CREME }}>{m.p1?.name || 'Spieler'}</b>
                  <span style={{ color: LEISE }}> gegen </span>
                  <b style={{ fontWeight: 700, color: !p1win && m.winner_id ? VIOLETT : CREME }}>{m.p2?.name || 'Spieler'}</b>
                </span>
              </div>
            )
          }) : <p style={leer}>Noch keine bestätigten Resultate.</p>}
        </section>

        {/* Schluss: erst hier wird ein Konto verlangt. */}
        <section style={{ background: FENSTER, padding: '38px 22px 46px' }}>
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 'clamp(32px,8vw,46px)', lineHeight: .95, textTransform: 'uppercase', margin: '0 0 12px', color: CREME }}>
              Selber spielen?
            </h2>
            <p style={{ fontFamily: INTER, fontSize: 16, color: LEISE, margin: '0 0 22px', maxWidth: '46ch' }}>
              Umschauen geht ohne Konto. Für Herausfordern, Mitspielen, Resultate eintragen und Saison beitreten brauchst du eins.
            </p>
            <Link href="/login" style={{ display: 'inline-block', background: CREME, color: SCHWARZ, borderRadius: 100, padding: '16px 30px', fontFamily: INTER, fontSize: 15, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Login / Registrieren
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { data: profile } = await sb.from('profiles').select('id,name,level,elo,matches_played,matches_won,avatar_url,canton').eq('id', user.id).maybeSingle()
  // Level-Gate: Wer noch keine Einstufung hat, wird zuerst zum Onboarding (Level-Abfrage) geschickt.
  if (!profile || !profile.level) redirect('/onboarding')
  const elo = profile?.elo ?? 1000
  const lvl = profile?.level || '1'
  const firstName = profile?.name?.split(' ')[0] || 'Spieler'
  const initials = initialsFrom(profile?.name)
  const wins = profile?.matches_won ?? 0
  const played = profile?.matches_played ?? 0

  // Alle unabhängigen Abfragen parallel
  const [higherRes, ppRes, gamesRes, tourRes, membershipRes] = await Promise.all([
    sb.from('public_profiles').select('*', { count: 'exact', head: true }).gt('elo', elo).gt('matches_played', 0),
    sb.from('ping_points_transactions').select('amount').eq('player_id', user.id),
    // Nur bevorstehende Spiele — vorher standen Spiele von letzter Woche ganz
    // oben in der Liste, weil das Datum nicht gefiltert wurde.
    sb.from('open_games').select('id,location_name,date,start_hour,level,max_players,current_players,status').eq('status', 'open').not('date', 'is', null).gte('date', new Date().toISOString().slice(0, 10)).order('date', { ascending: true }).order('start_hour', { ascending: true, nullsFirst: false }).limit(12),
    sb.from('player_tournaments').select('id,name,date,format,status').in('status', ['open', 'running']).order('date', { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
    sb.from('league_registrations').select('season_id, league_seasons(id,city,skill_class)').eq('player_id', user.id).limit(1).maybeSingle(),
  ])

  // WAS LAEUFT — echte Aktivitaet, nichts Erfundenes: offene Forderungen an
  // mich und wer zuletzt in meiner Saison dazugekommen ist.
  const meineSaison = (membershipRes.data as { season_id?: string } | null)?.season_id || null
  const [fordRes, neuRes] = await Promise.all([
    sb.from('league_matches').select('id,p1_id,season_id,created_at')
      .eq('p2_id', user.id).eq('status', 'challenge_sent')
      .order('created_at', { ascending: false }).limit(3),
    meineSaison
      ? sb.from('league_registrations').select('player_id,created_at')
          .eq('season_id', meineSaison).neq('player_id', user.id)
          .order('created_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] as Array<{ player_id: string; created_at: string }> }),
  ])
  const aktivIds = [
    ...(fordRes.data || []).map(f => f.p1_id),
    ...((neuRes.data || []) as Array<{ player_id: string }>).map(n => n.player_id),
  ]
  const { data: aktivProfile } = aktivIds.length
    ? await sb.from('public_profiles').select('id,name,avatar_url').in('id', [...new Set(aktivIds)])
    : { data: [] as Array<{ id: string; name: string; avatar_url: string | null }> }
  const profVon = (pid: string) => (aktivProfile || []).find(x => x.id === pid)
  const aktivitaet = [
    ...(fordRes.data || []).map(f => ({
      art: 'forderung' as const, id: f.id, spielerId: f.p1_id,
      name: profVon(f.p1_id)?.name || 'Spieler', avatar: profVon(f.p1_id)?.avatar_url || null,
      text: 'hat dich herausgefordert',
    })),
    ...((neuRes.data || []) as Array<{ player_id: string }>).map(n => ({
      art: 'neu' as const, id: n.player_id, spielerId: n.player_id,
      name: profVon(n.player_id)?.name || 'Spieler', avatar: profVon(n.player_id)?.avatar_url || null,
      text: 'neu in deiner Liga',
    })),
  ].slice(0, 5)

  const rank = (higherRes.count ?? 0) + 1
  const ppBalance = (ppRes.data || []).reduce((s, t) => s + Number(t.amount || 0), 0)

  // Dein nächstes Spiel: die früheste bevorstehende Buchung des Users (nur wenn vorhanden).
  const heuteStr = new Date().toISOString().slice(0, 10)
  let nextGame: { href: string; when: string; location: string } | null = null
  const { data: myPlays } = await sb.from('open_game_players').select('game_id').eq('user_id', user.id).neq('status', 'left')
  const myIds = (myPlays || []).map(r => r.game_id)
  if (myIds.length > 0) {
    const { data: ng } = await sb.from('open_games')
      .select('id,location_name,date,start_hour')
      .in('id', myIds).in('status', ['open', 'full', 'p1_entered']).gte('date', heuteStr)
      .order('date', { ascending: true }).order('start_hour', { ascending: true, nullsFirst: false })
      .limit(1).maybeSingle()
    if (ng) {
      const wd = ng.date ? new Date(`${ng.date}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
      const t = ng.start_hour != null ? ` · ${String(ng.start_hour).padStart(2, '0')}:00` : ''
      nextGame = { href: `/match/${ng.id}`, when: `${wd}${t}`, location: ng.location_name || 'Ping Pong Lounge' }
    }
  }

  const games: Game[] = (gamesRes.data || []).map(g => {
    const max = g.max_players || 2
    const cur = g.current_players || 1
    const frei = Math.max(0, max - cur)
    const day = g.date ? new Date(g.date).toLocaleDateString('de-CH', { weekday: 'short' }).replace('.', '') : '—'
    const time = g.start_hour != null ? `${String(g.start_hour).padStart(2, '0')}:00` : '—'
    return { id: g.id, href: `/match/${g.id}`, day, time, title: g.location_name || 'Open Game', sub: g.level || 'Alle Level', frei, full: frei <= 0, ratio: `${cur}/${max}` }
  })

  const tourRaw = tourRes.data
  const tour = tourRaw ? {
    name: tourRaw.name || 'Turnier',
    dateLabel: tourRaw.date ? new Date(tourRaw.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Datum offen',
    formatLabel: tourRaw.format === 'ko' ? 'KO-Bracket' : 'Gruppen + KO',
  } : null

  const next = LV.find(l => l.min > elo)
  const prevMin = [...LV].reverse().find(l => l.min <= elo)?.min ?? 0
  const pct = next ? Math.min(100, Math.max(5, Math.round((elo - prevMin) / (next.min - prevMin) * 100))) : 100
  const nextLabel = next ? `Noch ${next.min - elo} bis ${next.n}` : 'Höchste Liga erreicht 🏆'

  const season = (membershipRes.data as { league_seasons?: { id: string; city: string; skill_class: string } } | null)?.league_seasons
  const seasonId = season?.id || null

  let leagueRank = 0, seasonLabel = ''
  if (seasonId) {
    // "4-7" ist der interne Schlüssel, kein Name für Spieler. In der App heissen
    // die Klassen Einstieg (Level 1–3) und Pro (Level 4–7).
    // Nicht der Klassen-Bereich ("4-7"), sondern die Klasse plus DEIN Level.
    const sc = season?.skill_class || ''
    const klasse = /4|5|6|7/.test(sc) ? 'Pro' : /1|2|3/.test(sc) ? 'Einstieg' : (sc || 'Liga')
    seasonLabel = lvl ? `${klasse} · Level ${lvl}` : klasse
    const { data: regs } = await sb.from('league_registrations').select('player_id').eq('season_id', seasonId)
    const ids = (regs || []).map(r => r.player_id)
    if (ids.length > 0) {
      const { data: profs } = await sb.from('public_profiles').select('id,elo').in('id', ids)
      leagueRank = (profs || []).filter(p => (p.elo ?? 0) > elo).length + 1
    }
  }

  return (
    <StartHomeV2
      firstName={firstName}
      initials={initials}
      avatarUrl={profile?.avatar_url || null}
      canton={profile?.canton || null}
      aktivitaet={aktivitaet}
      lvl={lvl}
      rank={rank}
      elo={elo}
      pct={pct}
      nextLabel={nextLabel}
      ppBalance={ppBalance}
      wins={wins}
      played={played}
      games={games}
      season={{ has: !!season, label: seasonLabel, city: season?.city || '', leagueRank }}
      tour={tour}
      nextGame={nextGame}
    />
  )
}
