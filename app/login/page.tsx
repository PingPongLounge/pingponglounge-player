"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const logoW = "240px"

  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" }
    })
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" }
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#1A1B1F", padding:"20px" }}>
      <div style={{ maxWidth:"380px", width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>

        {/* P-Mark Logo */}
        <div style={{ marginBottom:"48px", display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" }}>
          <svg viewBox="0 0 360 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:"240px", height:"auto" }}>
            <path d="M6 68L6 12L30 12C44 12 52 20 52 34C52 48 44 56 30 56L22 56L22 68Z" fill="#39FF14"/>
            <circle cx="62" cy="64" r="7" fill="#39FF14"/>
            <text x="76" y="66" fontFamily="system-ui,sans-serif" fontSize="58" fontWeight="900" letterSpacing="2" fill="none" stroke="#39FF14" strokeWidth="2.2" paintOrder="stroke">PLAYER</text>
          </svg>
          <p style={{ fontSize:"11px", color:"#7B7E8A", letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700, margin:0 }}>by Ping Pong Lounge</p>
        </div>

        {/* Google */}
        <button onClick={signInWithGoogle} style={{ width:"100%", background:"#fff", color:"#0A0A0C", border:"none", borderRadius:"10px", padding:"15px", fontSize:"14px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", marginBottom:"14px", fontFamily:"inherit" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Mit Google einloggen
        </button>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px", width:"100%" }}>
          <div style={{ flex:1, height:"1px", background:"#30323A" }}/>
          <span style={{ fontSize:"12px", color:"#7B7E8A" }}>oder per Email</span>
          <div style={{ flex:1, height:"1px", background:"#30323A" }}/>
        </div>

        {/* Magic Link */}
        {sent ? (
          <div style={{ background:"#22232A", border:"1px solid #30323A", borderRadius:"16px", padding:"32px", textAlign:"center", width:"100%", boxSizing:"border-box" as const }}>
            <p style={{ fontSize:"13px", color:"#7B7E8A", margin:0 }}>Link an <span style={{ color:"#39FF14", fontWeight:700 }}>{email}</span> gesendet. Check deinen Posteingang.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"10px", width:"100%" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.ch" required
              style={{ width:"100%", background:"#22232A", border:"1px solid #30323A", borderRadius:"10px", padding:"14px 16px", fontSize:"15px", color:"#F0EEE9", outline:"none", boxSizing:"border-box" as const, fontFamily:"inherit" }}/>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:"#39FF14", color:"#0A0A0C", border:"none", borderRadius:"10px", padding:"15px", fontSize:"14px", fontWeight:700, cursor:loading?"not-allowed":"pointer", textTransform:"uppercase" as const, letterSpacing:"0.06em", fontFamily:"inherit", opacity:loading?0.7:1 }}>
              {loading ? "Wird gesendet..." : "Login Link senden"}
            </button>
          </form>
        )}

        <p style={{ marginTop:"24px", fontSize:"12px", color:"#7B7E8A", textAlign:"center" }}>Kein Konto nötig — wird automatisch erstellt.</p>
      </div>
    </div>
  )
}
