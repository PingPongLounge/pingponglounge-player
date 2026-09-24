"use client"
/* PLAYER · KAMPAGNE — die Vollbild-Einblendung auf der eingeloggten
   Startseite.

   Sie wurde am 03.09.2026 beim Umbau von StartHomeV2 aus dem Baum
   genommen (Commit 82ad73c: 131 Zeilen raus, 4 rein) und danach nirgends
   wieder eingehaengt. Datei, /api/campaigns, die Tabelle und die
   Admin-Oberflaeche /admin/kampagnen liefen die ganze Zeit weiter — eine
   dort angelegte Kampagne erschien nur nie.

   24.09.2026: wieder eingehaengt und dabei auf das Design-System V3
   gezogen. Vorher: Radius 14, Inter 900, Buchstabenabstaende aus der
   alten Sprache. Jetzt: dunkle Flaeche, Anton fuer den Titel, Radius 0,
   Neon nur als der EINE Knopf auf dunklem Grund.

   Verhalten unveraendert: eine Kampagne, einmal pro Kampagne, Merker in
   localStorage. */
import { useEffect, useState } from "react"
import { ANTON, INTER, DUNKEL, DUNKEL_LEISE, NEON, knopfNeon } from "@/app/design"

type Campaign = {
  id: string; title: string; kicker: string | null; body: string | null
  cta_label: string | null; cta_url: string | null; image_url: string | null
}

/* Dieselbe Regel wie in /api/admin/campaigns: nur root-relativ oder
   http(s). Der Schreibpfad haertet bereits — hier steht sie ein zweites
   Mal, damit eine Zeile aus der Zeit davor nichts anrichten kann. */
function sichereUrl(v: string | null): string | null {
  if (!v) return null
  const s = v.trim()
  if (s.startsWith("/")) return s
  if (/^https?:\/\//i.test(s)) return s
  return null
}

export default function CampaignOverlay() {
  const [c, setC] = useState<Campaign | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/campaigns?surface=app")
        if (!r.ok) return
        const j = await r.json()
        const camp: Campaign | null = j.campaign || null
        if (!camp || !alive) return
        if (localStorage.getItem(`campaign_seen_${camp.id}`)) return
        setC(camp)
      } catch { /* still */ }
    })()
    return () => { alive = false }
  }, [])

  if (!c) return null

  function close() {
    try { if (c) localStorage.setItem(`campaign_seen_${c.id}`, "1") } catch { /* ignore */ }
    setC(null)
  }

  const bild = sichereUrl(c.image_url)
  const ziel = sichereUrl(c.cta_url)

  return (
    <div role="dialog" aria-modal="true" aria-label={c.title}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: DUNKEL, fontFamily: INTER }}>
      {bild && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bild} alt="" aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <div aria-hidden style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg,rgba(8,11,13,.20) 0%,rgba(8,11,13,.55) 48%,rgba(8,11,13,.96) 100%)",
      }} />

      <button onClick={close} aria-label="Schliessen" style={{
        position: "absolute", top: "calc(env(safe-area-inset-top) + 16px)", right: 18,
        width: 40, height: 40, background: "transparent", border: "1px solid rgba(255,255,255,.28)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5,
      }}>
        <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      <div style={{
        position: "absolute", left: 20, right: 20, bottom: "calc(env(safe-area-inset-bottom) + 34px)",
        zIndex: 5, maxWidth: 560,
      }}>
        {c.kicker && (
          <div style={{
            color: NEON, fontSize: 11, fontWeight: 600, letterSpacing: ".13em",
            textTransform: "uppercase", marginBottom: 10,
          }}>{c.kicker}</div>
        )}
        <div style={{
          fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(34px,10vw,52px)", lineHeight: 1.08,
          letterSpacing: "-.01em", textTransform: "uppercase", color: "#FFFFFF", margin: "0 0 12px",
        }}>{c.title}</div>
        {c.body && (
          <p style={{ color: DUNKEL_LEISE, fontSize: 15, lineHeight: 1.55, margin: "0 0 22px", maxWidth: "44ch" }}>{c.body}</p>
        )}
        {ziel
          ? <a href={ziel} onClick={close} style={{ ...knopfNeon, display: "flex", width: "100%" }}>{c.cta_label || "Mehr erfahren"}</a>
          : <button onClick={close} style={{ ...knopfNeon, width: "100%" }}>{c.cta_label || "Los geht's"}</button>}
      </div>
    </div>
  )
}
