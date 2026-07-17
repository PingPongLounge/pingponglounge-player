"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import StartMenu from "./StartMenu"

const CARD = "#2A2F39", W = "#FFFFFF"
const SUB = "rgba(255,255,255,.88)", MUT = "rgba(255,255,255,.82)"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"
const SHADOW = "0 1px 4px rgba(0,0,0,.14)"
const gt: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }

// Grüner Sektions-Balken: "PLAYER LIGA / TURNIER / OPEN GAME / TRAINING"
// Logo + Wortmarke sind IMMER ein Link zurück auf die Startseite.
export function SectionTopBar({ section: _section }: { section: string }) {
  // Nur "PLAYER" — der Sektionsname stand hier UND direkt darunter riesig im
  // Bild. "Open Game" viermal auf einem Screen war zu viel. Der Hero-Titel und
  // das aktive Nav-Symbol sagen ohnehin, wo man ist.
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#1A1E25", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/entdecken" aria-label="Zur Startseite" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="21" height="21" viewBox="0 0 80 80" fill="none" aria-hidden>
            <defs><linearGradient id="stbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14" /><stop offset="1" stopColor="#1FD1C4" /></linearGradient></defs>
            <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#stbg)" strokeWidth="3.6" strokeLinejoin="round" />
            <circle cx="63" cy="58" r="6.5" fill="url(#stbg)" />
          </svg>
          <span style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: ".20em", color: W }}>PLAYER</span>
        </Link>
        <StartMenu inline />
      </div>
    </div>
  )
}

const HERO = "#14171E", LINE = "rgba(255,255,255,.07)", GREEN = "#39FF14"

/**
 * DAS MUSTER — ein Block für jede Sektion, wie in der Liga:
 * Bild oben (halbe Höhe, trägt Titel und die eine Zahl, die zählt),
 * darunter Zeilen, getrennt durch feine Linien. Keine Kästchen-Sammlung.
 * Zeilen kommen als children (SectionStat, SectionRow).
 */
export function SectionBlock({ title, meta, img = "/gl-tische.jpg", children }: {
  title: string; meta?: string; img?: string; children?: React.ReactNode
}) {
  return (
    <div style={{ margin: "14px 0 0", borderRadius: 22, overflow: "hidden", boxShadow: SHADOW, background: HERO }}>
      <div style={{ position: "relative", height: 132 }}>
        <img src={img} alt="" style={{ width: "100%", height: 132, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(20,23,30,.1) 0%,rgba(20,23,30,.55) 55%,rgba(20,23,30,.92) 100%)" }} />
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 13 }}>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: .9, textTransform: "uppercase", letterSpacing: "-.02em", color: W }}>{title}</div>
          {meta && <div style={{ fontSize: 12, color: SUB, fontWeight: 400, marginTop: 5 }}>{meta}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

/** Grosse Zahl links, Beschriftung rechts — "deine Lage" in einer Zeile. */
export function SectionStat({ big, label, sub }: { big: string; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderTop: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 40, fontWeight: 900, lineHeight: .85, letterSpacing: "-.03em", flexShrink: 0, ...gt }}>{big}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: MUT }}>{label}</div>
        {sub && <div style={{ fontSize: 13, color: SUB, fontWeight: 400, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

/** Die Handlung — eine leise Zeile mit Pfeil, kein knallgrüner Balken. */
export function SectionRow({ label, href, onClick, external }: {
  label: string; href?: string; onClick?: () => void; external?: boolean
}) {
  const inner = (<>
    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".02em", ...gt }}>{label}</span>
    <span style={{ fontSize: 15, fontWeight: 800, color: GREEN }}>→</span>
  </>)
  const style: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
    background: "none", borderTop: `1px solid ${LINE}`, padding: "13px 20px",
    cursor: "pointer", fontFamily: "inherit", textAlign: "left", textDecoration: "none", color: W,
  }
  if (href && external) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{inner}</a>
  if (href) return <Link href={href} style={style}>{inner}</Link>
  return <button onClick={onClick} style={style}>{inner}</button>
}

export function SectionHero({ eyebrow, title, subtitle, img = "/gl-tische.jpg", align = "left" }: { eyebrow: string; title: string; subtitle: string; img?: string; align?: "left" | "right" }) {
  // align="right": für Bilder, deren Motiv links liegt (z.B. der Bracket-Zettel
  // beim Turnier). Sonst läge der Text mitten auf dem Motiv.
  const right = align === "right"
  return (
    <div style={{ position: "relative", height: 190, margin: "14px 0 0", borderRadius: 24, overflow: "hidden", boxShadow: SHADOW }}>
      <img src={img} alt="" style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: right
          ? "linear-gradient(100deg,rgba(20,23,30,0) 30%,rgba(20,23,30,.75) 62%,rgba(20,23,30,.94) 100%)"
          : "linear-gradient(180deg,rgba(20,23,30,.15) 0%,rgba(20,23,30,.55) 55%,rgba(20,23,30,.9) 100%)",
      }} />
      <div style={{ position: "absolute", left: right ? "auto" : 22, right: 22, bottom: 18, maxWidth: right ? "58%" : "auto", textAlign: right ? "right" : "left" }}>
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
    <div style={{ position: "relative", marginTop: 16, borderRadius: 24, padding: 22, boxShadow: SHADOW, background: CARD }}>
      <button onClick={dismiss} aria-label="Ausblenden" style={{ position: "absolute", top: 14, right: 14, background: "none", color: MUT, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>✕</button>
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
