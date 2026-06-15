import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'https://pingponglounge-player.vercel.app'),
    { status: 302 }
  )
}
