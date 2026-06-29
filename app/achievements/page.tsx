"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#0E1014",C="#1A1D24",B="#1A1D24",M="rgba(255,255,255,0.66)",G="#39FF14",W="#FFFFFF",PK="#1FD1C4"
const GRAD="linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"

const tierColor = (t: string) => ({
  bronze:  "#CD7F32",
  silver:  "#C0C0C0",
  gold:    "#FFD700",
  special: PK,
}[t] || M)

type Badge = {
  id: string
  icon: string
  title: string
  description: string
  earned: boolean
  earnedAt?: string
  tier: string
}

export default function AchievementsPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [earned, setEarned] = useState(0)
  const [total,  setTotal]  = useState(0)
  const [filter, setFilter] = useState<"alle"|"earned"|"locked">("alle")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setError("")
    try {
      const r = await fetch("/api/achievements")
      const d = await r.json()
      setBadges(d.badges || [])
      setEarned(d.earned || 0)
      setTotal(d.total || 0)
    } catch {
      setError("Achievements konnten nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = badges.filter(b =>
    filter === "earned" ? b.earned :
    filter === "locked" ? !b.earned : true
  )

  const pct = total > 0 ? Math.round((earned / total) * 100) : 0

  if (error) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 36, marginBottom: 12 }}>⚠️</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: W, marginBottom: 6 }}>verbindungsfehler</p>
        <p style={{ fontSize: 13, color: M, marginBottom: 20 }}>{error}</p>
        <button onClick={load} style={{ background: "#fff", color: "#0E1014", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>nochmals versuchen</button>
      </div>
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <Link href="/profil" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← profil</Link>

        <div style={{ margin: "20px 0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'League Spartan', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>achievements</h1>
          <p style={{ fontSize: 13, color: M, marginTop: 6 }}>{earned} / {total} freigeschaltet</p>
        </div>

        {/* Progress Bar */}
        <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: W }}>{pct}% abgeschlossen</span>
            <span style={{ fontSize: 12, color: M }}>{earned} / {total}</span>
          </div>
          <div style={{ height: 6, background: B, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: G, borderRadius: 3, transition: "width .5s", boxShadow: `0 0 8px ${G}` }} />
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["alle","earned","locked"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: filter === f ? "#fff" : C, color: filter === f ? "#0E1014" : M,
              border: `1px solid ${filter === f ? "#fff" : B}`
            }}>
              {f === "alle" ? "alle" : f === "earned" ? `✓ earned (${earned})` : `🔒 locked (${total - earned})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: M }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏅</div>
            <p>lädt...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {filtered.map(b => {
              const tc = tierColor(b.tier)
              return (
                <div key={b.id} style={{
                  background: b.earned ? C : "#0d0d0d",
                  border: `1px solid ${b.earned ? tc + "40" : B}`,
                  borderRadius: 14, padding: "14px",
                  opacity: b.earned ? 1 : 0.45,
                  position: "relative", overflow: "hidden"
                }}>
                  {/* Tier glow */}
                  {b.earned && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: 40, background: `radial-gradient(circle at top right, ${tc}20, transparent)` }} />
                  )}

                  <div style={{ fontSize: 28, marginBottom: 8 }}>{b.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: b.earned ? W : M, marginBottom: 4, lineHeight: 1.2 }}>{b.title}</p>
                  <p style={{ fontSize: 11, color: M, lineHeight: 1.4 }}>{b.description}</p>

                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: tc, background: `${tc}15`, borderRadius: 999, padding: "1px 7px", textTransform: "uppercase" }}>{b.tier}</span>
                    {b.earned && <span style={{ fontSize: 9, color: G }}>✓</span>}
                    {!b.earned && <span style={{ fontSize: 9, color: M }}>🔒</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}