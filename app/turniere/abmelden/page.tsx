"use client"
import { useEffect, useState } from "react"
import { CARD, W, SUB, LINE, GREEN, DANGER, btn, btnOutline } from "@/app/theme"

// Landeseite des Abmeldelinks aus der Turnier-Bestaetigungsmail.
// Der Klick meldet noch nicht ab — erst der Knopf. So loesen Mailprogramme,
// die Links vorab oeffnen, keine Abmeldung aus.
type Info = { turnier: string; datumLabel: string; vorname: string | null; schonAbgemeldet: boolean; vorbei: boolean; kostenlos: boolean }

export default function TurnierAbmeldenPage() {
  const [p, setP] = useState<{ r: string; t: string; k: string } | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [state, setState] = useState<"laden" | "bereit" | "busy" | "fertig" | "fehler">("laden")
  const [msg, setMsg] = useState("")
  const [rueck, setRueck] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const werte = { r: q.get("r") || "", t: q.get("t") || "", k: q.get("k") || "" }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setP(werte)
    fetch(`/api/turniere/abmelden?${new URLSearchParams(werte)}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) { setState("fehler"); setMsg(j.error || "Link ungültig."); return }
        setInfo(j); setState("bereit")
      })
      .catch(() => { setState("fehler"); setMsg("Verbindung fehlgeschlagen.") })
  }, [])

  async function abmelden() {
    if (!p) return
    setState("busy"); setMsg("")
    try {
      const r = await fetch("/api/turniere/abmelden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setRueck(!!j.rueckerstattung); setState("fertig") }
      else { setState("bereit"); setMsg(j.error || "Abmeldung nicht möglich.") }
    } catch { setState("bereit"); setMsg("Verbindung fehlgeschlagen.") }
  }

  const karte = { background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, padding: 18 } as const
  const text = { color: SUB, fontSize: 14, lineHeight: 1.5 } as const

  return (
    <main className="p-dunkel" style={{ minHeight: "100vh", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: W, letterSpacing: "-.4px", margin: "8px 0 16px" }}>Vom Turnier abmelden</h1>
        {state === "laden" ? (
          <div style={karte}><p style={text}>Lädt …</p></div>
        ) : state === "fehler" || !info ? (
          <div style={karte}><p style={text}>{msg || "Kein gültiger Abmeldelink. Bitte nutze den Link aus deiner Bestätigungsmail."}</p></div>
        ) : state === "fertig" || info.schonAbgemeldet ? (
          <div style={karte}>
            <p style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Du bist abgemeldet</p>
            <p style={text}>{info.turnier}, {info.datumLabel}. {rueck ? "Dein Startgeld erstatten wir dir zurück." : ""} Schade, bis zum nächsten Mal.</p>
          </div>
        ) : info.vorbei ? (
          <div style={karte}><p style={text}>Das Turnier hat schon stattgefunden.</p></div>
        ) : !info.kostenlos ? (
          <div style={karte}>
            <p style={text}>{info.turnier}, {info.datumLabel}.</p>
            <p style={{ ...text, marginTop: 10 }}>Die kostenlose Abmeldung war bis 24 Stunden vor dem Turnier möglich. Antworte bitte auf deine Bestätigungsmail, dann schauen wir es an.</p>
          </div>
        ) : (
          <div style={karte}>
            <p style={{ ...text, marginBottom: 16 }}>
              {info.vorname ? `Hallo ${info.vorname}, m` : "M"}öchtest du dich von <b style={{ color: W }}>{info.turnier}</b> am {info.datumLabel} abmelden? Bis 24 Stunden vor dem Turnier ist das kostenlos.
            </p>
            {msg && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
            <button onClick={abmelden} disabled={state === "busy"} style={{ ...btn, opacity: state === "busy" ? .6 : 1 }}>
              {state === "busy" ? "Wird abgemeldet …" : "Jetzt abmelden"}
            </button>
            <a href={`https://pingponglounge.ch/turniere/${p?.t || ""}`} style={{ ...btnOutline, marginTop: 10 }}>Doch dabei bleiben</a>
          </div>
        )}
      </div>
    </main>
  )
}
