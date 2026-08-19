import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Entdecken ohne Konto: Liste UND Detailseite. Der Vergleich war vorher exakt
// (pathname === p), darum lief /turniere/<id> — also genau der Link von der
// Webseite — in die Login-Wand.
const PUBLIC_PATHS = ['/', '/login', '/onboarding', '/auth', '/spielen', '/entdecken',
  '/turniere', '/rangliste', '/match', '/single-night']

// Diese Unterseiten brauchen trotzdem ein Konto: erstellen, mitspielen, eintragen.
const GESCHUETZT = ['/match/create', '/match/erstellen', '/erstellen']

// Oeffentlich lesbare API-Routen — ausschliesslich GET. Ohne diese Zeilen
// antwortete die API einem ausgeloggten Besucher mit 401; die Seite zeigte
// daraufhin "0 offene Turniere" und "0 Spieler", waehrend die Webseite zwei
// Turniere und 22 Spieler auswies. Kein Datenproblem — ein Zugriffsproblem.
const PUBLIC_API_GET = ['/api/turniere', '/api/rangliste', '/api/match', '/api/single-night']

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

// Kanonische Domain: playerapp.ch. Die alten *.vercel.app-Adressen sind
// weiterhin erreichbar und landeten auf dem alten Login — sie leiten jetzt
// dauerhaft (308) auf dieselbe Seite unter playerapp.ch um.
const KANONISCH = "playerapp.ch"

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || ""
  // Nur in der Produktion umleiten — Vorschau-Deployments (Preview) muessen
  // unter ihrer vercel.app-Adresse testbar bleiben.
  if (process.env.VERCEL_ENV === "production" && host.endsWith(".vercel.app")) {
    const ziel = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${KANONISCH}`)
    return NextResponse.redirect(ziel, 308)
  }

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
  const istGeschuetzt = GESCHUETZT.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isPublic = !istGeschuetzt && (
    pathname.startsWith('/auth') ||
    PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p + '/')))
  )
  if (isPublic) return supabaseResponse

  // Lesende Zugriffe auf oeffentliche Listen — ohne Konto.
  if (request.method === 'GET' && PUBLIC_API_GET.some(p => pathname === p || pathname.startsWith(p + '/')))
    return supabaseResponse

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
    // Wohin der Spieler wollte, geht nicht verloren: nach dem Anmelden kehrt er
    // genau auf diese Seite zurueck — samt Standort, Datum und Event-ID.
    const zurueckZu = pathname + (request.nextUrl.search || '')
    const ziel = new URL('/login', request.url)
    ziel.searchParams.set('returnTo', zurueckZu)
    const redirect = NextResponse.redirect(ziel)
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
