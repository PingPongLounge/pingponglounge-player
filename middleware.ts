import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/auth', '/spielen', '/entdecken']

// Routen, die bewusst OHNE Login funktionieren müssen:
// - confirm-email: der Ein-Klick-Link aus der Bestätigungs-Mail (signiert, prüft sich selbst)
// - webhook: Stripe ruft ihn auf, hat keine Session (prüft die Stripe-Signatur)
// - spielen/preview: der Rang-Vorschau-Screen für NICHT eingeloggte Besucher
//   (QR am Tisch). Die Middleware hat ihn bisher auf /login umgeleitet — deshalb
//   stand dort immer "Dein Rang wird nach dem Sichern berechnet", nie ein Rang.
// - cron/daily + liga/inactivity: Vercel ruft sie ohne Session auf. Die Middleware
//   hat sie mit 401 abgewiesen, BEVOR der CRON_SECRET-Check greifen konnte —
//   die Monatsabrechnung, die Warn-Mail und der Inaktivitäts-Abzug liefen deshalb
//   nie. Die Routen schützen sich selbst über CRON_SECRET.
// - turniere/[id]/register-guest + checkout: die PPL-Webseite ruft diese Routen
//   SERVERSEITIG von einer anderen Domain auf — ohne Cookies, also ohne Session.
//   Die Middleware hat sie mit 401 abgewiesen, BEVOR die Route lief: die
//   Gastanmeldung fuer Turniere auf pingponglounge.ch funktionierte dadurch gar
//   nicht, obwohl beide Routen bewusst auth-frei gebaut sind (18.08.).
const PUBLIC_API = [
  '/api/liga/confirm-email',
  '/api/booking/webhook',
  '/api/spielen/preview',
  '/api/cron/daily',
  '/api/liga/inactivity',
]

// Routen mit dynamischem Segment, die ebenfalls ohne Login erreichbar sein
// muessen. Praefix-Vergleich, weil die Turnier-ID variabel ist.
const PUBLIC_API_PATTERNS = [
  /^\/api\/turniere\/[^/]+\/register-guest$/,
  /^\/api\/turniere\/[^/]+\/checkout$/,
]

export async function middleware(request: NextRequest) {
  // Next.js lädt verlinkte Seiten im Hintergrund vor (Prefetch). Diese Anfragen
  // laufen durch die Middleware. Trifft ein Prefetch genau in den Moment, in dem
  // Supabase den Token erneuert, sieht die Middleware kurz "keine Session" —
  // und hat unten die Cookies gelöscht. Ergebnis: Der Spieler war ausgeloggt,
  // sobald er eine Seite ansteuerte, auf die ein Link zeigte.
  // Prefetches werden deshalb nie umgeleitet und dürfen keine Cookies anfassen.
  const istPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1'

  let supabaseResponse = NextResponse.next({ request })
  if (istPrefetch) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Öffentliche Pfade: immer zugänglich (auch ausgeloggt → /entdecken zeigt die Teaser-Startseite)
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/auth'))
  if (isPublic) return supabaseResponse

  // Signierte bzw. selbst-verifizierende API-Routen: kein Login-Redirect
  if (PUBLIC_API.some(p => pathname === p)) return supabaseResponse
  if (PUBLIC_API_PATTERNS.some(re => re.test(pathname))) return supabaseResponse

  // Nicht eingeloggt → Login.
  //
  // WICHTIG: Supabase rotiert beim Erneuern der Session die Tokens und setzt sie
  // über setAll() auf `supabaseResponse`. Gibt man hier einfach ein neues
  // NextResponse.redirect() zurück, gehen diese frischen Cookies verloren — der
  // Browser behält den alten, bereits entwerteten Token und ist beim nächsten
  // Aufruf wieder ausgeloggt. Genau das führte dazu, dass Spieler sich
  // "immer wieder neu anmelden" mussten.
  // Deshalb: die Cookies der Supabase-Antwort auf die Weiterleitung übertragen.
  if (!user) {
    // API-Routen bekommen 401 statt einer Weiterleitung. Vorher lieferte die
    // Middleware auch bei /api/... eine Umleitung auf die HTML-Login-Seite —
    // die Clients prüften auf 401, sahen aber einen 200 mit HTML, und res.json()
    // ist gescheitert. Jede abgelaufene Session endete so in einem Blindflug.
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c))
      return res
    }

    // Cookies der Supabase-Antwort auf die Weiterleitung übertragen — sonst geht
    // ein frisch erneuerter Token verloren.
    //
    // Was hier bewusst NICHT mehr passiert: das Löschen "toter" sb-Cookies.
    // Das sollte eine Login-Schleife brechen, hat aber bei jeder Anfrage, die
    // zufällig neben einer Token-Erneuerung lief, die gültige Session mitgerissen.
    // Der Spieler flog raus, sobald er eine Seite ansteuerte. Eine echte Schleife
    // gibt es nicht mehr, seit die Cookies korrekt weitergereicht werden.
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c))
    return redirect
  }

  return supabaseResponse
}

export const config = {
  // site.webmanifest, apple-touch-icon & Co. werden vom Browser OHNE Cookies
  // geholt — sie liefen in die Login-Umleitung und kamen als HTML zurück.
  // Deshalb hier ausgenommen.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|site.webmanifest|apple-touch-icon.png|logo-player.svg|auth|join|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)'],
}
