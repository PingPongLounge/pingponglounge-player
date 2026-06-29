"use client"

interface PlayerLogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
}

export default function PlayerLogo({ size = "md", showTagline = false }: PlayerLogoProps) {
  const iconSize = size === "sm" ? 44 : size === "lg" ? 120 : 72
  const textSize = size === "sm" ? "16px" : size === "lg" ? "32px" : "22px"
  const tagSize  = size === "sm" ? "8px"  : size === "lg" ? "11px" : "10px"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>

      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            {/* Gradient verschiebt sich sehr langsam */}
            <stop offset="0%" stopColor="#39FF14">
              <animate
                attributeName="stop-color"
                values="#39FF14;#1FD1C4;#39FF14"
                dur="8s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#1FD1C4">
              <animate
                attributeName="stop-color"
                values="#1FD1C4;#39FF14;#1FD1C4"
                dur="8s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <filter id="ballGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* P-Form — exakt wie bestätigt */}
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

        {/* Ball — leuchtet kurz nach 5s sehr subtil auf */}
        <circle cx="63" cy="58" r="6" fill="url(#logoGrad)" />
        <circle cx="63" cy="58" r="6" fill="#39FF14" filter="url(#ballGlow)" opacity="0">
          <animate
            attributeName="opacity"
            values="0;0;0;0;0;0;0.5;0.2;0"
            keyTimes="0;0.55;0.62;0.68;0.72;0.78;0.85;0.93;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="6;6;6;6;6;6;9;7;6"
            keyTimes="0;0.55;0.62;0.68;0.72;0.78;0.85;0.93;1"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* PLAYER — Gradient wie im bestätigten Logo */}
      <span style={{
        fontSize: textSize,
        fontWeight: 900,
        letterSpacing: "3px",
        textTransform: "uppercase" as const,
        lineHeight: 1,
        fontFamily: "'League Spartan', system-ui, sans-serif",
        userSelect: "none" as const,
        background: "linear-gradient(135deg, #39FF14 0%, #1FD1C4 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        PLAYER
      </span>

      {showTagline && (
        <span style={{
          fontSize: tagSize,
          fontWeight: 700,
          color: "rgba(255,255,255,0.66)",
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
        }}>
          next level Table Tennis
        </span>
      )}
    </div>
  )
}
