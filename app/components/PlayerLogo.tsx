"use client"

/* PLAYER · Logo-Lockup — die EINZIGE Stelle, an der das Logo gezeichnet wird.
   Wer ein Logo braucht, importiert diese Komponente. Kein zweites SVG
   irgendwo im Repo (23.09.2026: /entdecken hatte eine eigene Kopie).

   Aufbau von oben nach unten: das P als Zeichen, darunter die Wortmarke
   PLAYER, darunter klein die Zeile "Die Ping Pong Liga der Schweiz."

   Kein Glow, keine Animation. Ein Logo, das blinkt, sieht aus wie ein
   Ladezustand — und auf /entdecken steht es ueber dem ersten Bildschirm,
   wo nichts flackern darf.

   ton="dunkel"  Logo auf schwarzem Grund (BG)      → Marken-Gruen  #39FF14
   ton="hell"    Logo auf Off-White (/entdecken)    → Tief-Gruen    #0B7A33
   Das Marken-Gruen erreicht auf Off-White nur 1,26:1 und waere dort
   praktisch unsichtbar; deshalb die zweite Wertepaarung. Beide Verlaeufe
   liegen ueber 3:1 gegen ihren Grund (Norm fuer grafische Elemente). */

import { GREEN, CYAN, AKZENT_TIEF, ANTON } from "@/app/theme"

type Ton = "dunkel" | "hell"

interface PlayerLogoProps {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
  ton?: Ton
}

/* Zweiter, hellerer Endpunkt des Verlaufs auf hellem Grund.
   #149B47 gegen #F7F5EF = 3,3:1 — gerade sicher ueber der Norm. */
const HELL_ENDE = "#149B47"

export default function PlayerLogo({
  size = "md",
  showTagline = false,
  ton = "dunkel",
}: PlayerLogoProps) {
  // 23.09.2026: lg etwas groesser (120→128 / 32→38px). Der Kopf auf
  // /entdecken ist kompakter geworden — damit das Logo dort nicht mit
  // schrumpft, traegt es jetzt mehr. md (Login) bleibt unveraendert.
  const iconSize = size === "sm" ? 44 : size === "lg" ? 128 : 72
  const textSize = size === "sm" ? "16px" : size === "lg" ? "38px" : "22px"
  const tagSize  = size === "sm" ? "8px"  : size === "lg" ? "11px" : "10px"

  const hell = ton === "hell"
  const von  = hell ? AKZENT_TIEF : GREEN
  const bis  = hell ? HELL_ENDE   : CYAN
  const verlauf = `linear-gradient(135deg, ${von} 0%, ${bis} 100%)`
  // Eine ID pro Ton, damit zwei Logos mit verschiedenen Toenen auf einer
  // Seite sich nicht gegenseitig den Verlauf ueberschreiben.
  const gradId = `playerLogoGrad-${ton}`

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>

      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 80 80"
        fill="none"
        role="img"
        aria-label="PLAYER"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={von} />
            <stop offset="100%" stopColor={bis} />
          </linearGradient>
        </defs>

        {/* Das P ist auf die Mitte ausgerichtet (der Ball haengt rechts raus) —
            P spannt x 20..64, Mitte 42 → Verschiebung um -2 zentriert es exakt. */}
        <g transform="translate(-2,0)">
          {/* P-Form — IMMER nur Outline, nie ausgefuellt */}
          <path
            d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Innere Trennlinie */}
          <path
            d="M 36 10 L 36 50"
            stroke={`url(#${gradId})`}
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          {/* Ball */}
          <circle cx="63" cy="58" r="6" fill={`url(#${gradId})`} />
        </g>
      </svg>

      {/* Wortmarke + Tagline. Bis 12.09. war die Tagline einzeilig und per
          justify exakt auf die Breite von "PLAYER" gezogen. Die Positionierung
          "Die Ping Pong Liga der Schweiz." ist zweizeilig — justify haette die
          zweite Zeile auseinandergerissen ("DER        SCHWEIZ."). Deshalb
          jetzt zentriert unter der Wortmarke. */}

      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "stretch" }}>
        <span style={{
          fontSize: textSize,
          fontWeight: 900,
          letterSpacing: "3px",
          textTransform: "uppercase" as const,
          lineHeight: 1,
          fontFamily: ANTON,
          userSelect: "none" as const,
          background: verlauf,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          PLAYER
        </span>

        {showTagline && (
          <span style={{
            display: "block",
            marginTop: 7,
            fontSize: tagSize,
            fontWeight: 700,
            color: hell ? "#6F6D68" : "rgba(244,241,235,0.72)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            textAlign: "center" as const,
            lineHeight: 1.45,
          }}>
            Die Ping Pong Liga<br />der Schweiz.
          </span>
        )}
      </div>
    </div>
  )
}

/* Nur das Zeichen, ohne Wortmarke — fuer Kopfzeilen und den Fuss.
   Es gibt bewusst KEINE zweite Logo-Datei: wer ein P braucht, nimmt das
   hier. Auf dunklem Grund ist der Umriss weiss und nur der Ball gruen —
   so bleibt Gruen ein Akzent und wird nicht zur Markenflaeche
   (Design-System V3, 23.09.2026). */
export function PlayerZeichen({ gross = false, aufHell = false }: { gross?: boolean; aufHell?: boolean }) {
  const s = gross ? 40 : 24
  const umriss = aufHell ? "#111111" : "#FFFFFF"
  const ball = aufHell ? AKZENT_TIEF : GREEN
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" role="img" aria-label="PLAYER"
      style={{ flexShrink: 0, display: "block" }}>
      <g transform="translate(-2,0)">
        <path
          d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z"
          fill="none" stroke={umriss} strokeWidth="5" strokeLinejoin="round"
        />
        <circle cx="63" cy="58" r="6.5" fill={ball} />
      </g>
    </svg>
  )
}
