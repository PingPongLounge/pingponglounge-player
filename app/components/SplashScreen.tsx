"use client"
import { useEffect, useState } from "react"

// Nur noch PPL-Pink — Gruen und Tuerkis sind aus der Player-App raus.
const GRAD = "linear-gradient(135deg,#FF00C8,#FF5CDC)"
const gt: React.CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
}

const PLAYER_LETTERS = ["P", "L", "A", "Y", "E", "R"]

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
          viewBox="0 0 80 80"
          fill="none"
        >
          <defs>
            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF00C8" />
              <stop offset="100%" stopColor="#FF5CDC" />
            </linearGradient>
          </defs>

          {/* Das P sitzt mittig (Ball hängt rechts raus) */}
          <g transform="translate(-2,0)">
            {/* P-Paddle: stroke draw-in — nie ausgefüllt */}
            <path
              d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z"
              fill="none"
              stroke="url(#sg)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeDasharray="280"
              strokeDashoffset="0"
              style={{ animation: "drawPath 0.7s cubic-bezier(0.4,0,0.2,1) forwards" }}
            />

            {/* Ball: fällt von oben, bounced */}
            {showBall && (
              <circle
                cx="63"
                cy="58"
                r="6"
                fill="url(#sg)"
                style={{ animation: "ballBounce 0.55s cubic-bezier(0.22,0.61,0.36,1) forwards" }}
              />
            )}
          </g>
        </svg>

        {/* Der pulsierende Glow-Ring um das Logo ist raus — er zeichnete einen
            Kreis, der im Logo nichts zu suchen hat. */}
      </div>

      {/* PLAYER Buchstaben */}
      <div style={{
        display: "flex",
        gap: 5,
        height: 44,
        alignItems: "center",
      }}>
        {PLAYER_LETTERS.map((l, i) => (
          <span
            key={l}
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: ".18em",
              fontFamily: "system-ui, sans-serif",
              ...gt,
              opacity: i < letterIndex ? 1 : 0,
              transform: i < letterIndex ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.2s ease, transform 0.25s ease",
              display: "inline-block",
            }}
          >
            {l}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes drawPath {
          from { stroke-dashoffset: 280; opacity: 0.3; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes ballBounce {
          0%   { transform: translateY(-44px); opacity: 0; }
          55%  { transform: translateY(5px);  opacity: 1; }
          75%  { transform: translateY(-10px); }
          90%  { transform: translateY(3px); }
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
