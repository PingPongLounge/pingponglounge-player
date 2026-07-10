"use client"
import { useEffect, useState } from "react"

const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const gt: React.CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
}

export default function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show")
  const [showTagline, setShowTagline] = useState(false)

  useEffect(() => {
    // Tagline nach 2s einblenden
    const t0 = setTimeout(() => setShowTagline(true), 2000)
    // Nach 3.2s ausblenden
    const t1 = setTimeout(() => setPhase("fade"), 3200)
    // Nach weiteren 500ms entfernen
    const t2 = setTimeout(() => setPhase("done"), 3700)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === "done") return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#20242C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
      }}
    >
      {/* P-Paddle Logo */}
      <div style={{ animation: "splashPulse 1.8s ease-in-out infinite" }}>
        <svg width="120" height="120" viewBox="0 0 80 80" fill="none">
          <defs>
            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#39FF14" />
              <stop offset="100%" stopColor="#1FD1C4" />
            </linearGradient>
          </defs>
          <path
            d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z"
            fill="none"
            stroke="url(#sg)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="63" cy="58" r="6" fill="url(#sg)" />
        </svg>
      </div>

      {/* PLAYER Text */}
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: ".3em",
          fontFamily: "system-ui, sans-serif",
          ...gt,
        }}
      >
        PLAYER
      </span>

      {/* Tagline — erscheint nach 2s */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          fontFamily: "system-ui, sans-serif",
          opacity: showTagline ? 1 : 0,
          transition: "opacity 0.6s ease",
          marginTop: 4,
        }}
      >
        Table Tennis Next Level
      </span>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.07); opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
