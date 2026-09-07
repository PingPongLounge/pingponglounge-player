"use client"
/* PLAYER V2 — RANGLISTE (07.09.2026).
   Ranking ist Information: dunkel auf Off-White, runde Avatare, die eigene
   Zeile in hellem Violett. Der Kopf bleibt schwarz und atmosphaerisch.
   Daten und Filter unveraendert: /api/rangliste, optional nach Kanton. */
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { KanteZuHell, Neon, Etikett } from "@/app/components/V2"
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
      <main style={{ minHeight: "100dvh", background: SCHWARZ, color: CREME, fontFamily: INTER }}>

        <header style={{ maxWidth: 620, margin: "0 auto", padding: "26px 22px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <Etikett text="Ranking" />
            <Neon text="Climb it" />
          </div>
          <h1 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(52px,15vw,86px)", lineHeight: .88, textTransform: "uppercase", margin: "18px 0 0" }}>
            Your<br />rank.
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 16, color: MUT, lineHeight: 1.5, margin: "16px 0 0", maxWidth: "40ch" }}>
            Spiele Matches. Baue dein Rating auf. Finde Spieler auf deinem Niveau.
          </p>
          {me && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 26 }}>
              <span style={{ fontFamily: ANTON, fontSize: "clamp(62px,18vw,96px)", lineHeight: .82, fontVariantNumeric: "tabular-nums" }}>
                {canton ? me.rank_filtered : me.rank_global}
              </span>
              <span style={{ paddingBottom: 8 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: VIOLETT }}>Dein Rang</span>
                <span style={{ display: "block", fontSize: 15, color: MUT, marginTop: 5 }}>{me.elo} Rating · Level {me.level}</span>
              </span>
            </div>
          )}
        </header>

        <KanteZuHell />
        <section style={{ background: CREME, color: SCHWARZ }}>
          <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 22px 34px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
              <div>
                <Etikett text={canton || "Schweiz"} hell />
                <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: "clamp(30px,8vw,42px)", lineHeight: .94, textTransform: "uppercase", margin: "8px 0 0", color: SCHWARZ }}>Rangliste</h2>
              </div>
              <select value={canton} onChange={e => setCanton(e.target.value)} style={{
                fontFamily: INTER, fontSize: 14, fontWeight: 700, color: SCHWARZ, background: "transparent",
                border: "1px solid rgba(8,8,8,.24)", borderRadius: 100, padding: "9px 14px", cursor: "pointer",
              }}>
                <option value="">Ganze Schweiz</option>
                {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {loading && <p style={{ fontSize: 16, color: "rgba(8,8,8,.6)" }}>Rangliste wird geladen …</p>}
            {!loading && error && <p style={{ fontSize: 16, color: "rgba(8,8,8,.66)" }}>{error}</p>}
            {!loading && !error && players.length === 0 && (
              <p style={{ fontSize: 16, color: "rgba(8,8,8,.66)" }}>Noch niemand in dieser Auswahl.</p>
            )}

            {!loading && !error && players.map(p => {
              const meins = me?.user_id === p.user_id
              const platz = canton ? p.rank_filtered : p.rank_global
              return (
                <Link key={p.user_id} href={`/spieler/${p.user_id}`} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 10px",
                  marginLeft: meins ? -10 : 0, marginRight: meins ? -10 : 0,
                  borderTop: meins ? "1px solid rgba(140,61,255,.28)" : "1px solid rgba(8,8,8,.12)",
                  background: meins ? "rgba(140,61,255,.13)" : "transparent",
                  borderRadius: meins ? 10 : 0, textDecoration: "none", color: SCHWARZ,
                }}>
                  <span style={{ width: 30, textAlign: "center", flexShrink: 0, fontFamily: ANTON, fontSize: 20, color: meins ? VIOLETT : "rgba(8,8,8,.45)", fontVariantNumeric: "tabular-nums" }}>{platz}</span>
                  <span style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "rgba(8,8,8,.10)", display: "grid", placeItems: "center" }}>
                    {p.avatar
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 800, color: "rgba(8,8,8,.5)" }}>{ini(p.name)}</span>}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 17, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</b>
                    <span style={{ display: "block", fontSize: 14, color: "rgba(8,8,8,.55)", marginTop: 2 }}>
                      {meins ? "Du · " : ""}Level {p.level}{p.canton ? ` · ${p.canton}` : ""}
                    </span>
                  </span>
                  <span style={{ fontFamily: ANTON, fontSize: 22, minWidth: 54, textAlign: "right", flexShrink: 0, color: meins ? VIOLETT : SCHWARZ, fontVariantNumeric: "tabular-nums" }}>{p.elo}</span>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
