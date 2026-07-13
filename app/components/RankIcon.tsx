"use client"

// Die sieben Ränge — Winkel für Level 1–3, Bogen dazu ab 4, Stern bei 6,
// Krone bei 7. Inline und nicht als <img>, weil "currentColor" in einem
// per <img> geladenen SVG schwarz wird: die Farbe muss von aussen kommen.
const PATHS: Record<number, React.ReactNode> = {
  1: <path d="M26 52 L64 76 L102 52" />,
  2: <>
    <path d="M26 42 L64 66 L102 42" />
    <path d="M26 68 L64 92 L102 68" />
  </>,
  3: <>
    <path d="M26 30 L64 54 L102 30" />
    <path d="M26 56 L64 80 L102 56" />
    <path d="M26 82 L64 106 L102 82" />
  </>,
  4: <>
    <path d="M30 28 Q64 46 98 28" />
    <path d="M26 50 L64 74 L102 50" />
    <path d="M26 76 L64 100 L102 76" />
  </>,
  5: <>
    <path d="M30 22 Q64 40 98 22" />
    <path d="M30 38 Q64 56 98 38" />
    <path d="M26 58 L64 82 L102 58" />
    <path d="M26 84 L64 108 L102 84" />
  </>,
  6: <>
    <path d="M 64,20 L 67.2,27.6 L 75.4,28.3 L 69.2,33.7 L 71.1,41.7 L 64,37.5 L 56.9,41.7 L 58.8,33.7 L 52.6,28.3 L 60.8,27.6 Z" fill="currentColor" stroke="none" />
    <path d="M26 54 L64 78 L102 54" />
    <path d="M26 80 L64 104 L102 80" />
  </>,
  7: <>
    <path d="M28 82 L24 42 L44 58 L64 30 L84 58 L104 42 L100 82 Z" />
    <path d="M30 82 H98" />
    <path d="M34 94 H94" />
    <path d="M38 82 V94" />
    <path d="M90 82 V94" />
    <circle cx="24" cy="42" r="4" fill="currentColor" stroke="none" />
    <circle cx="64" cy="30" r="4" fill="currentColor" stroke="none" />
    <circle cx="104" cy="42" r="4" fill="currentColor" stroke="none" />
  </>,
}

export const RANK_NAMES: Record<number, string> = {
  1: "Rookie I", 2: "Rookie II", 3: "Challenger I",
  4: "Challenger II", 5: "Advanced I", 6: "Advanced II", 7: "Elite",
}

export default function RankIcon({
  level, size = 20, color = "currentColor", style,
}: {
  level: string | number | null | undefined
  size?: number
  color?: string
  style?: React.CSSProperties
}) {
  const l = typeof level === "string" ? parseInt(level) : level
  if (!l || !PATHS[l]) return null
  return (
    <svg
      viewBox="0 0 128 128" width={size} height={size}
      fill="none" stroke={color} strokeWidth="7"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ color, flexShrink: 0, ...style }}
      aria-label={`Level ${l}`}
    >
      {PATHS[l]}
    </svg>
  )
}
