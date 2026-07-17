"use client"
import { useEffect, useRef, useState, useCallback } from "react"

const CARD = "#2A2F39", CELL = "#353B46", W = "#FFFFFF"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const SUB = "rgba(255,255,255,.82)", MUT = "rgba(255,255,255,.82)"
const LINE = "rgba(255,255,255,.07)"

type Msg = { id: string; user_id: string | null; text: string; created_at: string; kind: string | null; name: string }

export default function LigaChatHome({
  seasonId, seasonLabel, playerCount, isMember, meId,
}: {
  seasonId: string; seasonLabel: string; playerCount: number; isMember: boolean; meId: string
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/liga/chat?season_id=${seasonId}`)
    if (r.ok) { const d = await r.json(); setMsgs(d.messages || []) }
  }, [seasonId])

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t) }, [load])
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, [msgs])

  async function send() {
    const clean = text.trim()
    if (!clean || sending) return
    setSending(true); setText("")
    await fetch("/api/liga/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_id: seasonId, text: clean }),
    })
    await load(); setSending(false)
  }

  return (
    <div style={{ margin: "0 18px", borderRadius: 20, background: CARD, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid ${LINE}` }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 8px #39FF14" }} />
        <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: W }}>{seasonLabel}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: MUT, fontWeight: 500 }}>{playerCount} Spieler</span>
      </div>

      <div ref={boxRef} style={{ height: 210, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
        {msgs.length === 0 ? (
          <p style={{ fontSize: 13, color: MUT, textAlign: "center", margin: "auto", fontWeight: 300 }}>Noch keine Nachrichten — schreib die erste!</p>
        ) : msgs.map(m => {
          if (m.kind === "feed") {
            return <div key={m.id} style={{ alignSelf: "center", fontSize: 11.5, fontWeight: 600, color: MUT, background: CELL, borderRadius: 999, padding: "5px 12px" }}>{m.text}</div>
          }
          const me = m.user_id === meId
          return (
            <div key={m.id} style={{ maxWidth: "80%", alignSelf: me ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUT, margin: me ? "0 11px 3px 0" : "0 0 3px 11px", textAlign: me ? "right" : "left" }}>{me ? "Du" : m.name}</div>
              {/* Eigene Nachricht: einfach graues Kästchen (rechtsbündig genügt zur
                  Unterscheidung) — kein Grün. */}
              <div style={{
                background: CELL, color: W, borderRadius: 13,
                borderTopLeftRadius: me ? 13 : 4, borderTopRightRadius: me ? 4 : 13,
                padding: "9px 13px", fontSize: 13.5, fontWeight: 300, lineHeight: 1.35,
              }}>{m.text}</div>
            </div>
          )
        })}
      </div>

      {isMember ? (
        <div style={{ display: "flex", gap: 8, padding: "11px 14px", borderTop: `1px solid ${LINE}` }}>
          <input
            value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send() }}
            placeholder="Nachricht an die Liga…"
            style={{ flex: 1, background: "#20242C", borderRadius: 12, padding: "11px 14px", color: W, fontSize: 13, outline: "none", fontFamily: "inherit" }}
          />
          <button onClick={send} disabled={sending} style={{ width: 44, borderRadius: 12, background: GRAD, color: "#08120a", fontSize: 18, fontWeight: 800, cursor: "pointer" }}>→</button>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${LINE}`, textAlign: "center", fontSize: 12, color: MUT, fontWeight: 500 }}>
          Tritt der Liga bei, um mitzuschreiben.
        </div>
      )}
    </div>
  )
}
