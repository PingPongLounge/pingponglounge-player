"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { IconSuche, IconProfil, IconRangliste, IconMatches, IconFavorit, IconBuchungen, IconLiga, IconOpenGames, IconTurniere, IconKalender } from "@/app/components/Icons"

const C = "#121214", B = "#1A1A1E", W = "#fff", M = "rgba(255,255,255,.85)"

/* 24.09.2026: Das Menue zeichnete neun eigene Strichsymbole als rohe
   SVG-Strings. Jetzt kommt jedes aus app/components/Icons.tsx — dem
   PLAYER-Satz. `Ik` ist nur noch der Traeger fuer Farbe und Abstand. */
function Ik({ children }: { children: React.ReactNode }) {
  return <span style={{ color: W, marginRight: 6, display: "inline-flex", flexShrink: 0 }}>{children}</span>
}

function buchenLink(): string {
  const basis = "https://pingponglounge.ch/buchen?type=table&utm_source=player"
  try {
    const ort = typeof window !== "undefined" ? window.localStorage.getItem("ppl_letzter_standort") : null
    return ort ? basis + "&location=" + encodeURIComponent(ort) : basis
  } catch { return basis }
}

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, padding: "13px 15px", borderTop: `1px solid #1A1A1E`, textDecoration: "none" }

/* 07.09.2026, Oliver: "menu immer unten". Der Ausloeser sitzt jetzt als
   sechster Punkt in der unteren Navigation (variant="nav") — dort, wo im
   Player alle Navigation sitzt. Die Variante "knopf" bleibt nur noch fuer
   Seiten, die noch keinen Hero-Kopf haben. */
export default function StartMenu({ name = "Spieler", sub = "", inline = false, avatar, variant = "knopf", aktivFarbe, ausFarbe }: { name?: string; sub?: string; inline?: boolean; avatar?: string; variant?: "knopf" | "nav"; aktivFarbe?: string; ausFarbe?: string }) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    let aktiv = true
    createClient().auth.getUser().then(({ data }) => { if (aktiv) setAuthed(!!data.user) })
    return () => { aktiv = false }
  }, [])

  async function logout() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push("/login")
  }

  const Link2 = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
    <Link href={href} style={row} onClick={() => setOpen(false)}>
      {icon}<span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: W }}>{label}</span><span style={{ color: M, fontSize: 13 }}>›</span>
    </Link>
  )

  const AUS = ausFarbe || "#8E8A86"
  const AN = aktivFarbe || "#F4F1EB"

  return (
    <>
      {variant === "nav" ? (
        <button onClick={() => setOpen(true)} aria-label="Menü" aria-expanded={open} style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 5, background: "none", cursor: "pointer", height: "100%", width: "100%",
          color: open ? AN : AUS, fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={open ? AN : AUS}
            strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          <span style={{ fontSize:11.5, fontWeight: open ? 900 : 700, letterSpacing: ".07em", textTransform: "uppercase" }}>Menü</span>
        </button>
      ) : avatar ? (
        <button onClick={() => setOpen(true)} aria-label="Profil & Menü" style={{ ...(inline ? { position: "relative" } : { position: "absolute", top: 18, right: 16, zIndex: 20 }), width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#39FF14,#12D45C)", color: "#FFFFFF", fontSize: 17, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {avatar}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Menü" style={{ ...(inline ? { position: "relative" } : { position: "absolute", top: 18, right: 16, zIndex: 20 }), background: C, borderRadius: 11, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#igm)" strokeWidth="2" strokeLinecap="round"><defs><linearGradient id="igm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14"/><stop offset="1" stopColor="#12D45C"/></linearGradient></defs><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      )}

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", justifyContent: variant === "nav" ? "center" : "flex-end", alignItems: variant === "nav" ? "flex-end" : "stretch" }}>
          <div onClick={e => e.stopPropagation()} style={variant === "nav"
            ? { width: "100%", maxWidth: 620, maxHeight: "84dvh", background: "#0E1013", borderTop: "2px solid #39FF14", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "18px 16px calc(22px + env(safe-area-inset-bottom))", overflowY: "auto", boxShadow: "0 -24px 70px rgba(0,0,0,.6)" }
            : { width: "82%", maxWidth: 340, height: "100%", background: "#0E1013", borderLeft: `1px solid ${B}`, padding: "22px 16px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 21, fontWeight: 600 }}>menü</span>
              <button onClick={() => setOpen(false)} aria-label="schliessen" style={{ background: "none", cursor: "pointer", padding: 4 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
            </div>

            {authed ? (
            <Link href="/profil" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", background: C, borderRadius: 16, textDecoration: "none" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#39FF14,#12D45C)", padding: 2, flexShrink: 0, display: "block" }}>
                <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#13161B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}><IconSuche size={22} /></span>
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 500, color: W }}>{name}</span>
                <span style={{ display: "block", fontSize:11.5, color: M, marginTop: 2 }}>{sub || "profil ansehen"}</span>
              </span>
              <span style={{ color: "#39FF14", fontSize: 18 }}>›</span>
            </Link>
            ) : (
            <div style={{ background: C, borderRadius: 16, padding: "15px 15px 13px" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: W, margin: 0 }}>noch nicht angemeldet</p>
              <p style={{ fontSize: 12.5, color: M, margin: "5px 0 12px" }}>mit konto: liga, pingpoints, deine spiele und ergebnisse.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href="/login" onClick={() => setOpen(false)} style={{ flex: 1, textAlign: "center", background: "#39FF14", color: "#06220E", borderRadius: 100, padding: "11px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>anmelden</Link>
                <Link href="/onboarding" onClick={() => setOpen(false)} style={{ flex: 1, textAlign: "center", background: "#1A1A1E", color: W, borderRadius: 100, padding: "11px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>konto erstellen</Link>
              </div>
            </div>
            )}

            <div style={{ background: C, borderRadius: 16, overflow: "hidden", marginTop: 10 }}>
              {authed && <Link2 href="/profil" label="profil" icon={<Ik><IconProfil size={22} /></Ik>} />}
              <Link2 href="/rangliste" label="rangliste" icon={<Ik><IconRangliste size={22} /></Ik>} />
              {authed && <Link2 href="/matchhistorie" label="deine spiele" icon={<Ik><IconMatches size={22} /></Ik>} />}
              {authed && <Link2 href="/pingpoints" label="pingpoints" icon={<Ik><IconFavorit size={22} /></Ik>} />}
              <Link2 href="/shop" label="shop" icon={<Ik><IconBuchungen size={22} /></Ik>} />
            </div>

            <div style={{ fontSize:11.5, color: "rgba(255,255,255,.82)", textTransform: "uppercase", letterSpacing: ".06em", margin: "22px 4px 8px" }}>spielen &amp; buchen</div>
            <div style={{ background: C, borderRadius: 16, overflow: "hidden" }}>
              <Link2 href="/liga" label="liga" icon={<Ik><IconLiga size={22} /></Ik>} />
              <Link2 href="/match" label="open game" icon={<Ik><IconOpenGames size={22} /></Ik>} />
              <Link2 href="/turniere" label="turnier" icon={<Ik><IconTurniere size={22} /></Ik>} />
              <a href={buchenLink()} target="_blank" rel="noopener noreferrer" style={row}>
                <Ik><IconKalender size={22} /></Ik><span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: W }}>tisch buchen</span><span style={{ color: M, fontSize: 13 }}>↗</span>
              </a>
            </div>

            {authed && (
              <button onClick={logout} style={{ width: "100%", marginTop: 20, background: "#1A1A1E", color: W, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 500, textTransform: "lowercase", cursor: "pointer" }}>abmelden</button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
