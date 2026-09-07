import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as 'recovery' | 'email' | 'signup' | null
  // Open-Redirect-Schutz: nur relative Pfade akzeptieren
  const nextRaw     = searchParams.get('next') ?? ''
  const next        = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/entdecken'

  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Bei einem Reset traegt Supabase im PKCE-Flow keinen type mit — dann
  // entscheidet das Ziel aus next. Ohne das landete der Nutzer nach dem
  // Tausch auf der Startseite statt beim Passwortformular.
  const istRecovery = type === 'recovery' || next.startsWith('/auth/reset')

  // PKCE Flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (istRecovery) {
        const ziel = NextResponse.redirect(`${origin}/auth/reset-password`)
        response.cookies.getAll().forEach(c => ziel.cookies.set(c))
        return ziel
      }
      return response
    }
    console.error('[auth/callback] exchangeCodeForSession:', error.message)
  }

  // Token Hash Flow (direkter Link aus Email — kein PKCE nötig)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      if (istRecovery) {
        const ziel = NextResponse.redirect(`${origin}/auth/reset-password`)
        response.cookies.getAll().forEach(c => ziel.cookies.set(c))
        return ziel
      }
      return response
    }
    console.error('[auth/callback] verifyOtp:', error.message)
  }

  // Fehler
  return NextResponse.redirect(`${origin}/login?error=link_ungueltig`)
}