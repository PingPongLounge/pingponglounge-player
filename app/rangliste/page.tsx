"use client"
/* PLAYER V2 — RANGLISTE (07.09.2026).
   Ranking ist Information: dunkel auf Off-White, runde Avatare, die eigene
   Zeile in hellem Violett. Der Kopf bleibt schwarz und atmosphaerisch.
   Daten und Filter unveraendert: /api/rangliste, optional nach Kanton. */
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import HeroKopf from "@/app/components/HeroKopf"
import {
  Hero, Inhalt, AbschnittKopf, Feld, StatsReihe, GrosseZahl, ListenZeile,
  TEXT_LEISE, FLAECHE,
} from "@/app/components/V2"
import { SCHWARZ, CREME, VIOLETT, ANTON, INTER, MUT } from "@/app/theme"

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

  return (
    <>
      <main style={{ minHeight: "100dvh", background: FLAECHE, color: SCHWARZ, fontFamily: INTER }}>

        <Hero
          bild="/ppl-spielen.jpg" pos="70% 44%"
          kopf={<HeroKopf />}
          etikett="Ranking"
          titel={<>Your<br />rank.</>}
          subline={<>Spiele Matches. Baue dein Rating auf.<br />Finde Spieler auf deinem Niveau.</>}
        />

        <Inhalt>
          {me && (
            <>
              <AbschnittKopf titel="Dein Rang" />
              <Feld padding="18px 16px 0">
                <GrosseZahl
                  wert={`#${canton ? me.rank_filtered : me.rank_global}`}
                  rechts={<span style={{ fontFamily: INTER, fontSize: 14, color: TEXT_LEISE, lineHeight: 1.5 }}>
                    <b style={{ display: "block", color: SCHWARZ, fontSize: 15 }}>Level {me.level}</b>
                    {canton || "Ganze Schweiz"}
                  </span>}
                />
                <div style={{ borderTop: "1px solid rgba(8,8,8,.10)", marginTop: 16 }}>
                  <StatsReihe werte={[{ wert: me.elo, label: "Rating" }, { wert: `#${me.rank_global}`, label: "Schweiz" }, { wert: me.rank_filtered ? `#${me.rank_filtered}` : "—", label: canton || "Kanton", akzent: true }]} />
                </div>
              </Feld>
            </>
          )}

          <div style={{ marginTop: me ? 26 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 12 }}>
              <h2 style={{ fontFamily: INTER, fontSize: 12.5, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", margin: 0, color: SCHWARZ }}>
                Rangliste · {canton || "Schweiz"}
              </h2>
              <select value={canton} onChange={e => setCanton(e.target.value)} style={{
                fontFamily: INTER, fontSize: 13, fontWeight: 700, color: SCHWARZ, background: "#FFFFFF",
                border: "1px solid rgba(8,8,8,.16)", borderRadius: 100, padding: "8px 12px", cursor: "pointer",
              }}>
                <option value="">Ganze Schweiz</option>
                {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {loading && <p style={{ fontSize: 15, color: TEXT_LEISE, margin: 0 }}>Rangliste wird geladen …</p>}
            {!loading && error && <p style={{ fontSize: 15, color: TEXT_LEISE, margin: 0 }}>{error}</p>}
            {!loading && !error && players.length === 0 && (
              <p style={{ fontSize: 15, color: TEXT_LEISE, margin: 0 }}>Noch niemand in dieser Auswahl.</p>
            )}

            {!loading && !error && players.length > 0 && (
              <Feld>
                {players.map((p, i) => {
                  const meins = me?.user_id === p.user_id
                  const platz = canton ? p.rank_filtered : p.rank_global
                  return (
                    <Link key={p.user_id} href={`/spieler/${p.user_id}`} style={{ textDecoration: "none", display: "block" }}>
                      <ListenZeile
                        erste={i === 0}
                        aktiv={meins}
                        links={
                          <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <span style={{ width: 24, textAlign: "center", fontFamily: ANTON, fontSize: 18, color: meins ? VIOLETT : TEXT_LEISE, fontVariantNumeric: "tabular-nums" }}>{platz}</span>
                            <span style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "rgba(8,8,8,.08)", display: "grid", placeItems: "center" }}>
                              {p.avatar
                                /* eslint-disable-next-line @next/next/no-img-element */
                                ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <span style={{ fontFamily: INTER, fontSize: 12.5, fontWeight: 800, color: TEXT_LEISE }}>{ini(p.name)}</span>}
                            </span>
                          </span>
                        }
                        titel={p.name}
                        unter={`${meins ? "Du · " : ""}Level ${p.level}${p.canton ? ` · ${p.canton}` : ""}`}
                        rechts={<span style={{ fontFamily: ANTON, fontSize: 20, minWidth: 50, textAlign: "right", color: meins ? VIOLETT : SCHWARZ, fontVariantNumeric: "tabular-nums" }}>{p.elo}</span>}
                      />
                    </Link>
                  )
                })}
              </Feld>
            )}
          </div>
        </Inhalt>
      </main>
      <BottomNav />
    </>
  )
}
