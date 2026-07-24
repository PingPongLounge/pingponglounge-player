"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

// NACHRICHTENZENTRALE — Glocke mit ungelesen-Zähler + Panel mit den Ereignissen.
// Holt /api/notifications, pollt alle 30s. Beim Öffnen werden alle als gelesen
// markiert. Antippen einer Nachricht springt zum Ziel (link).
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const CARD = "#1A1E25"
const CELL = "#20232A"
const W = "#fff"
const SUB = "rgba(255,255,255,.9)"
const MUT = "rgba(255,255,255,.55)"

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

function seit(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "gerade eben"
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min`
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std`
  return `vor ${Math.floor(s / 86400)} T`
}

export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)

  const laden = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications")
      if (r.ok) { const j = await r.json(); setList(j.notifications || []); setUnread(j.unread || 0) }
    } catch { /* still */ }
  }, [])

  useEffect(() => { laden(); const t = setInterval(laden, 30000); return () => clearInterval(t) }, [laden])

  async function oeffnen() {
    setOpen(true)
    if (unread > 0) {
      setUnread(0)
      try { await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }) } catch { /* still */ }
      setList(l => l.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    }
  }

  const iconColor = dark ? "#14171E" : SUB

  return (
    <>
      <button onClick={oeffnen} aria-label="Benachrichtigungen" style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: CELL, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 999, background: GRAD, color: "#06210F", fontSize: 10.5, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 14px 0" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: CARD, borderRadius: 20, overflow: "hidden", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: W }}>Benachrichtigungen</span>
              <button onClick={() => setOpen(false)} style={{ background: "none", color: MUT, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto" }}>
              {list.length === 0 ? (
                <div style={{ textAlign: "center", color: MUT, fontSize: 13.5, padding: "40px 20px" }}>Noch keine Benachrichtigungen.</div>
              ) : list.map(n => (
                <button key={n.id} onClick={() => { setOpen(false); if (n.link) router.push(n.link) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 18px", background: n.read_at ? "none" : "rgba(57,255,20,.06)", borderTop: "1px solid rgba(255,255,255,.06)", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!n.read_at && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#39FF14", flexShrink: 0 }} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: W, flex: 1 }}>{n.title}</span>
                    <span style={{ fontSize: 11, color: MUT, flexShrink: 0 }}>{seit(n.created_at)}</span>
                  </div>
                  {n.body && <div style={{ fontSize: 12.5, color: SUB, fontWeight: 300, marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
