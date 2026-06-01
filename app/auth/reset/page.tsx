import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import ResetForm from './ResetForm'

const G = "#39FF14"
const BG = "#111214"

interface Props {
  searchParams: { auth_error?: string; msg?: string }
}

export default async function ResetPage({ searchParams }: Props) {
  const authError = searchParams.auth_error

  if (authError) {
    return <ErrorPage msg={"Fehler: " + authError} />
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return <ErrorPage msg="Link abgelaufen — bitte neuen Reset-Link anfordern." />
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'League Spartan', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ color: G, fontSize: 28, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>
          Neues Passwort
        </h1>
        <ResetForm />
      </div>
    </div>
  )
}

function ErrorPage({ msg }: { msg: string }) {
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'League Spartan', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#FF6B6B", marginBottom: 24, fontSize: 15 }}>{msg}</p>
        <a href="/login" style={{
          border: "2px solid transparent",
          background: "linear-gradient(#111214, #111214) padding-box, linear-gradient(135deg, #39FF14 0%, #00E5FF 100%) border-box",
          borderRadius: 10, padding: "14px 24px", color: G, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none",
          fontFamily: "'League Spartan', system-ui, sans-serif",
        }}>Zurück zum Login</a>
      </div>
    </div>
  )
}
