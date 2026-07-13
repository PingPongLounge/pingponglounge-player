"use client"
import { useEffect } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { SectionBlock, SectionStat, SectionRow, SectionIntro, SectionTopBar } from "@/app/components/SectionUI"

const BG = "#20242C", CARD = "#2A2F39", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.82)", MUT = "rgba(255,255,255,.5)"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const EVERSPORTS_STUDIO = "https://www.eversports.ch/st/pingponglounge24"

// Widget-ID aus dem Eversports Manager hier eintragen:
// Manager → Widgets → gewünschtes Widget (Kursplan/Buchung) → Code kopieren
// → die ID aus  data-eversports-widget-id="…"  hier einsetzen.
const EVERSPORTS_WIDGET_ID = "2662962e-ccc2-45ef-94c6-eaf9cf3c0b30"

export default function TrainingPage() {
  useEffect(() => {
    if (!EVERSPORTS_WIDGET_ID) return
    const SRC = "https://widget-static.eversports.io/loader.js"
    if (document.querySelector(`script[src="${SRC}"]`)) return
    const s = document.createElement("script")
    s.type = "module"; s.src = SRC; s.async = true; s.defer = true
    document.body.appendChild(s)
  }, [])

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "0 0 100px" }}>
      <SectionTopBar section="Training" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "6px 16px 0" }}>
        {/* Derselbe Block wie in der Liga: Bild, nächster Termin, Buchen-Zeile */}
        <SectionBlock title="Training" meta="Jeden Donnerstag · Glattbrugg" img="/training-hero.jpg">
          <SectionStat big="Do" label="Nächstes Training" sub="19:30–21:00 · Glattbrugg · Einsteiger & Medium · 8 Plätze" />
          <SectionRow label="Platz sichern" href={EVERSPORTS_STUDIO} external />
        </SectionBlock>
        <div style={{ textAlign: "center", marginTop: 9, fontSize: 11.5, color: MUT, fontWeight: 400 }}>Anmeldung &amp; Zahlung über Eversports</div>

        <SectionIntro storageKey="intro_training" title="So funktioniert das Training" steps={[["1", "Kurs wählen", "Von Beginner bis Pro — wöchentlich in der Lounge Glattbrugg."], ["2", "Termin sichern", "Anmeldung & Bezahlung laufen direkt über Eversports."], ["3", "Besser werden", "Regelmässiges Coaching, Drills und Matchpraxis."]]} />

        {/* Kursplan */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 4px 12px" }}>
          <span style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", color: W }}>Kursplan</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: MUT }}>Live · Eversports</span>
        </div>

        {EVERSPORTS_WIDGET_ID ? (
          <div style={{ background: CARD, borderRadius: 18, padding: 8, overflow: "hidden" }}>
            <div data-eversports-widget-id={EVERSPORTS_WIDGET_ID} />
          </div>
        ) : (
          <div style={{ background: CARD, borderRadius: 18, padding: 22, textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: W }}>Termine & Anmeldung</p>
            <p style={{ fontSize: 13, color: SUB, fontWeight: 300, margin: "8px 0 18px", lineHeight: 1.45 }}>
              Alle Trainings-Termine, Preise und die Anmeldung laufen über Eversports.
            </p>
            <a href={EVERSPORTS_STUDIO} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", border: "1.5px solid transparent", borderRadius: 12, padding: "13px 26px", fontSize: 15, fontWeight: 800, color: W, textDecoration: "none", background: `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` }}>
              Auf Eversports ansehen →
            </a>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
