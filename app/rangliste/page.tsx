"use client"
/* PLAYER · RANGLISTE — auf das Design-System V3 gezogen (24.09.2026).

   Die Startseite ist die visuelle Vorgabe. Diese Seite benutzt genau ihre
   Bausteine: den dunklen Kopf mit Foto und PlayerKopf, EINE Anton-Zeile,
   die Eyebrow, den Kennzahlenstreifen — und darunter .p-karte, .p-kopf
   und .p-zeile aus globals.css. Kein eigenes Kaestchen, keine eigene
   Schriftgroesse, kein zweiter Gruenwert.

   Daten und Logik unveraendert: /api/rangliste, optional nach Kanton. */
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import PlayerKopf from "@/app/components/PlayerKopf"
import { ANTON, INTER, TEXT, LEISE, AKZENT, BG } from "@/app/design"

const CANTONS = ["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"]
type Player = { user_id: string; name: string; elo: number; level: string; city?: string | null; canton?: string | null; rank_global: number; rank_filtered: number; avatar?: string | null }

function ini(n: string) { return n.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() }

export default function RanglistePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [me, setMe] = useState<Player | null>(null)
  const [canton, setCanton] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async (ct: string) => {
    setLoading(true); setError("")
    try {
      const qs = ct ? `?scope=canton&canton=${encodeURIComponent(ct)}` : ""
      const res = await fetch(`/api/rangliste${qs}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setPlayers(json.players || []); setMe(json.me || null)
    } catch { setError("Rangliste konnte nicht geladen werden.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load(canton) }, [canton, load])

  const meinPlatz = me ? (canton ? me.rank_filtered : me.rank_global) : null

  return (
    <>
      <main style={{ minHeight: "100dvh", background: BG, color: TEXT, fontFamily: INTER }}>

        {/* ══════════ KOPF ══════════
            Derselbe Aufbau wie auf der Startseite: Foto, Schleier,
            PlayerKopf, eine Anton-Zeile, Eyebrow, Streifen. */}
        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/player-hero.jpg" alt="" aria-hidden className="p-foto" style={{ objectPosition: "50% 30%" }} />
          <div aria-hidden className="p-hero-schleier" />

          <PlayerKopf />

          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">Rangliste</h1>
            <p className="p-eyebrow">Ein Ranking<br />für die ganze Schweiz.</p>

            {/* Zwei Zellen fuer Gaeste, drei fuer Angemeldete. Ein Streifen
                mit zwei Gedankenstrichen sieht aus wie ein Ladefehler. */}
            <div className="p-streifen">
              <div>
                <span className="zahl">{players.length || "—"}</span>
                <span className="was">Spieler</span>
              </div>
              {me ? (
                <>
                  <div>
                    <span className="zahl">#{meinPlatz}</span>
                    <span className="was">Dein Rang</span>
                  </div>
                  <div>
                    <span className="zahl">{me.elo}</span>
                    <span className="was">Dein Rating</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="zahl">{players[0]?.elo ?? "—"}</span>
                  <span className="was">Top-Rating</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══════════ INHALT ══════════ */}
        <div className="p-lese" style={{ paddingTop: 18, paddingBottom: 34 }}>

          {me && (
            <section className="p-karte">
              <div className="p-kopf">
                <h2>Dein Rang</h2>
                <span className="p-mehr">{canton || "Ganze Schweiz"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "16px 18px" }}>
                <span style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 56, lineHeight: .9, letterSpacing: "-.01em" }}>
                  #{meinPlatz}
                </span>
                <span style={{ textAlign: "right", fontSize: 13, lineHeight: 1.5, color: LEISE }}>
                  <b style={{ display: "block", fontSize: 15, fontWeight: 600, color: TEXT }}>Level {me.level}</b>
                  Rating {me.elo}
                </span>
              </div>
            </section>
          )}

          <section className={me ? "p-karte p-abschnitt" : "p-karte"}>
            <div className="p-kopf">
              <h2>{canton ? `Rangliste ${canton}` : "Rangliste"}</h2>
              <select
                aria-label="Nach Kanton filtern"
                className="p-auswahl"
                value={canton}
                onChange={e => setCanton(e.target.value)}
              >
                <option value="">Ganze Schweiz</option>
                {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {loading && <p className="p-leer">Rangliste wird geladen …</p>}
            {!loading && error && <p className="p-leer">{error}</p>}
            {!loading && !error && players.length === 0 && (
              <p className="p-leer">Noch niemand in dieser Auswahl.</p>
            )}

            {!loading && !error && players.map(p => {
              const meins = me?.user_id === p.user_id
              const platz = canton ? p.rank_filtered : p.rank_global
              return (
                <Link key={p.user_id} href={`/spieler/${p.user_id}`} className="p-zeile"
                  style={meins ? { background: "#FAFAF8" } : undefined}>
                  {/* Platz 1-3 tragen ihre Position gross und in Tief-Gruen.
                      Gruen ist hier Status, nicht Schmuck: danach wird die
                      Zahl zur ruhigen Ordnungsziffer. */}
                  <span style={{
                    width: 26, flexShrink: 0, textAlign: "center", fontFamily: ANTON, fontWeight: 400,
                    fontSize: platz <= 3 ? 26 : 18, lineHeight: 1,
                    color: platz <= 3 ? AKZENT : LEISE, fontVariantNumeric: "tabular-nums",
                  }}>{platz}</span>

                  <span style={{
                    width: 36, height: 36, flexShrink: 0, borderRadius: "50%", overflow: "hidden",
                    background: "#FFFFFF", border: "1px solid #DDDDDA", display: "grid", placeItems: "center",
                  }}>
                    {p.avatar
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 12.5, fontWeight: 600, color: LEISE }}>{ini(p.name)}</span>}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</b>
                    <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>
                      {meins ? "Du · " : ""}Level {p.level}{p.canton ? ` · ${p.canton}` : ""}
                    </span>
                  </span>

                  <span style={{
                    flexShrink: 0, minWidth: 52, textAlign: "right", fontFamily: ANTON, fontWeight: 400,
                    fontSize: 21, lineHeight: 1, color: meins ? AKZENT : TEXT,
                    fontVariantNumeric: "tabular-nums",
                  }}>{p.elo}</span>
                </Link>
              )
            })}
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
