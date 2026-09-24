"use client"
/* PLAYER · OFFEN FÜR DICH — offene Forderungen und laufende Matches.

   24.09.2026 (Oliver): "wenn ich gefordert wurde muss dies auch im Profil
   stehen und direkt dort eintragbar sein wenns mehrere matches waren" und
   "das ist das wichtigste und muss schnell und einfach sein, nicht mehrere
   weiterleitungen".

   Vorher lag eine Forderung nur in der Glocke und in der Liga, und das
   Ergebnis liess sich erst nach zwei Seitenwechseln eintragen. Diese Karte
   steht an allen drei Orten (Liga, Profil, Startseite) und erledigt ALLES
   an Ort und Stelle: annehmen, ablehnen, zurueckziehen, Satzstand
   eintragen, bestaetigen — und direkt danach das naechste Spiel gegen
   denselben Gegner. Kein Klick fuehrt hier weg.

   Sie laedt ihre Daten selbst und haengt NICHT an der Rangliste: ein
   Gegner, der durch einen Filter oder eine andere Stufe aus der Liste
   faellt, bleibt hier sichtbar. */
import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LEISE, TEXT, KANTE, AKZENT, ANTON, INTER } from "@/app/design"
import { IconLiga } from "./Icons"

type Offen = {
  id: string; seasonId: string; status: string
  iAmP1: boolean; enteredBy: string | null
  oppId: string; oppName: string
}

