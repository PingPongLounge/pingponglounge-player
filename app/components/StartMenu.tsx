"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const C = "#171A1F", B = "#232833", W = "#fff", M = "rgba(255,255,255,.85)"

function Icon({ d, fillBall }: { d: string; fillBall?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={W} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: d + (fillBall ? `<circle cx="${fillBall}" fill="${W}" stroke="none"/>` : "") }} />
  )
}

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, padding: "13px 15px", borderTop: `1px solid #20242E`, textDecoration: "none" }

export default function StartMenu({ name = "Spieler", sub = "", inline = false, avatar }: { name?: string; sub?: string; inline?: boolean; avatar?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

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

  return (
    <>
      {avatar ? (
        <button onClick={() => setOpen(true)} aria-label="Profil & Menü" style={{ ...(inline ? { position: "relative" } : { position: "absolute", top: 18, right: 16, zIndex: 20 }), width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#57CF79,#38BEB2)", color: "#06210F", fontSize: 17, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {avatar}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Menü" style={{ ...(inline ? { position: "relative" } : { position: "absolute", top: 18, right: 16, zIndex: 20 }), background: C, borderRadius: 11, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#igm)" strokeWidth="2" strokeLinecap="round"><defs><linearGradient id="igm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#57CF79"/><stop offset="1" stopColor="#1FD1C4"/></linearGradient></defs><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      )}

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "82%", maxWidth: 340, height: "100%", background: "#0E1013", borderLeft: `1px solid ${B}`, padding: "22px 16px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 21, fontWeight: 600 }}>menü</span>
              <button onClick={() => setOpen(false)} aria-label="schliessen" style={{ background: "none", cursor: "pointer", padding: 4 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
            </div>

            <Link href="/profil" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", background: C, borderRadius: 16, textDecoration: "none" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#57CF79,#38BEB2)", padding: 2, flexShrink: 0, display: "block" }}>
                <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#13161B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏓</span>
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 500, color: W }}>{name}</span>
                <span style={{ display: "block", fontSize: 11, color: M, marginTop: 2 }}>{sub || "profil ansehen"}</span>
              </span>
              <span style={{ color: "#57CF79", fontSize: 18 }}>›</span>
            </Link>

            {/* "einstellungen" zeigte auf dasselbe Ziel wie "profil" — es gibt gar
                keine Einstellungen. Stattdessen die Rangliste, die bisher über
                keinen einzigen Link erreichbar war. */}
            <div style={{ background: C, borderRadius: 16, overflow: "hidden", marginTop: 10 }}>
              <Link2 href="/profil" label="profil" icon={<Icon d='<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' />} />
              <Link2 href="/rangliste" label="rangliste" icon={<Icon d='<path d="M5 20v-6M12 20v-11M19 20v-8"/>' />} />
              <Link2 href="/matchhistorie" label="deine spiele" icon={<Icon d='<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>' />} />
              <Link2 href="/pingpoints" label="pingpoints" icon={<Icon d='<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' />} />
              {/* Der Shop hing als Warenkorb-Symbol im Kopf der Startseite — dem
                  prominentesten Platz der App, für einen Nebenschauplatz. */}
              <Link2 href="/shop" label="shop" icon={<Icon d='<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/>' />} />
            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,.82)", textTransform: "uppercase", letterSpacing: ".06em", margin: "22px 4px 8px" }}>spielen &amp; buchen</div>
            <div style={{ background: C, borderRadius: 16, overflow: "hidden" }}>
              <Link2 href="/liga" label="liga" icon={<Icon d='<path d="M5 20v-4M12 20v-8M19 20v-12"/><circle cx="19" cy="4.6" r="1.6" fill="#fff" stroke="none"/>' />} />
              <Link2 href="/match" label="open game" icon={<Icon d='<g transform="translate(2.2 0)"><ellipse cx="10" cy="9.8" rx="6" ry="5.2" transform="rotate(-42 10 9.8)"/><path d="M14 13.6 18 17.6" stroke-width="3.4"/><circle cx="18.6" cy="5.7" r="1.6" fill="#fff" stroke="none"/></g>' />} />
              <Link2 href="/turniere" label="turnier" icon={<Icon d='<path d="M3 6h5v5h4M3 16h5v-5M12 11h5"/><circle cx="19" cy="11" r="1.6" fill="#fff" stroke="none"/>' />} />
              {/* Tisch buchen fuehrt auf die Website — die Buchung lebt dort, nicht
                  doppelt im Player. Der Player ist die Sport-App (Liga, Open Game,
                  Turnier, Training). */}
              <a href="https://pingponglounge.ch/buchen" target="_blank" rel="noopener noreferrer" style={row}>
                <Icon d='<path d="M4 11h16M6 11v6M18 11v6M12 11V6M10 7.6h4M10 9.5h4"/>' /><span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: W }}>tisch buchen</span><span style={{ color: M, fontSize: 13 }}>↗</span>
              </a>
            </div>

            <button onClick={logout} style={{ width: "100%", marginTop: 20, background: "#353B46", color: W, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 500, textTransform: "lowercase", cursor: "pointer" }}>abmelden</button>
          </div>
        </div>
      )}
    </>
  )
}
