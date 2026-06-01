import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const verifier = searchParams.get('verifier')

  if (!code || !verifier) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  // Direkt Supabase Token-Endpoint aufrufen (PKCE exchange)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: verifier,
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.access_token) {
    return NextResponse.json({ error: data.error_description ?? data.msg ?? 'exchange_failed' }, { status: 400 })
  }

  return NextResponse.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
}
