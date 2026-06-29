"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { BG, W, MUT, GREEN, CYAN, GRAD, card, cardPad, h1, meta, chipBtn, btn } from "@/app/theme"

const tierColor = (t: string) => ({
  bronze:  "#CF9763",
  silver:  "#BFC6D0",
  gold:    "#E0C266",
  special: CYAN,
}[t] || MUT)

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
        <p style={{ fontSize: 14, fontWeight: 700, color: W, marginBottom: 6 }}>Verbindungsfehler</p>
        <p style={{ ...meta, marginBottom: 20 }}>{error}</p>
        <button onClick={load} style={{ ...btn, display: "inline-block" }}>Nochmals versuchen</button>
      </div>
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <Link href="/profil" style={{ color: MUT, textDecoration: "none", fontSize: 13 }}>← Profil</Link>

        <div style={{ margin: "20px 0 24px" }}>
          <h1 style={{ ...h1 }}>Achievements</h1>
          <p style={{ ...meta, marginTop: 6 }}>{earned} / {total} freigeschaltet</p>
        </div>

        {/* Progress Bar */}
        <div style={{ ...cardPad, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: W }}>{pct}% abgeschlossen</span>
            <span style={{ ...meta, fontSize: 12 }}>{earned} / {total}</span>
          </div>
          <div style={{ height: 6, background: "#353B46", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: GRAD, borderRadius: 3, transition: "width .5s" }} />
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["alle","earned","locked"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={chipBtn(filter === f)}>
              {f === "alle" ? "Alle" : f === "earned" ? `✓ Freigeschaltet (${earned})` : `🔒 Gesperrt (${total - earned})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏅</div>
            <p style={{ ...meta }}>Lädt …</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {filtered.map(b => {
              const tc = tierColor(b.tier)
              return (
                <div key={b.id} style={{
                  ...card,
                  padding: "14px",
                  opacity: b.earned ? 1 : 0.45,
                  position: "relative",
                }}>
                  {/* Tier glow */}
                  {b.earned && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: 40, background: `radial-gradient(circle at top right, ${tc}20, transparent)` }} />
                  )}

                  <div style={{ fontSize: 28, marginBottom: 8 }}>{b.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: b.earned ? W : MUT, marginBottom: 4, lineHeight: 1.2 }}>{b.title}</p>
                  <p style={{ ...meta, fontSize: 11, lineHeight: 1.4 }}>{b.description}</p>

                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: tc, background: `${tc}15`, borderRadius: 999, padding: "1px 7px", textTransform: "uppercase" }}>{b.tier}</span>
                    {b.earned && <span style={{ fontSize: 9, color: GREEN }}>✓</span>}
                    {!b.earned && <span style={{ fontSize: 9, color: MUT }}>🔒</span>}
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
