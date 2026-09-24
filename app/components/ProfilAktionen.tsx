"use client"
/* Aktionen auf einem fremden Profil (07.09.2026, Oliver): herausfordern und
   befreunden. Ohne Konto fuehrt beides auf den Login und danach zurueck.

   Zur Herausforderung: /api/liga/challenge verlangt eine Saison, in der BEIDE
   Spieler registriert sind. Vom Profil aus ist die nicht bekannt, darum
   oeffnet der Knopf den Liga-Bereich, wo Saison und Gegner gewaehlt werden.
   Die Freundschaftsanfrage laeuft dagegen direkt ueber /api/friends. */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { pruefeAuth } from "@/lib/auth-client"
import { knopf, knopfUmriss, LEISE, KANTE, INTER, TEXT } from "@/app/design"

/* 24.09.2026: Die beiden Knoepfe hatten eigene Masse (Gewicht 900,
   Tracking .1em, Padding 15/20). Jetzt dieselbe Form und Hoehe wie
   ueberall sonst — aus app/design.ts. */
const basis: React.CSSProperties = { flex: "1 1 150px" }

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
      if (!pruefeAuth(r)) return
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
          style={{ ...knopf, ...basis }}>
          Herausfordern
        </button>
        <button type="button" onClick={freund} disabled={stand === "sendet" || stand === "ok"}
          style={{
            /* Dieser Knopf stand einmal auf Creme und war auf der hellen
               Flaeche praktisch unsichtbar (1,1:1). Gesperrt jetzt sichtbar
               gedaempft statt unlesbar. */
            ...knopfUmriss, ...basis,
            ...(stand === "ok" || stand === "sendet"
              ? { color: LEISE, borderColor: KANTE, cursor: "default" }
              : {}),
          }}>
          {stand === "ok" ? "Angefragt" : stand === "sendet" ? "Sendet …" : "+ Freund"}
        </button>
      </div>
      {/* Die Meldung stand in Off-White — noch ein Rest aus der dunklen
          Profilseite; auf Weiss war sie unlesbar. */}
      {meldung && (
        <div style={{
          fontFamily: INTER, fontSize: 13, marginTop: 12,
          color: stand === "fehler" ? "#B3261E" : TEXT,
        }}>{meldung}</div>
      )}
    </div>
  )
}
