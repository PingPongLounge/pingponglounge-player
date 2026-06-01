import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'email' | 'signup' | null
  const next = searchParams.get('next') ?? '/'

  // ── Für alle anderen Flows (Magic Link, OAuth etc.) ──────────────────────────
  if (!next.includes('/auth/reset')) {
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
    if (code) await supabase.auth.exchangeCodeForSession(code)
    else if (token_hash && type) await supabase.auth.verifyOtp({ token_hash, type })
    return response
  }

  // ── Password-Reset: Tokens im Hash mitgeben (umgeht Cookie-Problem) ──────────
  const tempResponse = NextResponse.redirect(`${origin}/`)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            tempResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/auth/reset?auth_error=${encodeURIComponent(error.message)}`)
    }
    if (data.session) {
      const { access_token, refresh_token } = data.session
      return NextResponse.redirect(
        `${origin}/auth/reset#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`
      )
    }
  }

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      return NextResponse.redirect(`${origin}/auth/reset?auth_error=${encodeURIComponent(error.message)}`)
    }
    if (data.session) {
      const { access_token, refresh_token } = data.session
      return NextResponse.redirect(
        `${origin}/auth/reset#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`
      )
    }
  }

  return NextResponse.redirect(`${origin}/auth/reset?auth_error=no_code`)
}
