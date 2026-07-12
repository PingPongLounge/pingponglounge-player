import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/auth', '/spielen', '/entdecken']

// Routen, die bewusst OHNE Login funktionieren müssen:
// - confirm-email: der Ein-Klick-Link aus der Bestätigungs-Mail (signiert, prüft sich selbst)
// - webhook: Stripe ruft ihn auf, hat keine Session (prüft die Stripe-Signatur)
// - spielen/preview: der Rang-Vorschau-Screen für NICHT eingeloggte Besucher
//   (QR am Tisch). Die Middleware hat ihn bisher auf /login umgeleitet — deshalb
//   stand dort immer "Dein Rang wird nach dem Sichern berechnet", nie ein Rang.
const PUBLIC_API = ['/api/liga/confirm-email', '/api/booking/webhook', '/api/spielen/preview']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

    const redirect = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c))

    // Endlosschleife brechen: Ist noch ein Supabase-Cookie da, obwohl der Server
    // keine gültige Session erkennt, ist der Token tot (z.B. weil ein früherer
    // Redirect den erneuerten Token verworfen hat). Der Browser hält ihn aber
    // weiter — die App wirkt "eingeloggt", jeder Klick landet auf /login.
    // Also das tote Cookie entfernen, damit ein sauberer Login möglich ist.
    const stale = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
    const refreshed = new Set(supabaseResponse.cookies.getAll().map(c => c.name))
    stale.forEach(c => { if (!refreshed.has(c.name)) redirect.cookies.delete(c.name) })

    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo-player.svg|auth|join|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
