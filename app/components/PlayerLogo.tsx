"use client"

interface PlayerLogoProps {
  width?: string
  showTagline?: boolean
}

export default function PlayerLogo({ width = "220px", showTagline = false }: PlayerLogoProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
        {/* P-Paddle + Ball — SVG */}
        <svg
          viewBox="0 0 70 78"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ height: "52px", width: "auto", flexShrink: 0 }}
        >
          {/* P-Paddle solid */}
          <path
            d="M6 72L6 8L32 8C47 8 56 18 56 36C56 54 47 64 32 64L20 64L20 72Z"
            fill="#39FF14"
          />
          {/* Ball */}
          <circle cx="64" cy="68" r="7" fill="#39FF14" />
        </svg>

        {/* PLAYER — Outline Text via CSS */}
        <span
          style={{
            fontSize: "52px",
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "'League Spartan', system-ui, sans-serif",
            letterSpacing: "1px",
            color: "transparent",
            WebkitTextStroke: "2px #39FF14",
            textTransform: "uppercase",
            userSelect: "none",
            paddingBottom: "4px",
          }}
        >
          PLAYER
        </span>
      </div>

      {showTagline && (
        <p style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#7B7E8A",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          by Ping Pong Lounge
        </p>
      )}
    </div>
  )
}
