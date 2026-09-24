"use client"
/* PLAYER · SPIELEN — der Einstieg ohne Konto (zwei Schritte).

   24.09.2026: auf das Design-System V3 gezogen. Derselbe Kopf wie die
   Startseite, dieselbe Anton-Zeile, dieselben Karten, Felder und Knoepfe.
   Weg sind der Leuchtring um die Rating-Zahl, die Level-Farben und das
   Gold der PingPoints — das System kennt Schwarz, Weiss, Neutralgrau und
   EIN Gruen als Signal.

   Die Logik ist unveraendert: dieselbe Satz-Validierung, dieselbe
   provisorische ELO, derselbe /api/spielen/preview-Aufruf, dasselbe
   localStorage-Paket und dieselben Weiterleitungen. */
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import PlayerKopf from "@/app/components/PlayerKopf"
import { ratingLabel } from "@/app/theme"
import { INTER, TEXT, LEISE, BG, AKZENT, knopf } from "@/app/design"

// Level 1–7 wie im Rest der App. Hier standen noch die abgeschafften Namen
// Rookie/Challenger/Advanced/Elite — der Neuling bekam ein Level angezeigt,
// das es gar nicht mehr gibt (und wegen der festen Start-ELO immer dasselbe).
const LEVELS = [
  { name: "1", elo: 950 },
  { name: "2", elo: 1050 },
  { name: "3", elo: 1150 },
  { name: "4", elo: 1250 },
  { name: "5", elo: 1350 },
  { name: "6", elo: 1450 },
  { name: "7", elo: 1600 },
]

// Nächstkleineres Level zu einer ELO (gleiche Idee wie calcLevel im Onboarding)
function levelForElo(elo: number) {
  let chosen = LEVELS[0]
  for (const l of LEVELS) if (elo >= l.elo) chosen = l
  return chosen
}

type SetScore = { you: string; opp: string }

