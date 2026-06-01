"use client"

interface PlayerLogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
}

export default function PlayerLogo({ size = "md", showTagline = false }: PlayerLogoProps) {
  const iconSize = size === "sm" ? 44  : size === "lg" ? 120 : 72
  const textSize = size === "sm" ? "16px" : size === "lg" ? "32px" : "22px"
  const tagSize  = size === "sm" ? "8px"  : size === "lg" ? "11px" : "10px"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>

      {/* P-Mark Icon — exakter Pfad aus Mockup + Gradient */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            
      <style>{`
        @keyframes gradShift {
          0%   { stop-color: #39FF14; }
          50%  { stop-color: #00E5FF; }
          100% { stop-color: #39FF14; }
        }
        @keyframes gradShift2 {
          0%   { stop-color: #00E5FF; }
          50%  { stop-color: #39FF14; }
          100% { stop-color: #00E5FF; }
        }
        @keyframes ballPulse {
          0%, 100% { r: 6; opacity: 1; }
          50%       { r: 7.5; opacity: 0.7; }
        }
        @keyframes textGrad {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
        <stop offset="0%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>
        </defs>

        {/* P-Form */}
        <path
          d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z"
          fill="none"
          stroke="url(#logoGrad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Innere Trennlinie */}
        <path
          d="M 36 10 L 36 50"
          stroke="url(#logoGrad)"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        {/* Punkt */}
        <circle cx="63" cy="58" r="6" fill="url(#logoGrad)"><animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite"/></circle>
      </svg>

      {/* PLAYER — Gradient Text */}
      <span style={{
        fontSize: textSize,
        fontWeight: 900,
        letterSpacing: "3px",
        textTransform: "uppercase" as const,
        lineHeight: 1,
        fontFamily: "'League Spartan', system-ui, sans-serif",
        userSelect: "none" as const,
        background: "linear-gradient(270deg, #39FF14, #00E5FF, #39FF14)",
        backgroundSize: "200% 200%",
        animation: "textGrad 3s ease infinite",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        PLAYER
      </span>

      {/* Tagline */}
      {showTagline && (
        <span style={{
          fontSize: tagSize,
          fontWeight: 700,
          color: "#6B6E7A",
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
        }}>
          next level Table Tennis
        </span>
      )}
    </div>
  )
}
