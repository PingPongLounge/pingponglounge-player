"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, CELL, W, MUT, GREEN, DANGER, gt, cardPad, h1, meta, eyebrow, btn, btnGhost, statusPill } from "@/app/theme"

type Credit = {
  id: string
  hours: number
  type: "signup" | "referral"
  redemption_code: string
  expires_at: string
  redeemed_at: string | null
  referred_name?: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-CH", { month: "short", year: "numeric" })
}

function QRCode({ code }: { code: string }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(code)}&color=39FF14&bgcolor=15161A&margin=8`
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="QR Code" width={100} height={100} style={{ borderRadius: 8 }} />
      <span style={{ fontSize: 10, color: MUT, letterSpacing: "0.06em" }}>Am Empfang vorzeigen</span>
    </div>
  )
}

function CreditCard({ c }: { c: Credit }) {
  const expired = new Date(c.expires_at) < new Date()
  const redeemed = !!c.redeemed_at
  const status = redeemed ? "Eingelöst" : expired ? "Abgelaufen" : "Gültig"
  const statusColor = redeemed ? MUT : expired ? DANGER : GREEN

  return (
    <div style={{
      ...cardPad,
      padding: "20px",
      opacity: redeemed || expired ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{c.type === "signup" ? "🎁" : "👥"}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: W }}>
              {c.type === "signup" ? "Willkommensbonus" : "Freund geworben"}
            </span>
          </div>
          {c.referred_name && (
            <p style={{ ...meta, fontSize: 12, margin: 0 }}>{c.referred_name} hat sich angemeldet</p>
          )}
          <p style={{ ...meta, fontSize: 12, margin: "2px 0 0" }}>
            Gültig bis {formatDate(c.expires_at)}
          </p>
          {redeemed && (
            <p style={{ ...meta, fontSize: 12, margin: "2px 0 0" }}>
              Eingelöst {formatDate(c.redeemed_at!)}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...statusPill, color: statusColor, borderColor: statusColor, marginBottom: 6 }}>{status}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: redeemed ? MUT : GREEN, lineHeight: 1 }}>{c.hours}h</div>
        </div>
      </div>

      {!redeemed && !expired && (
        <>
          <div style={{
            background: CELL,
            borderRadius: 10,
            padding: "12px 16px",
            textAlign: "center",
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.15em",
              color: W,
              fontFamily: "monospace",
            }}>{c.redemption_code}</span>
          </div>
          <QRCode code={c.redemption_code} />
        </>
      )}
    </div>
  )
}

export default function StundenPage() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/login"; return }

      const { data } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setCredits(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const total = credits.filter(c => !c.redeemed_at && new Date(c.expires_at) > new Date())
    .reduce((a, c) => a + c.hours, 0)

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 20px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/entdecken" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex", color: MUT, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>

        <div style={{ textAlign: "center", margin: "32px 0 28px" }}>
          <h1 style={{ ...h1, fontSize: 22, marginBottom: 10 }}>Meine Stunden</h1>
          <p style={{ ...eyebrow, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Guthaben</p>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, ...gt }}>{total}h</div>
          {credits.length > 0 && (
            <p style={{ ...meta, marginTop: 8 }}>
              {credits.filter(c => !c.redeemed_at && new Date(c.expires_at) > new Date()).length} aktive Gutscheine
            </p>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", ...meta }}>Lädt …</p>
        ) : credits.length === 0 ? (
          <div style={{ ...cardPad, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🎁</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>Noch keine Gutscheine</p>
            <p style={{ ...meta, marginBottom: 24 }}>Lade Freunde ein und verdiene je 2 Gratisstunden</p>
            <Link href="/freunde" style={{ ...btn, display: "inline-block" }}>Freunde einladen</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {credits.map(c => <CreditCard key={c.id} c={c} />)}
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/freunde" style={{ ...btnGhost, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Weitere Stunden verdienen →
          </Link>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
