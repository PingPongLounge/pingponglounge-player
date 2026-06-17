'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DARK='#14161A', SURFACE='#111214', BORDER='#26282E', G='#39FF14', MUTED='#6B6E7A', TEXT='#E8E6E1'

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

  const inputStyle = {
    width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: '10px', padding: '14px', fontSize: '15px', color: TEXT, outline: 'none'
  }

  return (
    <main style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <svg viewBox="0 0 360 80" fill="none" style={{ width: '120px', height: 'auto', margin: '0 auto 20px' }}>
            <path d="M 6 68 L 6 12 L 30 12 C 44 12 52 20 52 34 C 52 48 44 56 30 56 L 22 56 L 22 68 Z" fill={G}/>
            <circle cx="62" cy="64" r="7" fill={G}/>
            <text x="76" y="66" fontFamily="'League Spartan', system-ui, sans-serif" fontSize="58" fontWeight="900" letterSpacing="2" fill="none" stroke={G} strokeWidth="2.2" paintOrder="stroke">PLAYER</text>
          </svg>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: TEXT }}>Neues Passwort</h1>
          <p style={{ fontSize: '14px', color: MUTED, marginTop: '6px' }}>Wähle ein sicheres Passwort</p>
        </div>

        {success ? (
          <div style={{ background: `${G}15`, border: `1px solid ${G}40`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: G }}>✓ Passwort geändert!</p>
            <p style={{ fontSize: '13px', color: MUTED, marginTop: '6px' }}>Weiterleitung zum Dashboard...</p>
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
            {error && <p style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}
            <button
              onClick={submit}
              disabled={loading || !password || !confirm}
              style={{
                padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 800,
                background: !password || !confirm ? BORDER : G,
                color: !password || !confirm ? MUTED : '#14161A',
                border: 'none', cursor: !password || !confirm ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Wird gespeichert...' : 'Passwort speichern →'}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}