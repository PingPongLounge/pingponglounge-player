"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG = "#0E1014"
const C  = "#1A1D24"
const B  = "#1A1D24"
const M  = "rgba(255,255,255,0.66)"
const G  = "#39FF14"
const W  = "#FFFFFF"
const GRAD = "linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"

export default function FreundePage() {
  const [nick, setNick]       = useState("")
  const [refCount, setRefCount] = useState(0)
  const [refHours, setRefHours] = useState(0)
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(true)
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/join?ref=${nick}`
    : `https://playerapp.ch/join?ref=${nick}`

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/login"; return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, referral_code")
        .eq("id", user.id)
        .single()

      setNick(profile?.referral_code || profile?.name || "")

      const { data: credits } = await supabase
        .from("credits")
        .select("hours")
        .eq("user_id", user.id)
        .eq("type", "referral")

      setRefCount((credits || []).length)
      setRefHours((credits || []).reduce((a: number, c: {hours: number}) => a + c.hours, 0))
      setLoading(false)
    }
    load()
  }, [])

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Player — next level table tennis",
          text: "Spiel mit mir auf Player! Wir bekommen je 2 Gratisstunden in der Ping Pong Lounge.",
          url: referralLink,
        })
      } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: M }}>lädt...</p>
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 20px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: M, textDecoration: "none", fontSize: 13 }}>← dashboard</Link>

        {/* Hero */}
        <div style={{ textAlign: "center", margin: "32px 0 32px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>freunde werben</p>
          <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: "'League Spartan', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, marginBottom: 8, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TEILE DEINEN<br/>LINK</h1>
          <p style={{ fontSize: 16, color: W, lineHeight: 1.5 }}>
            du und dein freund<br/>
            bekommen je <span style={{ color: G, fontWeight: 700 }}>2 gratisstunden</span>
          </p>
        </div>

        {/* Referral Link Box */}
        <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: M, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>dein persönlicher link</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: G, wordBreak: "break-all", marginBottom: 0 }}>
            playerapp.ch/join?ref={nick}
          </p>
        </div>

        {/* Buttons */}
        <button onClick={handleShare} style={{
          width: "100%",
          border: "none",
          background: "#fff",
          color: "#0E1014",
          borderRadius: 10,
          padding: "16px",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          textTransform: "lowercase",
          letterSpacing: "0.02em",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          link teilen →
        </button>

        <button onClick={handleCopy} style={{
          width: "100%",
          background: "transparent",
          color: copied ? G : W,
          border: `1px solid ${copied ? G : "#23272F"}`,
          borderRadius: 10,
          padding: "14px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          textTransform: "lowercase",
          letterSpacing: "0.02em",
          marginBottom: 28,
          transition: "all 0.2s",
        }}>
          {copied ? "✓ kopiert!" : "code kopieren"}
        </button>

        {/* Wie es funktioniert */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: M, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>wie es funktioniert</p>
          {[
            "du teilst deinen persönlichen link",
            "freund meldet sich an",
            "ihr bekommt je 2h gutgeschrieben",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: G, color: "#0E1014",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 900, flexShrink: 0,
              }}>{i + 1}</div>
              <p style={{ fontSize: 15, color: W, margin: 0, paddingTop: 4, lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        {refCount > 0 && (
          <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "20px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: M, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>bisher geworben</p>
            <div style={{ fontSize: 48, fontWeight: 900, color: G, lineHeight: 1, marginBottom: 4 }}>{refCount}</div>
            <p style={{ fontSize: 14, color: M }}>freunde · {refHours}h verdient</p>
          </div>
        )}
      </div>
    </main>
  )
}
