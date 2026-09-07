"use client"
/* PLAYER V2 — die eine Hauptnavigation (07.09.2026, Oliver).

   Fest unten, immer sichtbar, nie ein Footer: dunkler Grund mit Unschaerfe,
   Icon plus Text, aktiver Punkt in Off-White mit violettem Marker und
   leichtem Glow. Es gibt keine zweite Navigation im Player — wer eine
   Kopfzeile braucht, nimmt die Hero-Ueberschrift der Seite.

   07.09.2026, Oliver: "menu immer unten". Das Menue ist der sechste Punkt
   hier und nirgends sonst — oben stehen nur noch Wortzeichen und Glocke.

   Hoehe 66px plus Safe Area. Jede Seite laesst unten Platz dafuer
   (siehe PlayerRahmen), damit die Navigation nichts verdeckt. */
import Link from "next/link"
import { usePathname } from "next/navigation"
import StartMenu from "./StartMenu"
import { CREME, VIOLETT, INTER } from "@/app/theme"

const AUS = "#77736f"

/* Strichsymbole, ein Stil, keine Emojis. */
const ICONS: Record<string, React.ReactNode> = {
  home: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6.5 10.5V20h11v-9.5" /></>,
  spielen: <><circle cx="12" cy="12" r="7.5" /><path d="M7 7.5c3.4 1.2 6 3.8 7.3 7.3" /><circle cx="16.6" cy="16.6" r="1.6" /></>,
  liga: <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /></>,
  events: <><path d="M8 3.5V7" /><path d="M16 3.5V7" /><rect x="4" y="6" width="16" height="14" rx="2.5" /><path d="M4 11h16" /></>,
  profil: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c1.4-3.6 4-5.4 7-5.4s5.6 1.8 7 5.4" /></>,
}

const ITEMS = [
  { key: "home", label: "Home", href: "/entdecken" },
  { key: "spielen", label: "Spielen", href: "/match" },
  { key: "liga", label: "Liga", href: "/liga" },
  { key: "events", label: "Events", href: "/turniere" },
  { key: "profil", label: "Profil", href: "/profil" },
] as const

/* Welche Unterseiten zu welchem Reiter gehoeren — sonst ist bei
   /spieler/<id> oder /matchhistorie kein Reiter aktiv und der Nutzer
   weiss nicht mehr, wo er ist. */
const GEHOERT_ZU: Record<string, string> = {
  "/match": "spielen", "/erstellen": "spielen", "/spielen": "spielen",
  "/liga": "liga", "/rangliste": "liga", "/spieler": "liga",
  "/turniere": "events", "/single-night": "events", "/training": "events", "/trainingscamp": "events",
  "/profil": "profil", "/achievements": "profil", "/pingpoints": "profil",
  "/freunde": "profil", "/matchhistorie": "profil", "/stunden": "profil", "/shop": "profil",
  "/entdecken": "home", "/feed": "home", "/benachrichtigungen": "home",
}

export default function BottomNav() {
  const path = usePathname() || "/"
  const wurzel = "/" + (path.split("/")[1] || "")
  const aktiv = GEHOERT_ZU[wurzel] || "home"

  return (
    <nav aria-label="Player Navigation" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100,
      background: "rgba(8,8,8,.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      /* Keine Trennlinie: die Navigation hebt sich durch Unschaerfe und
         den dunkleren Grund ab — eine Linie liess sie wie einen Footer wirken. */
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{
        maxWidth: 1000, margin: "0 auto", height: 66,
        display: "grid", gridTemplateColumns: "repeat(6,1fr)", alignItems: "stretch",
      }}>
        {ITEMS.map(it => {
          const an = it.key === aktiv
          return (
            <Link key={it.key} href={it.href} aria-current={an ? "page" : undefined} style={{
              position: "relative", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 5,
              color: an ? CREME : AUS, textDecoration: "none", fontFamily: INTER,
            }}>
              {an && <span aria-hidden style={{
                position: "absolute", top: 0, left: "28%", right: "28%", height: 3,
                background: VIOLETT, borderRadius: "0 0 3px 3px",
                boxShadow: `0 0 12px ${VIOLETT}`,
              }} />}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={an ? CREME : AUS} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden style={an ? { filter: `drop-shadow(0 0 7px rgba(140,61,255,.55))` } : undefined}>
                {ICONS[it.key]}
              </svg>
              <span style={{ fontSize: 10.5, fontWeight: an ? 900 : 700, letterSpacing: ".07em", textTransform: "uppercase" }}>
                {it.label}
              </span>
            </Link>
          )
        })}
        <StartMenu variant="nav" aktivFarbe={CREME} ausFarbe={AUS} />
      </div>
    </nav>
  )
}
