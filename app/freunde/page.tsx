"use client"
/* PLAYER · FREUNDE

   Die Seite hatte bis zum 24.09.2026 nur das Werbeprogramm ("Teile deinen
   Link"). Die Freundschaften selbst fehlten komplett: /api/friends kann
   anfragen, annehmen und entfernen, und auf einem Spielerprofil gibt es den
   Knopf "+ Freund" — aber es gab in der ganzen App keine Stelle, an der eine
   eingehende Anfrage sichtbar wurde. Sie konnte also nie angenommen werden,
   und der Freunde-Filter in der Rangliste blieb dadurch zwangslaeufig leer.

   Jetzt steht beides hier: oben die Freundschaften, darunter das
   Werbeprogramm. Dieselben Bausteine wie auf der Startseite.

   Keine Aenderung an der API oder an der Logik dahinter. */
import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import PlayerKopf from "@/app/components/PlayerKopf"
import { IconChevron } from "@/app/components/Icons"
import { zumLogin, pruefeAuth } from "@/lib/auth-client"
import { INTER, TEXT, LEISE, BG, AKZENT, knopf, knopfUmriss } from "@/app/design"

type Spieler = { id: string; name?: string; elo?: number; level?: string; avatar_url?: string | null }
type Stand = { friends: Spieler[]; incoming: Spieler[]; outgoing: Spieler[] }

