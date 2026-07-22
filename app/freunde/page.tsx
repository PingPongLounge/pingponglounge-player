"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, MUT, GREEN, GRAD, gt, cardPad, h1, h2, body, meta, eyebrow, btn, btnGhost } from "@/app/theme"

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
          title: "Player — Pingpong Next Level",
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
      <p style={{ ...meta }}>Lädt …</p>
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 20px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: MUT, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>

        {/* Hero */}
        <div style={{ textAlign: "center", margin: "32px 0 32px" }}>
          <p style={{ ...eyebrow, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>Freunde werben</p>
          <h1 style={{ ...h1, fontSize: 36, letterSpacing: ".1em", marginBottom: 14 }}>Teile deinen<br/>Link</h1>
          <p style={{ ...body, fontSize: 16, lineHeight: 1.5 }}>
            Du und dein Freund<br/>
            bekommen je <span style={{ color: GREEN, fontWeight: 700 }}>2 Gratisstunden</span>
          </p>
        </div>

        {/* Referral Link Box */}
        <div style={{ ...cardPad, padding: "20px", marginBottom: 12 }}>
          <p style={{ ...eyebrow, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Dein persönlicher Link</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: GREEN, wordBreak: "break-all", marginBottom: 0 }}>
            playerapp.ch/join?ref={nick}
          </p>
        </div>

        {/* Buttons */}
        <button onClick={handleShare} style={{
          ...btn,
          width: "100%",
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
          Link teilen →
        </button>

        <button onClick={handleCopy} style={{
          ...btnGhost,
          width: "100%",
          color: copied ? GREEN : undefined,
          marginBottom: 28,
          transition: "all 0.2s",
        }}>
          {copied ? "✓ Kopiert!" : "Code kopieren"}
        </button>

        {/* Wie es funktioniert */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ ...h2, fontSize: 14, marginBottom: 16 }}>So funktioniert es</h2>
          {[
            "Du teilst deinen persönlichen Link",
            "Dein Freund meldet sich an",
            "Ihr bekommt je 2h gutgeschrieben",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: GRAD,
                color: "#06210F",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 900, flexShrink: 0,
              }}>{i + 1}</div>
              <p style={{ ...body, fontSize: 15, margin: 0, paddingTop: 4 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        {refCount > 0 && (
          <div style={{ ...cardPad, padding: "20px", textAlign: "center" }}>
            <p style={{ ...eyebrow, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bisher geworben</p>
            <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, marginBottom: 4, ...gt }}>{refCount}</div>
            <p style={{ ...meta }}>Freunde · {refHours}h verdient</p>
          </div>
        )}
      </div>
    </main>
  )
}
