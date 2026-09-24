/* Diese Seite gab es nicht — Next zeigte hier bis zum 24.09.2026 seine
   eingebaute Standardseite: "404 · This page could not be found.",
   englisch und ohne jeden Bezug zu PLAYER. */
import Link from "next/link"
import { ANTON, INTER, TEXT, LEISE, BG, DUNKEL, knopf, knopfUmriss } from "@/app/design"

export const metadata = { title: "Seite nicht gefunden | PLAYER" }

export default function NichtGefunden() {
  return (
    <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>
      <header className="p-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/player-hero.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
        <div aria-hidden className="p-hero-schleier" />
        <div className="p-spalte p-hero-inhalt" style={{ paddingTop: 34 }}>
          <span style={{
            display: "block", fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(64px,22vw,140px)",
            lineHeight: .9, color: "#FFFFFF",
          }}>404</span>
          <p className="p-eyebrow">Diese Seite gibt es nicht.</p>
        </div>
      </header>

      <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>
        <section className="p-karte">
          <div style={{ padding: 18 }}>
            <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.55, color: LEISE }}>
              Vielleicht ist der Link alt, oder das Spiel, Turnier oder Profil wurde entfernt.
            </p>
            <Link href="/entdecken" style={{ ...knopf, width: "100%" }}>Zur Startseite</Link>
            <Link href="/match" style={{ ...knopfUmriss, width: "100%", marginTop: 10 }}>Open Games</Link>
          </div>
        </section>
      </div>
      <div aria-hidden style={{ height: 1, background: DUNKEL, opacity: 0 }} />
    </main>
  )
}
