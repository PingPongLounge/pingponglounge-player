"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const CARD = "#2A2F39", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.88)", MUT = "rgba(255,255,255,.55)"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const SHADOW = "0 1px 4px rgba(0,0,0,.14)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

// Grüner Sektions-Balken: "PLAYER LIGA / TURNIER / OPEN GAME / TRAINING"
// Logo + Wortmarke sind IMMER ein Link zurück auf die Startseite.
export function SectionTopBar({ section }: { section: string }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: GRAD }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/entdecken" aria-label="Zur Startseite" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden>
            <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="#06210F" strokeWidth="3.6" strokeLinejoin="round" />
            <circle cx="63" cy="58" r="6.5" fill="#06210F" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: ".20em", color: "#06210F" }}>PLAYER <span style={{ fontWeight: 600, color: "rgba(6,33,15,.72)" }}>{section.toUpperCase()}</span></span>
        </Link>
      </div>
    </div>
  )
}

export function SectionHero({ eyebrow, title, subtitle, img = "/gl-tische.jpg" }: { eyebrow: string; title: string; subtitle: string; img?: string }) {
  return (
    <div style={{ position: "relative", height: 190, margin: "14px 0 0", borderRadius: 24, overflow: "hidden", boxShadow: SHADOW }}>
      <img src={img} alt="" style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(20,23,30,.15) 0%,rgba(20,23,30,.55) 55%,rgba(20,23,30,.9) 100%)" }} />
      <div style={{ position: "absolute", left: 22, right: 22, bottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: SUB }}>{eyebrow}</div>
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: .88, textTransform: "uppercase", letterSpacing: "-.02em", color: W, marginTop: 5 }}>{title}</div>
        <div style={{ fontSize: 13, color: SUB, fontWeight: 300, marginTop: 7 }}>{subtitle}</div>
      </div>
    </div>
  )
}

export function SectionIntro({ storageKey, title, steps, cta }: { storageKey: string; title: string; steps: [string, string, string][]; cta?: { label: string; href: string } }) {
  const [show, setShow] = useState(false)
  useEffect(() => { try { if (!localStorage.getItem(storageKey)) setShow(true) } catch { setShow(true) } }, [storageKey])
  if (!show) return null
  const dismiss = () => { try { localStorage.setItem(storageKey, "1") } catch {} ; setShow(false) }
  return (
    <div style={{ position: "relative", marginTop: 16, borderRadius: 24, padding: 22, boxShadow: SHADOW, border: "1.5px solid transparent", background: `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` }}>
      <button onClick={dismiss} aria-label="Ausblenden" style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: MUT, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>✕</button>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", ...gt }}>Neu hier?</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: W, margin: "6px 0 16px", paddingRight: 20 }}>{title}</div>
      {steps.map(([n, t, d]) => (
        <div key={n} style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 14 }}>
          <span style={{ width: 27, height: 27, borderRadius: "50%", background: GRAD, color: "#06210F", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
          <div><div style={{ fontSize: 14.5, fontWeight: 800, color: W }}>{t}</div><div style={{ fontSize: 12.5, color: MUT, marginTop: 2, lineHeight: 1.4 }}>{d}</div></div>
        </div>
      ))}
      {cta && <Link href={cta.href} style={{ display: "block", textAlign: "center", marginTop: 6, background: GRAD, color: "#06210F", borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", textDecoration: "none" }}>{cta.label}</Link>}
    </div>
  )
}
