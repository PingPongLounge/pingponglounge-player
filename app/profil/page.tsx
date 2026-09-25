"use client"
/* PLAYER · PROFIL — das eigene Profil mit Einstellungen.

   24.09.2026: auf das Design-System V3 gezogen. Derselbe Kopf wie die
   Startseite (Foto, PlayerKopf, eine Anton-Zeile, Eyebrow,
   Kennzahlenstreifen), darunter .p-karte / .p-kopf / .p-zeile.
   Daten und Logik sind unveraendert: /api/achievements, /api/pingpoints,
   /api/profil, dieselben Supabase-Updates fuer Name, Kanton und die drei
   Schalter. */
import { useEffect, useState } from "react"
import Link from "next/link"
import ProfilAvatar from "@/app/components/ProfilAvatar"
import PlayerKopf from "@/app/components/PlayerKopf"
import OffenFuerDich from "@/app/components/OffenFuerDich"
import BottomNav from "@/app/components/BottomNav"
import LogoutButton from "@/app/components/LogoutButton"
import { createClient } from "@/lib/supabase/client"
import {
  IconBuchungen, IconChevron, IconCommunity, IconEinstellungen, IconFavorit, IconKalender, IconLiga, IconMatches, IconProfil, IconStatistiken, IconTraining, IconTurniere,
} from "@/app/components/Icons"
import { ANTON, INTER, TEXT, LEISE, BG, AKZENT, knopf } from "@/app/design"

type RecentMatch = { id: string; sets: Array<{ p1: number, p2: number }> | null; winner_id: string | null; confirmed_at: string; p1_id: string; p2_id: string; p1: { name: string } | null; p2: { name: string } | null; season: { name: string, city: string } | null }
type Profile = { id: string; name: string; real_name?: string | null; elo: number; level: string; matches_played: number; matches_won: number; canton: string | null; avatar_url?: string | null; allow_challenges?: boolean | null; allow_friend_requests?: boolean | null; visible_in_ranking?: boolean | null; home_location?: string | null; handedness?: string | null; pips?: string | null; anti?: boolean | null; blade?: string | null; rubber_fh?: string | null; rubber_bh?: string | null; player_category?: string | null }

/* Spielprofil — Hauptspielort, Hand, Noppen, Anti, Material, Kategorie.
   /api/profil/style gibt es seit dem 06.09.2026, und die Liga filtert seit
   demselben Tag nach hand/pips/anti/category. Eine Oberflaeche zum Setzen
   dieser Werte gab es nie: die Filter konnten niemanden finden, weil sie
   bei allen leer standen. */
type Stil = {
  home_location: string
  handedness: "" | "left" | "right"
  pips: "" | "none" | "short" | "long"
  anti: boolean
  blade: string
  rubber_fh: string
  rubber_bh: string
  parkinson: boolean
}
const LEER_STIL: Stil = { home_location: "", handedness: "", pips: "", anti: false, blade: "", rubber_fh: "", rubber_bh: "", parkinson: false }

/* Eine Reihe sich gegenseitig ausschliessender Knoepfe. Optik wie die
   Stufenfilter in der Liga — dieselben Kanten, dieselbe Schriftgroesse. */
