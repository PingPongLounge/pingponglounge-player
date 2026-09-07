'use client'
/* ─── Passwort ändern (07.09.2026) ─────────────────────────────────────────
   Eine Seite für zwei Wege, weil beide dasselbe brauchen: eine gültige
   Sitzung, bevor updateUser() läuft.

   A) Eingeloggt: kommt aus dem Profil, die Sitzung besteht bereits. Es wird
      KEIN Recovery-Flow gestartet.
   B) Passwort vergessen: der Link aus der Mail geht über /auth/callback,
      dort wird der Code gegen eine Sitzung getauscht (PKCE) und hierher
      weitergeleitet.

   Warum vorher "Auth session missing" kam: diese Seite rief updateUser()
   sofort auf, ohne je zu prüfen, ob eine Sitzung da ist. Und der Link aus
   der Mail zeigte auf /auth/reset — eine Route, die es gar nicht gibt (nur
   ein Formular ohne page.tsx). Der Reset endete also im Nichts, und wer
   die Seite direkt aufrief, bekam die technische Meldung von Supabase.

   Jetzt: Sitzung zuerst feststellen, Formular erst danach freigeben. */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, DANGER } from '@/app/theme'

type Stand = 'prueft' | 'bereit' | 'keine' | 'gespeichert'

export default function PasswortAendernSeite() {
  const router = useRouter()
  const [stand, setStand] = useState<Stand>('prueft')
  const [passwort, setPasswort] = useState('')
  const [wiederholung, setWiederholung] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')

  /* Sitzung feststellen. Reihenfolge: bestehende Sitzung → Code aus der
     Adresse (falls jemand direkt mit ?code= hier landet) → Tokens im
     Fragment (impliziter Flow, den der Server nie sieht). */
  const pruefe = useCallback(async () => {
    const sb = createClient()

    const { data: { session } } = await sb.auth.getSession()
    if (session) { setStand('bereit'); return }

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (!error) {
        window.history.replaceState({}, '', url.pathname)
        setStand('bereit'); return
      }
      console.error('[reset-password] exchangeCodeForSession:', error.message)
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    if (access_token && refresh_token) {
      const { error } = await sb.auth.setSession({ access_token, refresh_token })
      if (!error) {
        window.history.replaceState({}, '', url.pathname)
        setStand('bereit'); return
      }
      console.error('[reset-password] setSession:', error.message)
    }

    setStand('keine')
  }, [])

  useEffect(() => {
    pruefe()
    /* Supabase meldet PASSWORD_RECOVERY, sobald der Link aus der Mail eine
       Recovery-Sitzung hergestellt hat. Das kann nach dem ersten Prüfen
       eintreffen — dann geht das Formular hier auf, nicht früher. */
    const sb = createClient()
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) setStand('bereit')
      if (event === 'SIGNED_OUT') setStand('keine')
    })
    return () => subscription.unsubscribe()
  }, [pruefe])

  async function speichern() {
    setFehler('')
    if (passwort.length < 8) { setFehler('Mindestens 8 Zeichen.'); return }
    if (passwort !== wiederholung) { setFehler('Die beiden Passwörter stimmen nicht überein.'); return }

    setLaedt(true)
    const sb = createClient()

    /* Direkt vor dem Schreiben nochmals nachsehen: zwischen Seitenaufbau und
       Absenden kann die Sitzung abgelaufen sein. */
    const { data: { session } } = await sb.auth.getSession()
    if (!session) {
      console.error('[reset-password] keine Sitzung beim Speichern')
      setStand('keine'); setLaedt(false); return
    }

    const { error } = await sb.auth.updateUser({ password: passwort })
    if (error) {
      console.error('[reset-password] updateUser:', error.message)
      // Technische Meldung bleibt im Log; der Nutzer bekommt einen Satz,
      // mit dem er etwas anfangen kann.
      if (/session|jwt|token/i.test(error.message)) setStand('keine')
      else setFehler('Das Passwort konnte nicht gespeichert werden. Versuch es nochmals.')
      setLaedt(false); return
    }

    setStand('gespeichert'); setLaedt(false)
    setTimeout(() => router.push('/profil'), 1600)
  }

  const feld: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#0E0E10',
    border: '1px solid rgba(244,241,235,.18)', borderRadius: 12,
    padding: '15px 16px', color: CREME, fontFamily: INTER, fontSize: 16, outline: 'none',
  }
  const knopf: React.CSSProperties = {
    width: '100%', textAlign: 'center', background: VIOLETT, color: CREME, border: 'none',
    borderRadius: 100, padding: '16px 24px', fontFamily: INTER, fontSize: 14, fontWeight: 900,
    letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none',
    display: 'inline-block',
  }

  return (
    <main style={{ minHeight: '100dvh', background: SCHWARZ, color: CREME, fontFamily: INTER, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', color: VIOLETT }}>Konto</div>
        <h1 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 'clamp(38px,11vw,56px)', lineHeight: .95, textTransform: 'uppercase', margin: '10px 0 22px' }}>
          Neues<br />Passwort
        </h1>

        {stand === 'prueft' && (
          <p style={{ fontSize: 16, color: 'rgba(244,241,235,.62)' }}>Einen Moment …</p>
        )}

        {stand === 'keine' && (
          <>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: 'rgba(244,241,235,.72)', margin: '0 0 22px' }}>
              Deine Sitzung ist abgelaufen. Bitte melde dich erneut an — oder fordere einen neuen Link an, falls du dein Passwort vergessen hast.
            </p>
            <Link href="/login?next=/auth/reset-password" style={knopf}>Zum Login</Link>
          </>
        )}

        {stand === 'gespeichert' && (
          <>
            <p style={{ fontFamily: ANTON, fontSize: 26, textTransform: 'uppercase', color: VIOLETT, margin: '0 0 8px' }}>Passwort geändert</p>
            <p style={{ fontSize: 16, color: 'rgba(244,241,235,.62)', margin: 0 }}>Zurück zum Profil …</p>
          </>
        )}

        {stand === 'bereit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="password" autoComplete="new-password" placeholder="Neues Passwort (min. 8 Zeichen)"
              value={passwort} onChange={e => setPasswort(e.target.value)} style={feld} />
            <input type="password" autoComplete="new-password" placeholder="Passwort bestätigen"
              value={wiederholung} onChange={e => setWiederholung(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') speichern() }} style={feld} />

            {fehler && <p style={{ color: DANGER, fontSize: 15, margin: 0 }}>{fehler}</p>}

            <button onClick={speichern} disabled={laedt || !passwort || !wiederholung}
              style={{ ...knopf, marginTop: 6, opacity: laedt || !passwort || !wiederholung ? .55 : 1 }}>
              {laedt ? 'Speichert …' : 'Passwort ändern'}
            </button>

            <Link href="/profil" style={{ textAlign: 'center', fontSize: 15, color: 'rgba(244,241,235,.62)', textDecoration: 'none', marginTop: 6 }}>
              Abbrechen
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