function ini(n?: string) { return (n || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() }

function Zeile({ p, rechts }: { p: Spieler; rechts?: React.ReactNode }) {
  return (
    <div className="p-zeile hat-cta">
      <span style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: "50%", overflow: "hidden",
        background: "#FFFFFF", border: "1px solid #DDDDDA", display: "grid", placeItems: "center",
      }}>
        {p.avatar_url
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 12.5, fontWeight: 600, color: LEISE }}>{ini(p.name)}</span>}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/spieler/${p.id}`} style={{ color: TEXT, textDecoration: "none" }}>
          <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}>{p.name || "Spieler"}</b>
        </Link>
        <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
          {p.level ? `Level ${p.level}` : ""}{p.elo ? `${p.level ? " · " : ""}Rating ${p.elo}` : ""}
        </span>
      </span>
      {rechts && <span className="cta">{rechts}</span>}
    </div>
  )
}

export default function FreundePage() {
  const [nick, setNick] = useState("")
  const [refCount, setRefCount] = useState(0)
  const [refHours, setRefHours] = useState(0)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stand, setStand] = useState<Stand>({ friends: [], incoming: [], outgoing: [] })
  const [busy, setBusy] = useState<string | null>(null)
  const [fehler, setFehler] = useState("")

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/join?ref=${nick}`
    : `https://playerapp.ch/join?ref=${nick}`

  const ladeFreunde = useCallback(async () => {
    const r = await fetch("/api/friends", { cache: "no-store" })
    if (!pruefeAuth(r)) return
    const j = await r.json().catch(() => ({}))
    if (r.ok) setStand({ friends: j.friends || [], incoming: j.incoming || [], outgoing: j.outgoing || [] })
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { zumLogin(); return }

      const { data: profile } = await supabase
        .from("profiles").select("name, referral_code").eq("id", user.id).single()
      setNick(profile?.referral_code || profile?.name || "")

      const { data: credits } = await supabase
        .from("credits").select("hours").eq("user_id", user.id).eq("type", "referral")
      setRefCount((credits || []).length)
      setRefHours((credits || []).reduce((a: number, c: { hours: number }) => a + c.hours, 0))

      await ladeFreunde()
      setLoading(false)
    }
    load()
  }, [ladeFreunde])

  async function aktion(art: "accept" | "remove", userId: string) {
    setBusy(userId); setFehler("")
    const r = await fetch("/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: art, user_id: userId }),
    })
    if (!pruefeAuth(r)) return
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setFehler(j.error || "Das hat nicht geklappt.")
    await ladeFreunde()
    setBusy(null)
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "PLAYER — Die Ping Pong Liga der Schweiz",
          text: "Spiel mit mir auf Player! Wir bekommen je 2 Gratisstunden in der Ping Pong Lounge.",
          url: referralLink,
        })
      } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true); setTimeout(() => setCopied(false), 3000)
    }
  }
  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true); setTimeout(() => setCopied(false), 3000)
  }

  if (loading) return (
    <main style={{ minHeight: "100dvh", background: BG, color: LEISE, fontFamily: INTER, display: "grid", placeItems: "center" }}>
      Lädt …<BottomNav />
    </main>
  )

  return (
    <>
      <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>
        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ppl-home.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
          <div aria-hidden className="p-hero-schleier" />
          <PlayerKopf />
          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">Freunde</h1>
            <p className="p-eyebrow">Spieler finden, folgen<br />und gemeinsam spielen.</p>
            <div className="p-streifen">
              <div>
                <span className="zahl">{stand.friends.length}</span>
                <span className="was">Freunde</span>
              </div>
              <div>
                <span className="zahl">{refCount}</span>
                <span className="was">Geworben</span>
              </div>
              <div>
                <span className="zahl">{refHours}</span>
                <span className="was">Stunden</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>

          {fehler && <p className="p-fehler" style={{ marginTop: 0, marginBottom: 12 }}>{fehler}</p>}

          {/* ── Eingehende Anfragen ── */}
          {stand.incoming.length > 0 && (
            <section className="p-karte">
              <div className="p-kopf"><h2>Möchten dein Freund sein</h2></div>
              {stand.incoming.map(p => (
                <Zeile key={p.id} p={p} rechts={
                  <span style={{ display: "inline-flex", gap: 8 }}>
                    <button disabled={busy === p.id} onClick={() => aktion("accept", p.id)} className="p-aktion">Annehmen</button>
                    <button disabled={busy === p.id} onClick={() => aktion("remove", p.id)} className="p-textlink" style={{ marginTop: 0, width: "auto", padding: "0 8px" }}>Ablehnen</button>
                  </span>
                } />
              ))}
            </section>
          )}

          {/* ── Meine Freunde ── */}
          <section className={stand.incoming.length ? "p-karte p-abschnitt" : "p-karte"}>
            <div className="p-kopf">
              <h2>Deine Freunde</h2>
              <Link href="/rangliste" className="p-mehr">Spieler finden →</Link>
            </div>
            {stand.friends.length === 0
              ? <p className="p-leer">Noch niemand. Öffne ein Spielerprofil und schick eine Anfrage.</p>
              : stand.friends.map(p => (
                  <Zeile key={p.id} p={p} rechts={
                    <button disabled={busy === p.id} onClick={() => aktion("remove", p.id)} className="p-textlink" style={{ marginTop: 0, width: "auto", padding: "0 8px" }}>Entfernen</button>
                  } />
                ))}
          </section>

          {/* ── Ausgehende Anfragen ── */}
          {stand.outgoing.length > 0 && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf"><h2>Angefragt</h2></div>
              {stand.outgoing.map(p => (
                <Zeile key={p.id} p={p} rechts={
                  <button disabled={busy === p.id} onClick={() => aktion("remove", p.id)} className="p-textlink" style={{ marginTop: 0, width: "auto", padding: "0 8px" }}>Zurückziehen</button>
                } />
              ))}
            </section>
          )}

          {/* ── Werbeprogramm ── */}
          <section className="p-karte p-abschnitt">
            <div className="p-kopf"><h2>Freunde werben</h2></div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.55 }}>
                Du und dein Freund bekommen je <b style={{ color: AKZENT, fontWeight: 600 }}>2 Gratisstunden</b> in der Ping Pong Lounge.
              </p>
              <span className="p-label" style={{ marginBottom: 6 }}>Dein persönlicher Link</span>
              <p style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, wordBreak: "break-all" }}>
                playerapp.ch/join?ref={nick}
              </p>
              <button onClick={handleShare} style={{ ...knopf, width: "100%" }}>Link teilen →</button>
              <button onClick={handleCopy} style={{ ...knopfUmriss, width: "100%", marginTop: 10 }}>
                {copied ? "✓ Kopiert" : "Code kopieren"}
              </button>
            </div>
            <div className="p-zeile" style={{ display: "block" }}>
              <span className="p-label">So funktioniert es</span>
              <ol style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: LEISE }}>
                <li>Du teilst deinen persönlichen Link</li>
                <li>Dein Freund meldet sich an</li>
                <li>Ihr bekommt je 2 h gutgeschrieben</li>
              </ol>
            </div>
          </section>

          <div className="p-abschnitt">
            <Link href="/profil" className="p-zeile p-karte" style={{ textDecoration: "none" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15.5, fontWeight: 600 }}>Zurück zum Profil</b>
              </span>
              <IconChevron size={19} style={{ color: LEISE }} />
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
