"use client"
/* PLAYER — DIE Hauptnavigation (16.09.2026, Oliver).

   Vorher lag unten eine feste Leiste mit fuenf Punkten. Sie war immer da,
   nahm auf jedem Bildschirm 78 px weg und zwang jede Seite zu einem
   Platzhalter am Fuss. Jetzt sitzt die Navigation oben rechts hinter einem
   Hamburger und oeffnet sich als ganze Flaeche.

   Was das aendert:
     · Der Inhalt bekommt den unteren Rand zurueck.
     · Die zweite Ebene (Match-History, Achievements, Freunde, PingPoints,
       Stunden, Community, Ranking, Shop) stand bisher verstreut auf PROFIL
       und ist hier an einer Stelle erreichbar.
     · Abmelden steht im Menue, nicht nur irgendwo auf einer Unterseite.

   Die Datei BottomNav.tsx gibt es weiterhin und reicht auf diese Komponente
   durch — 22 Seiten importieren sie, und ein Massen-Rename haette nur
   Laerm im Verlauf erzeugt. */
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, ANTON_ZEILEN } from "@/app/theme"

const LINIE = "rgba(244,241,235,.15)"
const LEISE = "rgba(244,241,235,.82)"

const HAUPT = [
  { key: "home",    label: "Home",    href: "/entdecken" },
  { key: "spielen", label: "Spielen", href: "/match" },
  { key: "liga",    label: "Liga",    href: "/liga" },
  { key: "events",  label: "Events",  href: "/turniere" },
  { key: "profil",  label: "Profil",  href: "/profil" },
] as const

/* Zweite Ebene — jeder Eintrag zeigt auf eine Seite, die es wirklich gibt. */
const ZWEITE = [
  { label: "Liga-Chat",     href: "/liga?chat=1" },
  { label: "Match-History", href: "/matchhistorie" },
  { label: "Achievements",  href: "/achievements" },
  { label: "Freunde",       href: "/freunde" },
  { label: "PingPoints",    href: "/pingpoints" },
  { label: "Stunden",       href: "/stunden" },
  { label: "Community",     href: "/feed" },
  { label: "Ranking",       href: "/rangliste" },
  { label: "Shop",          href: "/shop" },
]

/* Welche Unterseite zu welchem Hauptpunkt gehoert — sonst ist auf
   /spieler/<id> oder /matchhistorie kein Punkt aktiv. */
const GEHOERT_ZU: Record<string, string> = {
  "/match": "spielen", "/erstellen": "spielen", "/spielen": "spielen",
  "/liga": "liga", "/rangliste": "liga", "/spieler": "liga",
  "/turniere": "events", "/single-night": "events", "/training": "events", "/trainingscamp": "events",
  "/profil": "profil", "/achievements": "profil", "/pingpoints": "profil",
  "/freunde": "profil", "/matchhistorie": "profil", "/stunden": "profil", "/shop": "profil",
  "/entdecken": "home", "/feed": "home", "/benachrichtigungen": "home",
}

/* Wo die Navigation nichts zu suchen hat: waehrend des Anmeldens, waehrend
   des Onboardings und in den Bereichen, die eine eigene Fuehrung haben. */
const OHNE_MENUE = ["/login", "/onboarding", "/auth", "/join", "/staff", "/admin"]

