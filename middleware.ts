import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/auth', '/spielen', '/entdecken']

// Routen, die bewusst OHNE Login funktionieren müssen:
// - confirm-email: der Ein-Klick-Link aus der Bestätigungs-Mail (signiert, prüft sich selbst)
// - webhook: Stripe ruft ihn auf, hat keine Session (prüft die Stripe-Signatur)
const PUBLIC_API = ['/api/liga/confirm-email', '/api/booking/webhook']

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
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c))
    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo-player.svg|auth|join|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
