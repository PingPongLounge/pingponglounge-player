"use client"
/* Aktionen auf einem fremden Profil (07.09.2026, Oliver): herausfordern und
   befreunden. Ohne Konto fuehrt beides auf den Login und danach zurueck.

   Zur Herausforderung: /api/liga/challenge verlangt eine Saison, in der BEIDE
   Spieler registriert sind. Vom Profil aus ist die nicht bekannt, darum
   oeffnet der Knopf den Liga-Bereich, wo Saison und Gegner gewaehlt werden.
   Die Freundschaftsanfrage laeuft dagegen direkt ueber /api/friends. */
import { useState } from "react"
import { useRouter } from "next/navigation"


const INTER = "var(--font-inter), system-ui, sans-serif"

/* 23.09.2026 (A.1): kein Radius mehr, wie alles im neuen Bausystem. */
const basis: React.CSSProperties = {
  flex: "1 1 150px", textAlign: "center", padding: "15px 20px",
  fontFamily: INTER, fontSize: 14, fontWeight: 900, letterSpacing: ".1em",
  textTransform: "uppercase", textDecoration: "none", cursor: "pointer", border: "none",
}

export default function ProfilAktionen({ spielerId, name, angemeldet }:
  { spielerId: string; name: string; angemeldet: boolean }) {
  const router = useRouter()
  const [stand, setStand] = useState<"leer" | "sendet" | "ok" | "fehler">("leer")
  const [meldung, setMeldung] = useState("")
  const zurueck = `/spieler/${spielerId}`

  function fordern() {
    router.push(angemeldet ? "/liga" : `/login?returnTo=${encodeURIComponent("/liga")}`)
  }

  async function freund() {
    if (!angemeldet) { router.push(`/login?returnTo=${encodeURIComponent(zurueck)}`); return }
    setStand("sendet"); setMeldung("")
    try {
      const r = await fetch("/api/friends", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", user_id: spielerId }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setStand("fehler"); setMeldung(d.error || "Anfrage nicht möglich"); return }
      setStand("ok"); setMeldung(`Anfrage an ${name} ist raus.`)
    } catch { setStand("fehler"); setMeldung("Netzwerkfehler") }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
        <button type="button" onClick={fordern}
          /* Der Sportwert soll dominieren, nicht die Knopffarbe. Neon war
             hier eine leuchtende Flaeche quer ueber das halbe Profil; jetzt
             traegt Schwarz die Hauptaktion, wie ueberall auf hellem Grund. */
          style={{ ...basis, background: '#080B0D', color: '#FFFFFF' }}>
          Herausfordern
        </button>
        <button type="button" onClick={freund} disabled={stand === "sendet" || stand === "ok"}
          style={{
            /* Dieser Knopf stand auf color: CREME (#F4F1EB) — eine Farbe aus
               der Zeit, als die Profilseite dunkel war. Auf der hellen
               Flaeche war er praktisch unsichtbar (1,1:1). Jetzt dunkle
               Schrift mit klarer Kante; im gesperrten Zustand sichtbar
               gedaempft statt unlesbar. (A.1, 23.09.2026) */
            ...basis, background: "transparent",
            color: stand === "ok" || stand === "sendet" ? "#686868" : "#111111",
            border: `1px solid ${stand === "ok" || stand === "sendet" ? "#DDDDDA" : "#9A9A95"}`,
            padding: "14px 20px",
            cursor: stand === "ok" || stand === "sendet" ? "default" : "pointer",
          }}>
          {stand === "ok" ? "Angefragt" : stand === "sendet" ? "Sendet …" : "+ Freund"}
        </button>
      </div>
      {meldung && (
        <div style={{
          fontFamily: INTER, fontSize: 14, marginTop: 12,
          color: stand === "fehler" ? "#FF7A72" : "rgba(244,241,235,.72)",
        }}>{meldung}</div>
      )}
    </div>
  )
}
