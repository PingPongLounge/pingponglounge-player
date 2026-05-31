"use client"

interface PlayerLogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
}

export default function PlayerLogo({ size = "md", showTagline = false }: PlayerLogoProps) {
  const iconSize = size === "sm" ? 48 : size === "lg" ? 80 : 64
  const textSize = size === "sm" ? "28px" : size === "lg" ? "48px" : "38px"
  const tagSize  = size === "sm" ? "9px"  : size === "lg" ? "13px" : "11px"
  const G = "#FFF9F3"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>

      {/* P-Mark Icon — outline P + solid dot */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 56 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* P shape — single path, stroke only */}
        <path
          d="M13 66 L13 8 L30 8 C45 8 50 16 50 26 C50 36 45 44 30 44 L13 44"
          stroke={G}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Dot */}
        <circle cx="50" cy="64" r="7" fill={G} />
      </svg>

      {/* PLAYER — solid bold */}
      <span style={{
        fontSize: textSize,
        fontWeight: 900,
        color: G,
        letterSpacing: "3px",
        textTransform: "uppercase",
        lineHeight: 1,
        fontFamily: "'League Spartan', system-ui, sans-serif",
        userSelect: "none",
      }}>
        PLAYER
      </span>

      {/* Tagline */}
      {showTagline && (
        <span style={{
          fontSize: tagSize,
          fontWeight: 700,
          color: "#7B7E8A",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          by Ping Pong Lounge
        </span>
      )}
    </div>
  )
}
