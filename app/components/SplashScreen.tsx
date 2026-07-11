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
  const [showText, setShowText] = useState(false)
  const [showTagline, setShowTagline] = useState(false)
  const [letterIndex, setLetterIndex] = useState(0)

  useEffect(() => {
    // Sequenz: Paddle zeichnen → Ball → Buchstaben → Tagline
    const t1 = setTimeout(() => setShowBall(true), 450)
    const t2 = setTimeout(() => setShowText(true), 700)
    const t3 = setTimeout(() => setShowTagline(true), 1300)

    // Buchstaben nach und nach einblenden
    const letterTimers: ReturnType<typeof setTimeout>[] = []
    PLAYER_LETTERS.forEach((_, i) => {
      letterTimers.push(setTimeout(() => setLetterIndex(i + 1), 750 + i * 80))
    })

    const dismiss = () => {
      setTimeout(() => setPhase("fade"), 100)
      setTimeout(() => setPhase("done"), 700)
    }

    if (document.readyState === "complete") {
      const minTimer = setTimeout(dismiss, 2200)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(minTimer); letterTimers.forEach(clearTimeout) }
    }

    let loaded = false
    let minDone = false
    const tryDismiss = () => { if (loaded && minDone) dismiss() }

    const onLoad = () => { loaded = true; tryDismiss() }
    window.addEventListener("load", onLoad)
    const minTimer = setTimeout(() => { minDone = true; tryDismiss() }, 2200)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(minTimer)
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
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 80 80"
          fill="none"
          style={{ filter: "drop-shadow(0 0 10px #39FF1466)" }}
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

        {/* Glow pulse nach Zeichnen */}
        {showBall && (
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            animation: "glowRing 1.5s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* PLAYER Buchstaben */}
      <div style={{
        display: "flex",
        gap: 3,
        height: 28,
        alignItems: "center",
      }}>
        {PLAYER_LETTERS.map((l, i) => (
          <span
            key={l}
            style={{
              fontSize: 20,
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

      {/* Tagline */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          fontFamily: "system-ui, sans-serif",
          opacity: showTagline ? 1 : 0,
          transform: showTagline ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          marginTop: 2,
        }}
      >
        Next Level Table Tennis
      </span>

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
        @keyframes glowRing {
          0%, 100% { box-shadow: 0 0 0px 0px #39FF1400; }
          50%       { box-shadow: 0 0 18px 4px #39FF1440; }
        }
      `}</style>
    </div>
  )
}
