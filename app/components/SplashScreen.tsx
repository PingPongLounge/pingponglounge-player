"use client"
import { useEffect, useState } from "react"

const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const gt: React.CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
}

const PLAYER_LETTERS = ["P", "L", "A", "Y", "E", "R"]

export default function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show")
  const [showBall, setShowBall] = useState(false)
  const [letterIndex, setLetterIndex] = useState(0)

  useEffect(() => {
    // Sequenz: Paddle zeichnen → Ball → Buchstaben. Keine Tagline —
    // "Next Level Table Tennis" steht auf der Startseite, hier braucht es sie nicht.
    const t1 = setTimeout(() => setShowBall(true), 260)

    // Buchstaben nach und nach einblenden
    const letterTimers: ReturnType<typeof setTimeout>[] = []
    PLAYER_LETTERS.forEach((_, i) => {
      letterTimers.push(setTimeout(() => setLetterIndex(i + 1), 400 + i * 45))
    })

    const dismiss = () => {
      setTimeout(() => setPhase("fade"), 100)
      setTimeout(() => setPhase("done"), 700)
    }

    // Der Splash hielt die App 2,2 Sekunden künstlich fest — auch wenn längst
    // alles geladen war. Das fühlte sich an, als würde die Seite ewig laden.
    // Ist die Seite schon fertig, verschwindet er praktisch sofort.
    if (document.readyState === "complete") {
      const minTimer = setTimeout(dismiss, 350)
      return () => { clearTimeout(t1); clearTimeout(minTimer); letterTimers.forEach(clearTimeout) }
    }

    let loaded = false
    let minDone = false
    const tryDismiss = () => { if (loaded && minDone) dismiss() }

    const onLoad = () => { loaded = true; tryDismiss() }
    window.addEventListener("load", onLoad)
    const minTimer = setTimeout(() => { minDone = true; tryDismiss() }, 900)

    return () => {
      clearTimeout(t1); clearTimeout(minTimer)
      letterTimers.forEach(clearTimeout)
      window.removeEventListener("load", onLoad)
    }
  }, [])

  if (phase === "done") return null

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
        transition: "opacity 0.6s ease",
        pointerEvents: "none",
      }}
    >
      {/* Logo SVG */}
      <div style={{ position: "relative", width: 200, height: 200 }}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 80 80"
          fill="none"
        >
          <defs>
            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#39FF14" />
              <stop offset="100%" stopColor="#1FD1C4" />
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
      `}</style>
    </div>
  )
}