function Wahl<T extends string>({ label, wert, optionen, onWahl }: {
  label: string; wert: T; optionen: Array<[T, string]>; onWahl: (v: T) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span className="p-label" style={{ marginBottom: 8 }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {optionen.map(([v, t]) => {
          const on = wert === v
          return (
            <button key={v || "_"} type="button" onClick={() => onWahl(v)}
              style={{
                minHeight: 40, padding: "0 13px", background: on ? TEXT : "transparent",
                border: `1px solid ${on ? TEXT : "var(--p-kante)"}`, color: on ? "#FFFFFF" : LEISE,
                fontFamily: INTER, fontSize: 11, fontWeight: 600, letterSpacing: ".12em",
                textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
              }}>{t}</button>
          )
        })}
      </div>
    </div>
  )
}

const CM: Record<string, string> = { "Aargau": "AG", "Appenzell Ausserrhoden": "AR", "Appenzell Innerrhoden": "AI", "Basel-Landschaft": "BL", "Basel-Stadt": "BS", "Bern": "BE", "Freiburg": "FR", "Genf": "GE", "Glarus": "GL", "Graubünden": "GR", "Jura": "JU", "Luzern": "LU", "Neuenburg": "NE", "Nidwalden": "NW", "Obwalden": "OW", "Schaffhausen": "SH", "Schwyz": "SZ", "Solothurn": "SO", "St. Gallen": "SG", "Tessin": "TI", "Thurgau": "TG", "Uri": "UR", "Waadt": "VD", "Wallis": "VS", "Zug": "ZG", "Zürich": "ZH" }
const CANTONS = Object.keys(CM)

function ago(d: string) {
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return n < 1 ? "heute" : n === 1 ? "gestern" : n < 7 ? `vor ${n}d` : new Date(d).toLocaleDateString("de-CH", { day: "numeric", month: "short" })
}

/* Eine Zeile in "Dein Player" und in den Einstellungen. */
function Weg({ href, extern = false, icon, titel, unter }: {
  href: string; extern?: boolean; icon: React.ReactNode; titel: string; unter: string
}) {
  const inhalt = (
    <>
      <span style={{ flexShrink: 0, display: "inline-flex", color: TEXT }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{titel}</b>
        <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>{unter}</span>
      </span>
      {extern
        ? <span aria-hidden style={{ color: LEISE, fontSize: 15 }}>↗</span>
        : <IconChevron size={19} style={{ color: LEISE }} />}
    </>
  )
  return extern
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="p-zeile">{inhalt}</a>
    : <Link href={href} className="p-zeile">{inhalt}</Link>
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<RecentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pp, setPp] = useState(0)
  const [earned, setEarned] = useState(0)
  const [lastDelta, setLastDelta] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [canton, setCanton] = useState("")
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [ruhe, setRuhe] = useState<{ c: boolean; f: boolean; r: boolean } | null>(null)
  const [ruheSaving, setRuheSaving] = useState(false)
  const [stil, setStil] = useState<Stil>(LEER_STIL)
  const [stilSaving, setStilSaving] = useState(false)
  const [stilMeldung, setStilMeldung] = useState("")

  async function load() {
    setError("")
    try {
      const [a, p, r] = await Promise.all([fetch("/api/achievements"), fetch("/api/pingpoints"), fetch("/api/profil")])
      const aa = await a.json(), px = await p.json(), rr = await r.json()
      setEarned(aa.earned || 0)
      setPp(px.balance || 0)
      setProfile(rr.profile)
      setMatches(rr.recentMatches || [])
      const h = rr.eloHistory || []
      setLastDelta(h.length ? h[h.length - 1].delta : null)
      setRuhe({ c: rr.profile?.allow_challenges !== false, f: rr.profile?.allow_friend_requests !== false, r: rr.profile?.visible_in_ranking !== false })
      const pr: Profile | null = rr.profile || null
      setStil({
        home_location: pr?.home_location || "",
        handedness: pr?.handedness === "left" || pr?.handedness === "right" ? pr.handedness : "",
        pips: pr?.pips === "none" || pr?.pips === "short" || pr?.pips === "long" ? pr.pips : "",
        anti: pr?.anti === true,
        blade: pr?.blade || "",
        rubber_fh: pr?.rubber_fh || "",
        rubber_bh: pr?.rubber_bh || "",
        parkinson: pr?.player_category === "parkinson",
      })
    } catch { setError("Profil konnte nicht geladen werden") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function complete() {
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const patch: Record<string, string> = {}
      if (name.trim()) patch.real_name = name.trim()
      if (canton) patch.canton = CM[canton] || canton
      const { error } = await sb.from("profiles").update(patch).eq("id", user.id)
      if (!error) { setDone(true); await load() }
    }
    setSaving(false)
  }

  /* Leere Felder werden bewusst als null geschickt: so laesst sich eine
     Angabe auch wieder entfernen. */
  async function saveStil() {
    setStilSaving(true); setStilMeldung("")
    try {
      const r = await fetch("/api/profil/style", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_location: stil.home_location.trim() || null,
          handedness: stil.handedness || null,
          pips: stil.pips || null,
          anti: stil.anti,
          blade: stil.blade.trim() || null,
          rubber_fh: stil.rubber_fh.trim() || null,
          rubber_bh: stil.rubber_bh.trim() || null,
          player_category: stil.parkinson ? "parkinson" : null,
        }),
      })
      const j = await r.json().catch(() => ({}))
      setStilMeldung(r.ok ? "Gespeichert ✓" : (j.error || "Konnte nicht gespeichert werden"))
      if (r.ok) await load()
    } catch { setStilMeldung("Konnte nicht gespeichert werden") }
    finally { setStilSaving(false) }
  }

  async function toggle(f: "allow_challenges" | "allow_friend_requests" | "visible_in_ranking", v: boolean) {
    setRuheSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) await sb.from("profiles").update({ [f]: v }).eq("id", user.id)
    setRuhe(x => {
      const z = x || { c: true, f: true, r: true }
      return f === "allow_challenges" ? { ...z, c: v } : f === "allow_friend_requests" ? { ...z, f: v } : { ...z, r: v }
    })
    setRuheSaving(false)
  }

  if (loading) return (
    <main className="p-dunkel" style={{ minHeight: "100dvh", fontFamily: INTER, display: "grid", placeItems: "center" }}>
      Profil wird geladen …<BottomNav />
    </main>
  )
  if (error || !profile) return (
    <main className="p-dunkel" style={{ minHeight: "100dvh", fontFamily: INTER, display: "grid", placeItems: "center", padding: 20 }}>
      {error || "Nicht eingeloggt."}<BottomNav />
    </main>
  )

  const played = profile.matches_played || 0, won = profile.matches_won || 0
  const wr = played ? Math.round(won / played * 100) : 0

  return (
    <>
      <main className="p-dunkel" style={{ minHeight: "100dvh", fontFamily: INTER }}>

        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ppl-start.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 45%" }} />
          <div aria-hidden className="p-hero-schleier" />

          <PlayerKopf rechts={
            <Link href="#einstellungen" aria-label="Einstellungen" style={{ color: "#FFFFFF", display: "inline-flex" }}>
              <IconEinstellungen size={20} />
            </Link>
          } />

          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">Profil</h1>
            <p className="p-eyebrow">{profile.name}<br />Level {profile.level}{profile.canton ? ` · ${profile.canton}` : ""}</p>

            <div className="p-streifen">
              <div>
                <span className="zahl">{profile.elo ?? 1000}</span>
                <span className="was">Rating</span>
              </div>
              <div>
                <span className="zahl">{played}</span>
                <span className="was">Matches</span>
              </div>
              <div>
                <span className="zahl">{wr}%</span>
                <span className="was">Win Rate</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>

          {/* ── Wer bin ich ── */}
          <section className="p-karte">
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18 }}>
              <ProfilAvatar src={profile.avatar_url} name={profile.name} groesse={64} editierbar />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{
                  display: "block", fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(24px,6.5vw,32px)",
                  lineHeight: 1, textTransform: "uppercase", overflowWrap: "anywhere",
                }}>{profile.name}</strong>
                <span style={{ display: "block", marginTop: 6, fontSize: 13, fontWeight: 400, color: LEISE }}>
                  {won} von {played} gewonnen
                  {lastDelta !== null && <> · letzte Wertung <b style={{ fontWeight: 600, color: lastDelta >= 0 ? AKZENT : TEXT }}>{lastDelta >= 0 ? "+" : ""}{lastDelta}</b></>}
                  {" · "}{pp} PP
                </span>
              </span>
            </div>
          </section>

          {/* ── Profil vervollstaendigen ── */}
          {(!profile.real_name || !profile.canton) && !done && (
            <section className="p-karte p-abschnitt">
              <div className="p-kopf"><h2><IconProfil size={22}/>Profil vervollständigen</h2></div>
              <div style={{ padding: 18 }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: LEISE }}>Name und Kanton helfen bei Liga und Zuordnung.</p>
                {!profile.real_name && (
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Vor- und Nachname"
                    className="p-feld" style={{ marginBottom: 8 }} />
                )}
                {!profile.canton && (
                  <select value={canton} onChange={e => setCanton(e.target.value)} className="p-feld" style={{ marginBottom: 12 }}>
                    <option value="">Kanton wählen…</option>
                    {CANTONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
                <button onClick={complete} disabled={saving || (!name.trim() && !canton)}
                  style={{ ...knopf, width: "100%", opacity: saving || (!name.trim() && !canton) ? .6 : 1 }}>
                  {saving ? "Speichert …" : "Speichern"}
                </button>
              </div>
            </section>
          )}

          {/* Offene Forderungen und laufende Spiele — direkt hier erledigen. */}
          <OffenFuerDich onChange={load}/>

          {/* ── Spielprofil ──────────────────────────────────────────────
              Diese Angaben speisen die Liga-Filter (Hand, Noppen, Anti,
              Kategorie). Ohne diese Karte standen sie bei jedem leer. */}
          <section className="p-karte p-abschnitt">
            <div className="p-kopf"><h2><IconTraining size={22}/>Dein Spiel</h2></div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: LEISE, lineHeight: 1.55, maxWidth: "46ch" }}>
                Alles freiwillig. Wer etwas angibt, ist über die Filter in der Rangliste auffindbar — und findet dort leichter passende Gegner.
              </p>

              <div style={{ marginBottom: 16 }}>
                <span className="p-label" style={{ marginBottom: 8 }}>Wo du meistens spielst</span>
                <input value={stil.home_location} onChange={e => setStil(v => ({ ...v, home_location: e.target.value }))}
                  placeholder="z.B. Ping Pong Lounge Zürich" className="p-feld" />
              </div>

              <Wahl label="Schlaghand" wert={stil.handedness}
                optionen={[["", "Keine Angabe"], ["right", "Rechts"], ["left", "Links"]]}
                onWahl={v => setStil(x => ({ ...x, handedness: v }))} />

              <Wahl label="Noppen" wert={stil.pips}
                optionen={[["", "Keine Angabe"], ["none", "Keine"], ["short", "Kurz"], ["long", "Lang"]]}
                onWahl={v => setStil(x => ({ ...x, pips: v }))} />

              <div className="p-zeile" style={{ justifyContent: "space-between", padding: "13px 0", borderTop: "1px solid var(--p-kante)" }}>
                <span style={{ fontSize: 15.5, fontWeight: 600 }}>Anti-Belag</span>
                <button type="button" aria-pressed={stil.anti} aria-label="Anti-Belag" className="p-schalter"
                  onClick={() => setStil(v => ({ ...v, anti: !v.anti }))}><span /></button>
              </div>
              <div className="p-zeile" style={{ justifyContent: "space-between", padding: "13px 0", marginBottom: 16 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>Parkinson-Kategorie</b>
                  <span style={{ display: "block", marginTop: 3, fontSize: 13, color: LEISE }}>Eigene Wertung und eigener Filter</span>
                </span>
                <button type="button" aria-pressed={stil.parkinson} aria-label="Parkinson-Kategorie" className="p-schalter"
                  onClick={() => setStil(v => ({ ...v, parkinson: !v.parkinson }))}><span /></button>
              </div>

              <span className="p-label" style={{ marginBottom: 8 }}>Material</span>
              <input value={stil.blade} onChange={e => setStil(v => ({ ...v, blade: e.target.value }))}
                placeholder="Holz" className="p-feld" style={{ marginBottom: 8 }} />
              <input value={stil.rubber_fh} onChange={e => setStil(v => ({ ...v, rubber_fh: e.target.value }))}
                placeholder="Belag Vorhand" className="p-feld" style={{ marginBottom: 8 }} />
              <input value={stil.rubber_bh} onChange={e => setStil(v => ({ ...v, rubber_bh: e.target.value }))}
                placeholder="Belag Rückhand" className="p-feld" style={{ marginBottom: 14 }} />

              <button onClick={saveStil} disabled={stilSaving}
                style={{ ...knopf, width: "100%", opacity: stilSaving ? .6 : 1 }}>
                {stilSaving ? "Speichert …" : "Spielprofil speichern"}
              </button>
              {stilMeldung && <p className="p-hinweis" style={{ fontSize: 13, margin: "10px 0 0" }}>{stilMeldung}</p>}
            </div>
          </section>

          {/* ── Letzte Matches ── */}
          <section className="p-karte p-abschnitt">
            <div className="p-kopf">
              <h2><IconStatistiken size={22}/>Letzte Matches</h2>
              {matches.length > 0 && <Link href="/matchhistorie" className="p-mehr">Alle →</Link>}
            </div>
            {matches.length === 0
              ? <p className="p-leer">Noch keine Matches gespielt.</p>
              : matches.slice(0, 5).map(m => {
                  const p1 = m.p1_id === profile.id, opp = p1 ? m.p2?.name : m.p1?.name, w = m.winner_id === profile.id
                  const sets = m.sets?.map(x => p1 ? `${x.p1}:${x.p2}` : `${x.p2}:${x.p1}`).join(" ") || ""
                  return (
                    <div key={m.id} className="p-zeile">
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>vs. {opp || "?"}</b>
                        <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
                          {m.season?.city || "Match"}{sets ? ` · ${sets}` : ""} · {ago(m.confirmed_at)}
                        </span>
                      </span>
                      <span className={w ? "p-pille gut" : "p-pille"}>{w ? "Sieg" : "Niederlage"}</span>
                    </div>
                  )
                })}
          </section>

          {/* ── Navigation: was frueher im Hamburger-Menue stand ── */}
          <section className="p-karte p-abschnitt">
            <div className="p-kopf"><h2><IconFavorit size={22}/>Dein Player</h2></div>
            {/* 24.09.2026: Vom Profil fuehrte kein Weg in die Liga zurueck —
                die Rating-Zahl stand oben, die Liga dazu war nur ueber die
                untere Leiste erreichbar. */}
            <Weg href="/liga" icon={<IconLiga size={24} />} titel="Liga" unter={`Rating ${profile.elo ?? 1000} · Rangliste und Forderungen`} />
            <Weg href="/matchhistorie" icon={<IconMatches size={24} />} titel="Match-History" unter={`${played} Matches gespielt`} />
            <Weg href="/achievements" icon={<IconTurniere size={24} />} titel="Achievements" unter={`${earned} verdient`} />
            <Weg href="/pingpoints" icon={<IconFavorit size={24} />} titel="PingPoints" unter={`${pp} PP Guthaben`} />
            <Weg href="/freunde" icon={<IconCommunity size={24} />} titel="Freunde" unter="Spieler finden und folgen" />
            <Weg href="/shop" icon={<IconBuchungen size={24} />} titel="Shop" unter="PingPoints einlösen" />
          </section>

          {/* ── Einstellungen ── */}
          <section id="einstellungen" className="p-karte p-abschnitt" style={{ scrollMarginTop: 16 }}>
            <div className="p-kopf"><h2><IconEinstellungen size={22}/>Einstellungen</h2></div>
            <div style={{ padding: "14px 18px" }}>
              <p style={{ margin: 0, fontSize: 13, color: LEISE, lineHeight: 1.5 }}>
                Du entscheidest, wer dich erreichen darf. Spiele und Rating bleiben erhalten.
              </p>
            </div>
            {([
              ["allow_challenges", "Herausforderungen", ruhe?.c ?? true],
              ["allow_friend_requests", "Freundschaftsanfragen", ruhe?.f ?? true],
              ["visible_in_ranking", "In Rangliste anzeigen", ruhe?.r ?? true],
            ] as [string, string, boolean][]).map(([f, t, on]) => (
              <div key={f} className="p-zeile" style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 15.5, fontWeight: 600 }}>{t}</span>
                <button disabled={ruheSaving} aria-pressed={on} className="p-schalter"
                  aria-label={t}
                  onClick={() => toggle(f as "allow_challenges" | "allow_friend_requests" | "visible_in_ranking", !on)}>
                  <span />
                </button>
              </div>
            ))}
            <Weg href="/auth/reset-password" icon={<IconEinstellungen size={24} />} titel="Passwort ändern" unter="Neues Passwort setzen" />
            <Weg href="https://pingponglounge.ch/buchen" extern icon={<IconKalender size={24} />} titel="Tisch buchen" unter="Auf pingponglounge.ch" />
          </section>

          <div className="p-abschnitt"><LogoutButton /></div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
