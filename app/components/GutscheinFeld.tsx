"use client"
import { useState } from "react"
import { VIOLETT, CREME, SUB, MUT, CELL, LINE, INTER } from "@/app/theme"

/* Das Feld "Gutscheincode" mit dem Knopf ANWENDEN.

   Es zeigt nur an. Der geprueste Rabatt kommt vom Server, und beim Absenden
   der Anmeldung geht ausschliesslich der CODE mit — nie ein Preis. Der
   Checkout rechnet mit derselben Pruefung noch einmal. Wer hier im Browser
   an den Zahlen dreht, aendert nichts als die eigene Anzeige.               */

export type GutscheinStand = { code: string; prozent: number; preisVorher: number; preisNachher: number }

export default function GutscheinFeld({
  art, eventId, ticketType, hell = false, onGeprueft,
}: {
  art: "tournament" | "open_game" | "single_night"
  eventId: string
  ticketType?: string
  /** true, wenn das Feld auf einer hellen Flaeche steht. */
  hell?: boolean
  onGeprueft: (stand: GutscheinStand | null) => void
}) {
  const [code, setCode] = useState("")
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState("")
  const [stand, setStand] = useState<GutscheinStand | null>(null)

  const text = hell ? "#0A0A0C" : CREME
  const leise = hell ? "rgba(10,10,12,.70)" : SUB
  const akzent = hell ? "#0B7A33" : VIOLETT
  const linie = hell ? "rgba(10,10,12,.16)" : LINE

  async function pruefen() {
    if (!code.trim() || laeuft) return
    setLaeuft(true); setFehler("")
    try {
      const r = await fetch("/api/gutschein/pruefen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, art, event_id: eventId, ticket_type: ticketType }),
      })
      const j = await r.json().catch(() => ({}))
      if (j?.ok) {
        const s: GutscheinStand = { code: j.code, prozent: j.prozent, preisVorher: j.preisVorher, preisNachher: j.preisNachher }
        setStand(s); onGeprueft(s)
      } else {
        setStand(null); onGeprueft(null)
        setFehler(j?.meldung || "Code konnte nicht geprüft werden.")
      }
    } catch {
      setStand(null); onGeprueft(null)
      setFehler("Code konnte gerade nicht geprüft werden.")
    }
    setLaeuft(false)
  }

  function entfernen() {
    setStand(null); setCode(""); setFehler(""); onGeprueft(null)
  }

  const chf = (n: number) => `CHF ${n.toFixed(2).replace(/\.00$/, ".–")}`

  if (stand) {
    return (
      <div style={{ fontFamily: INTER, borderTop: `1px solid ${linie}`, paddingTop: 14, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 15.5, color: leise, textDecoration: "line-through" }}>{chf(stand.preisVorher)}</span>
          <button type="button" onClick={entfernen} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 13.5, fontWeight: 600, color: leise, padding: "10px 0",
          }}>Entfernen</button>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: akzent }}>
            Gutschein {stand.code} –{stand.prozent} %
          </span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.02em", color: text, marginTop: 6 }}>
          {stand.preisNachher === 0 ? "Gratis" : chf(stand.preisNachher)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: INTER, borderTop: `1px solid ${linie}`, paddingTop: 14, marginTop: 14 }}>
      <label htmlFor={`gs-${art}`} style={{
        display: "block", fontSize: 12, fontWeight: 600, letterSpacing: ".05em",
        color: leise, marginBottom: 7,
      }}>Gutscheincode</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id={`gs-${art}`}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void pruefen() } }}
          placeholder="Code eingeben"
          autoComplete="off"
          style={{
            flex: 1, minWidth: 0, background: hell ? "#FFFFFF" : CELL,
            border: `1px solid ${linie}`, borderRadius: 10, padding: "13px 14px",
            fontSize: 16, color: text, outline: "none", fontFamily: "inherit",
          }}
        />
        <button type="button" onClick={pruefen} disabled={laeuft || !code.trim()} style={{
          minHeight: 48, padding: "0 18px", borderRadius: 999, border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 900, letterSpacing: ".07em",
          textTransform: "uppercase", whiteSpace: "nowrap",
          background: hell ? "#0B7A33" : VIOLETT, color: hell ? "#FFFFFF" : "#06220E",
          opacity: laeuft || !code.trim() ? .5 : 1,
        }}>{laeuft ? "…" : "Anwenden"}</button>
      </div>
      {fehler && <p role="alert" style={{ fontSize: 14.5, color: hell ? "#B3261E" : "#FF8F87", margin: "9px 0 0" }}>{fehler}</p>}
      {!fehler && <p style={{ fontSize: 13.5, color: hell ? "rgba(10,10,12,.62)" : MUT, margin: "9px 0 0" }}>
        Falls du einen Code hast — sonst einfach weiter.
      </p>}
    </div>
  )
}
