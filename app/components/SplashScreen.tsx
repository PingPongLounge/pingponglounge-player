"use client"
import { useEffect, useState } from "react"

// 30.09.2026: Splash zeigt jetzt das echte Logo aus public/logo/ statt
// einer nachgezeichneten Fassung. Der Verlauf steckt in den Dateien.
const PLAYER_LETTERS = ["P", "L", "A", "Y", "E", "R"]
/** Breite der Wortmarke im Splash. */
const WORT_BREIT = 260

export default function SplashScreen() {
  // Startet ausgeschaltet: wer die App in dieser Sitzung schon geoeffnet hat,
  // sieht gar nichts mehr — kein Aufblitzen, kein Warten.
  const [phase, setPhase] = useState<"aus" | "show" | "fade" | "done">("aus")
  const [showBall, setShowBall] = useState(false)
  const [letterIndex, setLetterIndex] = useState(0)

  useEffect(() => {
    // Einmal pro Sitzung, und nur wenn Bewegung erwuenscht ist.
    let wenigerBewegung = false
    try { wenigerBewegung = window.matchMedia("(prefers-reduced-motion: reduce)").matches } catch { }
    let schonGesehen = false
    try { schonGesehen = sessionStorage.getItem("ppl_splash") === "1" } catch { }
    if (wenigerBewegung || schonGesehen) { setPhase("done"); return }
    try { sessionStorage.setItem("ppl_splash", "1") } catch { }
    setPhase("show")

    // Die Sequenz laeuft jetzt in gut einer halben Sekunde durch.
    const t1 = setTimeout(() => setShowBall(true), 140)
    const letterTimers: ReturnType<typeof setTimeout>[] = []
    PLAYER_LETTERS.forEach((_, i) => {
      letterTimers.push(setTimeout(() => setLetterIndex(i + 1), 200 + i * 30))
    })

    // Hoechstens 700 ms stehen, dann ausblenden — unabhaengig davon, ob die
    // Seite fertig geladen ist. Der Rest laedt sichtbar weiter.
    const raus = setTimeout(() => {
      setPhase("fade")
      setTimeout(() => setPhase("done"), 260)
    }, 700)

    return () => {
      clearTimeout(t1); clearTimeout(raus)
      letterTimers.forEach(clearTimeout)
    }
  }, [])

  if (phase === "aus" || phase === "done") return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0D1017",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 0.25s ease",
        pointerEvents: "none",
      }}
    >
      {/* Logo SVG — nach dem Aufbau ein sanftes, langsames "Atmen" */}
      <div style={{ position: "relative", width: 200, height: 200, animation: "logoBreathe 2.6s ease-in-out 1s infinite" }}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 2159 2356"
          fill="none"
        >
          <defs>
            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8BFEA1" />
              <stop offset="100%" stopColor="#1BFCC2" />
            </linearGradient>
          </defs>

          {/* 30.09.2026: vorher ein nachgezeichneter P-Pfad mit stroke-draw-in.
              Das war nicht das Logo, sondern eine Annaeherung daran. Jetzt das
              Original aus public/logo/. Ein Bitmap laesst sich nicht "zeichnen",
              deshalb blendet das P auf statt sich zu zeichnen — der Ball faellt
              weiterhin. */}
          <image
            href="/logo/symbol-nur-p-verlauf.svg"
            x="0" y="0" width="1971" height="2243"
            style={{ animation: "logoErscheint 0.7s cubic-bezier(0.4,0,0.2,1) forwards" }}
          />

          {/* Ball: fällt von oben, bounced */}
          {showBall && (
            <circle
              cx="1895.5"
              cy="2092.5"
              r="263.5"
              fill="url(#sg)"
              style={{ animation: "ballBounce 0.55s cubic-bezier(0.22,0.61,0.36,1) forwards" }}
            />
          )}
        </svg>

        {/* Der pulsierende Glow-Ring um das Logo ist raus — er zeichnete einen
            Kreis, der im Logo nichts zu suchen hat. */}
      </div>

      {/* PLAYER Wortmarke — 30.09.2026: vorher die sechs Buchstaben einzeln
          in Inter 900 mit Verlaufsfuellung. Das ist nicht die Wortmarke:
          die steht in League Spartan ExtraBold mit 0.114 em Laufweite und
          traegt den Verlauf pro Buchstabe. Jetzt das Original aus
          public/logo/, das sich von links nach rechts aufbaut — derselbe
          Rhythmus, dieselbe Zustandslogik (letterIndex), richtige Form. */}
      <div style={{ height: 44, width: WORT_BREIT, display: "flex", alignItems: "center" }}>
        <div style={{
          width: Math.round((letterIndex / PLAYER_LETTERS.length) * WORT_BREIT),
          overflow: "hidden",
          transition: "width 0.22s ease",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/wortmarke-verlauf.svg"
            alt="PLAYER"
            width={WORT_BREIT}
            height={Math.round(WORT_BREIT * 474 / 2833)}
            style={{ display: "block", width: WORT_BREIT, maxWidth: "none", height: "auto" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes logoErscheint {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes ballBounce {
          0%   { transform: translateY(-1190px); opacity: 0; }
          55%  { transform: translateY(135px);  opacity: 1; }
          75%  { transform: translateY(-270px); }
          90%  { transform: translateY(81px); }
          100% { transform: translateY(0); }
        }
        @keyframes logoBreathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
