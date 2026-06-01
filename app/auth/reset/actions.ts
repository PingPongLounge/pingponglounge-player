'use server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 6) {
    redirect('/auth/reset?msg=' + encodeURIComponent('Mindestens 6 Zeichen.'))
  }
  if (password !== confirm) {
    redirect('/auth/reset?msg=' + encodeURIComponent('Passwörter stimmen nicht überein.'))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect('/auth/reset?msg=' + encodeURIComponent(error.message))
  }
  redirect('/dashboard')
}