export default function OffenFuerDich({ onChange }: { onChange?: () => void }) {
  const [ich, setIch] = useState<string | null>(null)
  const [offene, setOffene] = useState<Offen[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [meldung, setMeldung] = useState("")
  /** Welche Zeile hat das Eingabefeld offen, und mit welchem Stand. */
  const [eingabe, setEingabe] = useState<Record<string, { my: number; opp: number }>>({})
  /** Gegen wen wurde gerade eingetragen → "Noch ein Spiel" anbieten. */
  const [nochEins, setNochEins] = useState<{ oppId: string; oppName: string; seasonId: string } | null>(null)

  const laden = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    setIch(user?.id ?? null)
    if (!user) { setOffene([]); return }
    const { data: regs } = await sb.from("league_registrations").select("season_id").eq("player_id", user.id)
    const seasons = (regs || []).map(r => r.season_id)
    if (!seasons.length) { setOffene([]); return }
    const { data: ms } = await sb.from("league_matches")
      .select("id,season_id,p1_id,p2_id,status,entered_by")
      .in("season_id", seasons)
      .in("status", ["challenge_sent", "accepted", "pending", "p1_entered"])
      .or(`p1_id.eq.${user.id},p2_id.eq.${user.id}`)
    const roh = ms || []
    if (!roh.length) { setOffene([]); return }
    const oppIds = [...new Set(roh.map(m => (m.p1_id === user.id ? m.p2_id : m.p1_id)))]
    const { data: op } = await sb.from("public_profiles").select("id,name").in("id", oppIds)
    const namen = new Map((op || []).map(p => [p.id as string, p.name as string]))
    setOffene(roh.map(m => {
      const oppId = m.p1_id === user.id ? m.p2_id : m.p1_id
      return {
        id: m.id, seasonId: m.season_id, status: m.status, iAmP1: m.p1_id === user.id,
        enteredBy: (m as { entered_by?: string | null }).entered_by ?? null,
        oppId, oppName: namen.get(oppId) || "Spieler",
      }
    }))
  }, [])
  useEffect(() => { laden() }, [laden])

  function fertig(text: string) { setMeldung(text); laden(); onChange?.(); setTimeout(() => setMeldung(""), 4000) }

  async function post(pfad: string, body: unknown) {
    const r = await fetch(pfad, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    return { ok: r.ok, j }
  }

  async function einfach(pfad: string, id: string, gut: string) {
    setBusy(id)
    const { ok, j } = await post(pfad, { match_id: id })
    setBusy(null)
    fertig(ok ? gut : (j.error || "Das hat nicht geklappt"))
  }

  /** Satzstand direkt hier speichern — ohne die Seite zu verlassen. */
  async function speichern(o: Offen) {
    const e = eingabe[o.id] || { my: 0, opp: 0 }
    if (e.my === e.opp) { setMeldung("Kein Unentschieden möglich"); return }
    if (!ich) return
    setBusy(o.id)
    const sets = [...Array(e.my)].map(() => ({ p1: 11, p2: 7 })).concat([...Array(e.opp)].map(() => ({ p1: 7, p2: 11 })))
    const { ok, j } = await post("/api/liga/result", {
      match_id: o.id, sets, winner_id: e.my > e.opp ? ich : o.oppId,
    })
    setBusy(null)
    if (ok) {
      setEingabe(v => { const n = { ...v }; delete n[o.id]; return n })
      setNochEins({ oppId: o.oppId, oppName: o.oppName, seasonId: o.seasonId })
      fertig(`✓ ${e.my}:${e.opp} eingetragen — ${o.oppName} bestätigt noch`)
    } else fertig(j.error || "Das hat nicht geklappt")
  }

  /** Mehrere Spiele am Stück: gleich das nächste gegen denselben Gegner. */
  async function nochEinSpiel() {
    if (!nochEins) return
    setBusy("neu")
    const { ok, j } = await post("/api/liga/direct-match", { season_id: nochEins.seasonId, opponent_id: nochEins.oppId })
    setBusy(null)
    const id = ok ? j.id : j.existing_id
    if (!id) { fertig(j.error || "Das hat nicht geklappt"); return }
    setNochEins(null)
    await laden()
    setEingabe(v => ({ ...v, [id]: { my: 0, opp: 0 } }))
  }

  if (!offene.length && !nochEins && !meldung) return null

  return (
    <section className="p-karte p-abschnitt">
      <div className="p-kopf"><h2><IconLiga size={22}/>Offen für dich</h2></div>

      {offene.map(o => {
        const selbst = !!o.enteredBy && !!ich && o.enteredBy === ich
        const offenEingabe = eingabe[o.id]
        let lage = ""
        if (o.status === "challenge_sent") lage = o.iAmP1 ? "Du hast gefordert — wartet auf Antwort" : "fordert dich heraus"
        else if (o.status === "p1_entered") lage = selbst ? "Eingetragen — wartet auf Bestätigung" : "hat ein Resultat eingetragen"
        else lage = "Spiel vereinbart — trag den Satzstand ein"
        const laeuft = busy === o.id

        return (
          <div key={o.id}>
            <div className="p-zeile hat-cta">
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}>{o.oppName}</b>
                <span style={{ display: "block", marginTop: 3, fontSize: 13, fontWeight: 400, color: LEISE }}>{lage}</span>
              </span>
              <span className="cta" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {o.status === "challenge_sent" && !o.iAmP1 && (
                  <>
                    <button disabled={laeuft} onClick={() => einfach("/api/liga/challenge/accept", o.id, "✓ Angenommen — jetzt spielen")} className="p-aktion">{laeuft ? "…" : "Annehmen"}</button>
                    <button disabled={laeuft} onClick={() => einfach("/api/liga/challenge/decline", o.id, "Forderung abgelehnt")} className="p-pille" style={{ cursor: "pointer" }}>Ablehnen</button>
                  </>
                )}
                {o.status === "challenge_sent" && o.iAmP1 && (
                  <button disabled={laeuft} onClick={() => einfach("/api/liga/challenge/decline", o.id, "Forderung zurückgezogen")} className="p-pille" style={{ cursor: "pointer" }}>Zurückziehen</button>
                )}
                {o.status === "p1_entered" && !selbst && (
                  <button disabled={laeuft} onClick={() => einfach("/api/liga/confirm", o.id, "✓ Bestätigt — zählt für dein Rating")} className="p-aktion">{laeuft ? "…" : "Bestätigen"}</button>
                )}
                {o.status === "p1_entered" && selbst && <span className="p-pille">Wartet</span>}
                {(o.status === "accepted" || o.status === "pending") && !offenEingabe && (
                  <button onClick={() => setEingabe(v => ({ ...v, [o.id]: { my: 0, opp: 0 } }))} className="p-aktion">Ergebnis eintragen</button>
                )}
              </span>
            </div>

            {/* Satzstand — direkt hier, kein Seitenwechsel. */}
            {offenEingabe && (
              <div style={{ padding: "4px 18px 18px", borderBottom: `1px solid ${KANTE}` }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, marginBottom: 14 }}>
                  {([["Du", "my"], [o.oppName, "opp"]] as [string, "my" | "opp"][]).map(([lab, feld], i) => (
                    <div key={feld} style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                      {i === 1 && <span style={{ fontFamily: ANTON, fontSize: 26, color: LEISE, paddingBottom: 6 }}>:</span>}
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: INTER, fontSize: 10.5, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: LEISE, marginBottom: 9, maxWidth: 104, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lab}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button aria-label="weniger" onClick={() => setEingabe(v => ({ ...v, [o.id]: { ...v[o.id], [feld]: Math.max(0, v[o.id][feld] - 1) } }))}
                            style={{ width: 38, height: 38, border: `1px solid ${KANTE}`, background: "transparent", color: TEXT, fontSize: 18, cursor: "pointer", fontFamily: INTER, borderRadius: 0 }}>−</button>
                          <span style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 1, width: 32, textAlign: "center", color: TEXT }}>{offenEingabe[feld]}</span>
                          <button aria-label="mehr" onClick={() => setEingabe(v => ({ ...v, [o.id]: { ...v[o.id], [feld]: Math.min(7, v[o.id][feld] + 1) } }))}
                            style={{ width: 38, height: 38, border: `1px solid ${KANTE}`, background: "transparent", color: TEXT, fontSize: 18, cursor: "pointer", fontFamily: INTER, borderRadius: 0 }}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={laeuft} onClick={() => speichern(o)} className="p-aktion" style={{ flex: 1 }}>{laeuft ? "…" : "Speichern"}</button>
                  <button onClick={() => setEingabe(v => { const n = { ...v }; delete n[o.id]; return n })} className="p-pille" style={{ cursor: "pointer" }}>Abbrechen</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Mehrere Spiele am Stück — ohne Umweg. */}
      {nochEins && (
        <div className="p-zeile hat-cta">
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: LEISE }}>
            Noch ein Spiel gegen {nochEins.oppName}?
          </span>
          <span className="cta" style={{ display: "flex", gap: 8 }}>
            <button disabled={busy === "neu"} onClick={nochEinSpiel} className="p-aktion">{busy === "neu" ? "…" : "Weiteres Ergebnis"}</button>
            <button onClick={() => setNochEins(null)} className="p-pille" style={{ cursor: "pointer" }}>Fertig</button>
          </span>
        </div>
      )}

      {meldung && (
        <p style={{ margin: 0, padding: "12px 18px", fontSize: 13, lineHeight: 1.5, color: meldung.startsWith("✓") ? AKZENT : LEISE, borderTop: `1px solid ${KANTE}` }}>{meldung}</p>
      )}
    </section>
  )
}