function SpielenInner() {
  const router = useRouter()
  const search = useSearchParams()
  const ort = search.get("ort") || ""

  const [screen, setScreen] = useState<"A" | "B">("A")
  const [sets, setSets] = useState<SetScore[]>([{ you: "", opp: "" }, { you: "", opp: "" }, { you: "", opp: "" }])
  const [error, setError] = useState("")

  // Ergebnis nach Validierung
  const [won, setWon] = useState(false)
  const [provisionalElo, setProvisionalElo] = useState(1000)

  // Rang-Vorschau
  const [rank, setRank] = useState<number | null>(null)
  const [rankLoading, setRankLoading] = useState(false)

  function addSet() { setSets(s => s.length < 5 ? [...s, { you: "", opp: "" }] : s) }
  function removeSet(i: number) { setSets(s => s.filter((_, j) => j !== i)) }
  function updateSet(i: number, side: "you" | "opp", val: string) {
    // nur Zahlen 0-30 zulassen
    if (val !== "") {
      const n = parseInt(val, 10)
      if (Number.isNaN(n) || n < 0 || n > 30) return
    }
    setSets(s => s.map((x, j) => j === i ? { ...x, [side]: val } : x))
  }

  // Validierung: mind. 1 vollständiger Satz, Gewinner aus gewonnenen Sätzen.
  function validate(): { valid: boolean; won: boolean } {
    const parsed = sets
      .map(s => ({ you: parseInt(s.you, 10), opp: parseInt(s.opp, 10) }))
      .filter(s => Number.isFinite(s.you) && Number.isFinite(s.opp) && !Number.isNaN(s.you) && !Number.isNaN(s.opp))
    if (parsed.length < 1) return { valid: false, won: false }
    const youWins = parsed.filter(s => s.you > s.opp).length
    const oppWins = parsed.filter(s => s.opp > s.you).length
    return { valid: true, won: youWins > oppWins }
  }

  async function goToResult() {
    const { valid, won: didWin } = validate()
    if (!valid) { setError("Trag mindestens einen vollständigen Satz ein (Zahlen 0–30).") ; return }
    setError("")
    const elo = 1000 + (didWin ? 15 : 0)
    setWon(didWin)
    setProvisionalElo(elo)
    setScreen("B")
    // Rang best-effort laden
    setRankLoading(true)
    setRank(null)
    try {
      const res = await fetch(`/api/spielen/preview?elo=${elo}`)
      if (res.ok) {
        const d = await res.json()
        setRank(typeof d.rank === "number" ? d.rank : null)
      }
    } catch { /* ignore — Rang bleibt null */ }
    finally { setRankLoading(false) }
  }

  function saveProfile() {
    const parsed = sets
      .map(s => ({ you: parseInt(s.you, 10), opp: parseInt(s.opp, 10) }))
      .filter(s => !Number.isNaN(s.you) && !Number.isNaN(s.opp))
    try {
      localStorage.setItem("ppl_pending_result", JSON.stringify({
        elo: provisionalElo, won, sets: parsed, ort, ts: Date.now(),
      }))
    } catch { /* localStorage evtl. nicht verfügbar — egal, Flow läuft trotzdem */ }
    router.push("/login?next=/onboarding")
  }

  const level = levelForElo(provisionalElo)

  // ── Screen A: Gerade gespielt? ────────────────────────────────
  if (screen === "A") return (
    <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>
      <header className="p-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ppl-liga.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
        <div aria-hidden className="p-hero-schleier" />
        <PlayerKopf navigation={false} />
        <div className="p-spalte p-hero-inhalt">
          <h1 className="p-h1">Resultat</h1>
          <p className="p-eyebrow">
            {ort ? <>Dein Ergebnis aus {ort}</> : <>Trag dein Ergebnis<br />Satz für Satz ein.</>}
          </p>
        </div>
      </header>

      <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34, maxWidth: 560 }}>
        <section className="p-karte">
          <div className="p-kopf">
            <h2>Sätze</h2>
            <span className="p-mehr">Du · Gegner</span>
          </div>

          <div style={{ padding: 18 }}>
            {sets.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="p-label" style={{ width: 52, flexShrink: 0 }}>Satz {i + 1}</span>
                <input value={s.you} onChange={e => updateSet(i, "you", e.target.value)} placeholder="11"
                  className="p-feld zahl" type="number" inputMode="numeric" min={0} max={30} aria-label={`Satz ${i + 1}, deine Punkte`} />
                <span style={{ color: LEISE, fontSize: 15, flexShrink: 0 }}>:</span>
                <input value={s.opp} onChange={e => updateSet(i, "opp", e.target.value)} placeholder="8"
                  className="p-feld zahl" type="number" inputMode="numeric" min={0} max={30} aria-label={`Satz ${i + 1}, Punkte des Gegners`} />
                {i >= 3 && (
                  <button type="button" onClick={() => removeSet(i)} aria-label={`Satz ${i + 1} entfernen`}
                    style={{ flexShrink: 0, width: 32, height: 32, color: LEISE, fontSize: 18, cursor: "pointer" }}>×</button>
                )}
              </div>
            ))}

            {sets.length < 5 && (
              <button type="button" onClick={addSet} className="p-textlink" style={{ marginTop: 6 }}>
                + Satz hinzufügen
              </button>
            )}

            {error && <p className="p-fehler">{error}</p>}
          </div>
        </section>

        <div className="p-abschnitt">
          <button type="button" onClick={goToResult} style={{ ...knopf, width: "100%" }}>Resultat ansehen →</button>
          <button type="button" onClick={() => router.push("/login")} className="p-textlink">
            Ich will mich nur anmelden
          </button>
        </div>
      </div>
    </main>
  )

  // ── Screen B: Du bist jetzt Spieler (Aha) ─────────────────────
  return (
    <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>
      <header className="p-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ppl-liga.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
        <div aria-hidden className="p-hero-schleier" />
        <PlayerKopf navigation={false} />
        <div className="p-spalte p-hero-inhalt">
          <h1 className="p-h1">{ratingLabel(provisionalElo)}</h1>
          <p className="p-eyebrow">Dein Rating.<br />Du bist jetzt Spieler.</p>

          <div className="p-streifen">
            <div>
              <span className="zahl">{level.name}</span>
              <span className="was">Level</span>
            </div>
            <div>
              <span className="zahl">{rankLoading ? "…" : rank !== null ? `#${rank}` : "—"}</span>
              <span className="was">Start-Rang</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34, maxWidth: 560 }}>
        <section className="p-karte">
          <div className="p-kopf"><h2>Was jetzt passiert</h2></div>
          <div style={{ padding: 18 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: TEXT }}>
              {won
                ? "Sieg eingetragen — dein Rating bekommt einen Bonus."
                : "Resultat eingetragen. Sicher dir jetzt deinen Rang."}
            </p>
            {rank === null && !rankLoading && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: LEISE, lineHeight: 1.5 }}>
                Dein Rang wird nach dem Sichern berechnet.
              </p>
            )}
            <p style={{ margin: "14px 0 0", fontSize: 13, color: LEISE }}>
              <b style={{ color: AKZENT, fontWeight: 600 }}>+10 PingPoints</b> nach dem Sichern
            </p>
          </div>
        </section>

        <div className="p-abschnitt">
          <button type="button" onClick={saveProfile} style={{ ...knopf, width: "100%" }}>Profil sichern →</button>
          <button type="button" onClick={() => router.push("/login")} className="p-textlink">Später</button>
        </div>
      </div>
    </main>
  )
}

export default function SpielenPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: BG }} />}>
      <SpielenInner />
    </Suspense>
  )
}
