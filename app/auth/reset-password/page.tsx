'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BG as DARK, W as TEXT, SUB as MUTED, GREEN as G, DANGER, card, input as inputBase, btn, h1, body } from '@/app/theme'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  async function submit() {
    if (password.length < 8) { setError('Mindestens 8 Zeichen'); return }
    if (password !== confirm) { setError('Passwörter stimmen nicht überein'); return }
    setLoading(true); setError('')
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inputStyle = { ...inputBase, padding: '14px', fontSize: '15px' } as React.CSSProperties

  return (
    <main style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* Das P war hier als einzige Stelle der App AUSGEFÜLLT und einfarbig.
              Es ist immer Outline, immer im Verlauf, mit Ball rechts unten. */}
          <svg viewBox="0 0 360 80" fill="none" style={{ width: '120px', height: 'auto', margin: '0 auto 20px' }}>
            <defs><linearGradient id="rpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14"/><stop offset="1" stopColor="#1FD1C4"/></linearGradient></defs>
            <path d="M 6 68 L 6 12 L 30 12 C 44 12 52 20 52 34 C 52 48 44 56 30 56 L 22 56 L 22 68 Z" fill="none" stroke="url(#rpg)" strokeWidth="4" strokeLinejoin="round"/>
            <circle cx="62" cy="64" r="7" fill="url(#rpg)"/>
            <text x="76" y="66" fontFamily="'League Spartan', system-ui, sans-serif" fontSize="58" fontWeight="900" letterSpacing="2" fill="none" stroke="url(#rpg)" strokeWidth="2.2" paintOrder="stroke">PLAYER</text>
          </svg>
          <h1 style={{ ...h1, fontSize: 28 }}>Neues Passwort</h1>
          <p style={{ ...body, marginTop: '6px' }}>Wähle ein sicheres Passwort</p>
        </div>

        {success ? (
          <div style={{ ...card, padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: G }}>✓ Passwort geändert!</p>
            <p style={{ ...body, marginTop: '6px' }}>Weiterleitung zum Dashboard…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              placeholder="Neues Passwort (min. 8 Zeichen)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Passwort bestätigen"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={inputStyle}
            />
            {error && <p style={{ color: DANGER, fontSize: '13px' }}>{error}</p>}
            <button
              onClick={submit}
              disabled={loading || !password || !confirm}
              style={{ ...btn, opacity: !password || !confirm ? 0.5 : 1, cursor: !password || !confirm ? 'default' : 'pointer' }}
            >
              {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}