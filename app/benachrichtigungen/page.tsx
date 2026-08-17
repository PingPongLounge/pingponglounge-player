"use client"
import { useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import BottomNav from "@/app/components/BottomNav"
import { BG, W, SUB, MUT, LINE, GREEN } from "@/app/theme"

const VIOLET = "#7A3CFF"
const PINK = "#FF00C8"

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

function seit(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "gerade eben"
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min`
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std`
  if (s < 172800) return "gestern"
  return `vor ${Math.floor(s / 86400)} Tagen`
}

// Farbe + Symbol je Art — Turnier violett, Single Night pink, sonst grün.
function stil(type: string): { color: string; icon: ReactNode } {
  const t = type.toLowerCase()
  if (t.includes("turnier") || t.includes("tournament")) return { color: VIOLET, icon: <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3M8 21h8M12 17v4" /> }
  if (t.includes("single")) return { color: PINK, icon: <g><circle cx="8.5" cy="8" r="3" /><circle cx="16" cy="9" r="2.6" /><path d="M3 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /></g> }
  if (t.includes("point") || t.includes("milestone") || t.includes("reward")) return { color: GREEN, icon: <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6L5.7 21 8 14 2 9.4h7.6z" /> }
  return { color: GREEN, icon: <path d="M5 12l4 4 10-10" /> }
}

export default function BenachrichtigungenPage() {
  const router = useRouter()
  const [list, setList] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  const laden = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications")
      if (r.ok) { const j = await r.json(); setList(j.notifications || []) }
    } catch { /* still */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    laden()
    // Beim Öffnen alles als gelesen markieren
    ;(async () => { try { await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }) } catch { /* still */ } })()
  }, [laden])

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "16px 16px 110px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 8 }}>
          <button onClick={() => router.back()} aria-label="Zurück" style={{ background: "none", border: "none", padding: 0, display: "inline-flex", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={W} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: W }}>Benachrichtigungen</span>
          <span style={{ width: 22 }} />
        </div>

        {loading ? (
          <p style={{ color: MUT, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Lädt …</p>
        ) : list.length === 0 ? (
          <p style={{ color: MUT, fontSize: 14, textAlign: "center", padding: "60px 20px" }}>Noch keine Benachrichtigungen.</p>
        ) : (
          list.map((n, i) => {
            const s = stil(n.type)
            const clickable = !!n.link
            return (
              <div key={n.id} onClick={() => clickable && router.push(n.link!)}
                style={{ display: "flex", gap: 12, padding: "14px 2px", borderTop: i === 0 ? "none" : `1px solid ${LINE}`, alignItems: "flex-start", cursor: clickable ? "pointer" : "default" }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", flex: "0 0 40px", display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${s.color}` }}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={s.color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                </span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14, fontWeight: 600, color: W }}>{n.title}</b>
                  {n.body && <p style={{ color: MUT, fontSize: 13, marginTop: 2, lineHeight: 1.35 }}>{n.body}</p>}
                  <time style={{ color: MUT, fontSize: 11, display: "block", marginTop: 4 }}>{seit(n.created_at)}</time>
                </div>
                {!n.read_at && <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, marginTop: 6, flex: "0 0 8px" }} />}
              </div>
            )
          })
        )}
      </div>
      <BottomNav />
    </main>
  )
}