export default function HauptMenu() {
  const path = usePathname() || "/"
  const [offen, setOffen] = useState(false)
  const [name, setName] = useState<string | null>(null)
  const [initialen, setInitialen] = useState("")

  const aktiv = GEHOERT_ZU["/" + (path.split("/")[1] || "")] || "home"

  useEffect(() => {
    let lebt = true
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user || !lebt) return
        const { data: p } = await sb.from("profiles").select("name").eq("id", user.id).maybeSingle()
        const n = (p?.name || "").trim()
        if (!lebt) return
        setName(n || user.email || null)
        if (n) setInitialen(n.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase())
      } catch { /* nicht angemeldet — Menue funktioniert trotzdem */ }
    })()
    return () => { lebt = false }
  }, [])

  /* Beim Seitenwechsel schliessen, sonst bleibt die Flaeche offen stehen. */
  useEffect(() => { setOffen(false) }, [path])

  /* Solange offen: die Seite dahinter nicht mitscrollen lassen. */
  useEffect(() => {
    if (!offen) return
    const vorher = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOffen(false) }
    window.addEventListener("keydown", esc)
    return () => { document.body.style.overflow = vorher; window.removeEventListener("keydown", esc) }
  }, [offen])

  if (OHNE_MENUE.some(x => path === x || path.startsWith(x + "/"))) return null

  const strich: React.CSSProperties = {
    display: "block", width: 22, height: 2, background: CREME, borderRadius: 2,
    transition: "transform .28s ease, opacity .18s ease",
  }

  return (
    <>
      <button
        type="button"
        className="ppl-menue-knopf"
        onClick={() => setOffen(o => !o)}
        aria-label={offen ? "Menü schliessen" : "Menü öffnen"}
        aria-expanded={offen}
        style={{
          position: "fixed", top: "calc(14px + env(safe-area-inset-top))", right: 14, zIndex: 120,
          width: 44, height: 44, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 5,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span style={{ ...strich, transform: offen ? "translateY(7px) rotate(45deg)" : undefined }} />
        <span style={{ ...strich, opacity: offen ? 0 : 1 }} />
        <span style={{ ...strich, transform: offen ? "translateY(-7px) rotate(-45deg)" : undefined }} />
      </button>

      <nav
        aria-label="Hauptnavigation"
        aria-hidden={!offen}
        style={{
          position: "fixed", inset: 0, zIndex: 110, background: SCHWARZ,
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "96px 20px calc(36px + env(safe-area-inset-bottom))",
          overflowY: "auto", fontFamily: INTER,
          opacity: offen ? 1 : 0,
          visibility: offen ? "visible" : "hidden",
          transform: offen ? "none" : "translateY(-8px)",
          transition: "opacity .26s ease, transform .26s ease, visibility .26s",
        }}
      >
        <ol style={{ listStyle: "none", margin: "0 auto", padding: 0, maxWidth: 660, width: "100%" }}>
          {HAUPT.map((it, i) => {
            const an = it.key === aktiv
            return (
              <li key={it.key} style={{ borderTop: `1px solid ${LINIE}`, borderBottom: i === HAUPT.length - 1 ? `1px solid ${LINIE}` : undefined }}>
                <Link href={it.href} aria-current={an ? "page" : undefined} style={{
                  display: "flex", alignItems: "baseline", gap: 16, padding: "16px 0",
                  fontFamily: ANTON, fontWeight: 400, textTransform: "uppercase",
                  fontSize: "clamp(30px,8.5vw,44px)", lineHeight: ANTON_ZEILEN,
                  color: an ? VIOLETT : CREME, textDecoration: "none",
                }}>
                  <span style={{
                    fontFamily: INTER, fontSize:11.5, fontWeight: 900, letterSpacing: ".16em",
                    color: VIOLETT, minWidth: 26,
                  }}>{String(i + 1).padStart(2, "0")}</span>
                  {it.label}
                </Link>
              </li>
            )
          })}
        </ol>

        <div style={{ maxWidth: 660, width: "100%", margin: "28px auto 0", display: "flex", flexWrap: "wrap", gap: "10px 22px" }}>
          {ZWEITE.map(z => (
            <Link key={z.href} href={z.href} style={{
              fontSize: 15, fontWeight: 600, color: LEISE, textDecoration: "none", padding: "8px 0",
            }}>{z.label}</Link>
          ))}
        </div>

        <div style={{
          maxWidth: 660, width: "100%", margin: "26px auto 0",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          borderTop: `1px solid ${LINIE}`, paddingTop: 18,
        }}>
          {name ? (
            <Link href="/profil" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: CREME, padding: "8px 0" }}>
              <span aria-hidden style={{
                width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${VIOLETT}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12.5, fontWeight: 900, flexShrink: 0,
              }}>{initialen || "··"}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
            </Link>
          ) : (
            <Link href="/login" style={{ fontSize: 15, fontWeight: 700, color: VIOLETT, textDecoration: "none", padding: "12px 0" }}>Anmelden</Link>
          )}
          {name && (
            <form action="/auth/signout" method="post">
              <button type="submit" style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 14, fontWeight: 600, color: LEISE, padding: "12px 0",
              }}>Abmelden</button>
            </form>
          )}
        </div>
      </nav>
    </>
  )
}
