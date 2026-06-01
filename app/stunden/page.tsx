"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type Credit = {
  id: string
  hours: number
  type: "signup" | "referral"
  redemption_code: string
  expires_at: string
  redeemed_at: string | null
  referred_name?: string
}

const BG = "#111214"
const C  = "#15161A"
const B  = "#26282E"
const M  = "#6B6E7A"
const G  = "#39FF14"
const W  = "#E8E6E1"

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-CH", { month: "short", year: "numeric" })
}

function QRCode({ code }: { code: string }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(code)}&color=39FF14&bgcolor=15161A&margin=8`
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="QR Code" width={100} height={100} style={{ borderRadius: 8, border: `1px solid ${B}` }} />
      <span style={{ fontSize: 10, color: M, letterSpacing: "0.06em" }}>Am Empfang vorzeigen</span>
    </div>
  )
}

function CreditCard({ c }: { c: Credit }) {
  const expired = new Date(c.expires_at) < new Date()
  const redeemed = !!c.redeemed_at
  const status = redeemed ? "eingelöst" : expired ? "abgelaufen" : "gültig"
  const statusColor = redeemed ? M : expired ? "#FF4444" : G

  return (
    <div style={{
      background: C,
      border: `1px solid ${redeemed ? B : G}33`,
      borderRadius: 16,
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
            <p style={{ fontSize: 12, color: M, margin: 0 }}>{c.referred_name} hat sich angemeldet</p>
          )}
          <p style={{ fontSize: 12, color: M, margin: "2px 0 0" }}>
            Gültig bis {formatDate(c.expires_at)}
          </p>
          {redeemed && (
            <p style={{ fontSize: 12, color: M, margin: "2px 0 0" }}>
              Eingelöst {formatDate(c.redeemed_at!)}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            background: `${statusColor}22`,
            border: `1px solid ${statusColor}44`,
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: statusColor,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}>{status}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: redeemed ? M : G, lineHeight: 1 }}>{c.hours}h</div>
        </div>
      </div>

      {!redeemed && !expired && (
        <>
          <div style={{
            background: BG,
            border: `1px solid ${B}`,
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
        <Link href="/dashboard" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>

        <div style={{ textAlign: "center", margin: "32px 0 28px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>Meine Stunden</p>
          <p style={{ fontSize: 11, color: M, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>GUTHABEN</p>
          <div style={{ fontSize: 72, fontWeight: 900, color: G, lineHeight: 1 }}>{total}h</div>
          {credits.length > 0 && (
            <p style={{ fontSize: 13, color: M, marginTop: 8 }}>
              {credits.filter(c => !c.redeemed_at && new Date(c.expires_at) > new Date()).length} aktive Gutscheine
            </p>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: M }}>Lädt...</p>
        ) : credits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: C, borderRadius: 16, border: `1px solid ${B}` }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🎁</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: W, marginBottom: 8 }}>Noch keine Gutscheine</p>
            <p style={{ fontSize: 13, color: M, marginBottom: 24 }}>Lade Freunde ein und verdiene je 2 Gratisstunden</p>
            <Link href="/freunde" style={{
              display: "inline-block",
              background: G,
              color: "#0A0A0C",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              padding: "12px 24px",
              borderRadius: 8,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>Freunde einladen</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {credits.map(c => <CreditCard key={c.id} c={c} />)}
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/freunde" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `${G}18`,
            border: `1px solid ${G}44`,
            color: G,
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            padding: "12px 24px",
            borderRadius: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
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
    </main>
  )
}
