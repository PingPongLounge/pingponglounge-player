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
          <filter id="pGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="ballGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* P Basis — dunkel/dim */}
        <path
          d="M 20 62 L 20 10 L 44 10 C 58 10 66 19 66 30 C 66 41 58 50 44 50 L 20 50"
          stroke="#1a2e1a"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Licht das das P entlangwandert */}
        <path
          d="M 20 62 L 20 10 L 44 10 C 58 10 66 19 66 30 C 66 41 58 50 44 50 L 20 50"
          stroke="#39FF14"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="14 86"
          filter="url(#pGlow)"
        >
          {/* Licht bewegt sich entlang dem P */}
          <animate
            attributeName="stroke-dashoffset"
            values="114;0;0"
            keyTimes="0;0.72;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
          {/* Farbwechsel Grün → Türkis während es wandert */}
          <animate
            attributeName="stroke"
            values="#39FF14;#39FF14;#00E5FF;#39FF14;#39FF14"
            keyTimes="0;0.3;0.6;0.72;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </path>

        {/* Ball — leuchtet am Ende jedes Zyklus auf */}
        <circle cx="63" cy="58" r="5.5" fill="#39FF14">
          <animate
            attributeName="opacity"
            values="0.25;0.25;0.25;1;1;0.25"
            keyTimes="0;0.6;0.72;0.82;0.92;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="5.5;5.5;5.5;8.5;8.5;5.5"
            keyTimes="0;0.6;0.72;0.82;0.92;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fill"
            values="#39FF14;#39FF14;#39FF14;#00E5FF;#39FF14;#39FF14"
            keyTimes="0;0.6;0.72;0.82;0.92;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Ball Glow-Ring beim Aufleuchten */}
        <circle cx="63" cy="58" r="5.5" fill="none" stroke="#39FF14" strokeWidth="2" filter="url(#ballGlow)">
          <animate
            attributeName="opacity"
            values="0;0;0;0.8;0;0"
            keyTimes="0;0.72;0.76;0.85;0.95;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="5.5;5.5;5.5;12;14;5.5"
            keyTimes="0;0.72;0.76;0.85;0.95;1"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* PLAYER — weiss */}
      <span style={{
        fontSize: textSize,
        fontWeight: 900,
        letterSpacing: "3px",
        textTransform: "uppercase" as const,
        lineHeight: 1,
        fontFamily: "'League Spartan', system-ui, sans-serif",
        userSelect: "none" as const,
        color: "#FFFFFF",
      }}>
        PLAYER
      </span>

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
