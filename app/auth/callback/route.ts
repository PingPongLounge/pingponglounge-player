import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'email' | 'signup' | null
  const next = searchParams.get('next') ?? '/'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const successResponse = NextResponse.redirect(`${origin}${next}`)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[callback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(`${origin}${next}?auth_error=${encodeURIComponent(error.message)}`)
    }
    return successResponse
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      console.error('[callback] verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}${next}?auth_error=${encodeURIComponent(error.message)}`)
    }
    return successResponse
  }

  return NextResponse.redirect(`${origin}${next}?auth_error=no_code`)
}
