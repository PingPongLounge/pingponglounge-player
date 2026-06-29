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

export default function StartMenu({ name = "Spieler", sub = "", inline = false }: { name?: string; sub?: string; inline?: boolean }) {
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
      <button onClick={() => setOpen(true)} aria-label="Menü" style={{ ...(inline ? { position: "relative" } : { position: "absolute", top: 18, right: 16, zIndex: 20 }), background: C, border: `1px solid ${B}`, borderRadius: 11, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#igm)" strokeWidth="2" strokeLinecap="round"><defs><linearGradient id="igm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39FF14"/><stop offset="1" stopColor="#00E5FF"/></linearGradient></defs><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "82%", maxWidth: 340, height: "100%", background: "#0E1013", borderLeft: `1px solid ${B}`, padding: "22px 16px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 21, fontWeight: 600 }}>menü</span>
              <button onClick={() => setOpen(false)} aria-label="schliessen" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
            </div>

            <Link href="/profil" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", background: C, border: `1px solid ${B}`, borderRadius: 16, textDecoration: "none" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#39FF14,#1FD1C4)", padding: 2, flexShrink: 0, display: "block" }}>
                <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#13161B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏓</span>
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 500, color: W }}>{name}</span>
                <span style={{ display: "block", fontSize: 11, color: M, marginTop: 2 }}>{sub || "profil ansehen"}</span>
              </span>
              <span style={{ color: "#39FF14", fontSize: 18 }}>›</span>
            </Link>

            <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, overflow: "hidden", marginTop: 10 }}>
              <Link2 href="/profil" label="profil" icon={<Icon d='<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' />} />
              <Link2 href="/profil" label="einstellungen" icon={<Icon d='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 .1-3l1.5-1.1-1.9-3.3-1.8.8a8 8 0 0 0-2.6-1.5L14 3.2h-4l-.3 2.2a8 8 0 0 0-2.6 1.5l-1.8-.8L3.4 9.4 5 10.5a8 8 0 0 0 0 3l-1.5 1.1 1.9 3.3 1.8-.8a8 8 0 0 0 2.6 1.5L10 20.8h4l.3-2.2a8 8 0 0 0 2.6-1.5l1.8.8 1.9-3.3z"/>' />} />
            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".06em", margin: "22px 4px 8px" }}>spielen &amp; buchen</div>
            <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, overflow: "hidden" }}>
              <Link2 href="/liga" label="liga" icon={<Icon d='<path d="M5 20v-4M12 20v-8M19 20v-12"/><circle cx="19" cy="4.6" r="1.6" fill="#fff" stroke="none"/>' />} />
              <Link2 href="/match" label="open game" icon={<Icon d='<g transform="translate(2.2 0)"><ellipse cx="10" cy="9.8" rx="6" ry="5.2" transform="rotate(-42 10 9.8)"/><path d="M14 13.6 18 17.6" stroke-width="3.4"/><circle cx="18.6" cy="5.7" r="1.6" fill="#fff" stroke="none"/></g>' />} />
              <Link2 href="/turniere" label="turnier" icon={<Icon d='<path d="M3 6h5v5h4M3 16h5v-5M12 11h5"/><circle cx="19" cy="11" r="1.6" fill="#fff" stroke="none"/>' />} />
              <Link2 href="/buchen" label="tisch buchen" icon={<Icon d='<path d="M4 11h16M6 11v6M18 11v6M12 11V6M10 7.6h4M10 9.5h4"/>' />} />
            </div>

            <button onClick={logout} style={{ width: "100%", marginTop: 20, background: "transparent", border: `1px solid #23272F`, color: W, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 500, textTransform: "lowercase", cursor: "pointer" }}>abmelden</button>
          </div>
        </div>
      )}
    </>
  )
}
