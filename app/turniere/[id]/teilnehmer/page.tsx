"use client"
/* ─── TEILNEHMERVERWALTUNG ────────────────────────────────────────────────────
   Geschuetzte Staff-Sicht auf die Anmeldungen eines Turniers: volle
   Kontaktdaten, Zahlungsstatus, Warteliste, Anwesenheit — plus CSV-Export.

   WARUM EINE EIGENE SEITE
   Es gibt bereits zwei Sichten auf dieselben Anmeldungen, und beide bleiben
   unveraendert:
     - die oeffentliche Teilnehmerliste (Vorname + Initial, ueber die
       abgeschottete View tournament_participants_public)
     - die Turnierabend-Ansicht auf pingponglounge.ch/turniere/<id>/verwalten
       (Vorname + Initial, nur Anwesenheit abhaken)
   Diese Seite ersetzt keine von beiden. Sie ist die dritte, bewusst
   getrennte Sicht fuer die Verwaltung — und die einzige, in der E-Mail und
   Telefon ueberhaupt vorkommen.

   BERECHTIGUNG
   Die Route /api/turniere/<id>/participants entscheidet selbst, wer was
   sieht: getRechte() + darfStandort(). Ohne Recht liefert sie die
   oeffentliche Sicht und `manage: false` — dann zeigt diese Seite keine
   Kontaktdaten, sondern einen Hinweis. Die Seite ist also keine zweite
   Berechtigungslogik, sondern folgt der bestehenden.
   ---------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useState, use } from "react"
import Link from "next/link"
import { BG, CARD, CELL, W, MUT, LINE, GREEN, DANGER, INTER, ANTON } from "@/app/theme"

type Teilnehmer = {
  id: string
  player_id: string | null
  reg_type: string | null
  source: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  self_rating: string | null
  payment_status: string | null
  amount_chf: number | string | null
  waitlist: boolean | null
  waitlist_pos: number | null
  checked_in: boolean | null
  status: string | null
  created_at: string | null
  profiles?: { name?: string } | { name?: string }[] | null
}

type Turnier = { id: string; name: string; date: string | null; city: string | null; max_players: number }

const ZAHLUNG: Record<string, string> = {
  paid: "bezahlt", free: "gratis", none: "offen", pending: "in Zahlung",
  reserved: "reserviert", failed: "fehlgeschlagen", cancelled: "storniert", refunded: "erstattet",
}
const STAERKE: Record<string, string> = {
  anfaenger: "Anfänger", freizeit: "Freizeitspieler", fortgeschritten: "Fortgeschritten",
  verein: "Vereinsspieler", leistung: "Leistungsstark",
}

const chf = (n: number) => `CHF ${n.toFixed(2).replace(/\.00$/, ".–")}`
const betrag = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0 }

function zeitpunkt(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit" })
    + " " + d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })
}

/* ── CSV ──────────────────────────────────────────────────────────────────
   Semikolon als Trennzeichen und ein BOM am Anfang: nur so oeffnet Excel auf
   einem Schweizer System die Datei direkt richtig, statt alles in eine Spalte
   zu legen oder Umlaute zu zerlegen. Felder werden immer gequotet, doppelte
   Anfuehrungszeichen verdoppelt — sonst zerlegt ein Semikolon in einer Notiz
   die Zeile. */
function alsCsv(zeilen: Teilnehmer[]): string {
  const kopf = ["Vorname", "Nachname", "E-Mail", "Telefon", "Spielstärke", "Zahlungsstatus",
    "Betrag CHF", "Warteliste", "Wartelistenposition", "Anwesend", "Status", "Art", "Angemeldet am"]
  const feld = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const koerper = zeilen.map(t => [
    t.first_name, t.last_name, t.email, t.phone,
    STAERKE[t.self_rating || ""] ?? t.self_rating,
    ZAHLUNG[t.payment_status || ""] ?? t.payment_status,
    betrag(t.amount_chf).toFixed(2),
    t.waitlist ? "ja" : "nein",
    t.waitlist_pos ?? "",
    t.checked_in ? "ja" : "nein",
    t.status,
    t.reg_type === "guest" ? "Gast" : "Player",
    zeitpunkt(t.created_at),
  ].map(feld).join(";"))
  return "﻿" + [kopf.map(feld).join(";"), ...koerper].join("\r\n")
}

function dateiname(t: Turnier | null): string {
  const name = (t?.name || "turnier").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return `teilnehmer_${name}_${t?.date || "ohne-datum"}.csv`
}

export default function Teilnehmerverwaltung({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [liste, setListe] = useState<Teilnehmer[]>([])
  const [turnier, setTurnier] = useState<Turnier | null>(null)
  const [darf, setDarf] = useState<boolean | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState("")

  // Reines Laden ohne Zustand — damit der Effekt unten keinen setState
  // synchron ausfuehrt (react-hooks/set-state-in-effect).
  const laden = useCallback(async () => {
    const [pRes, tRes] = await Promise.all([
      fetch(`/api/turniere/${id}/participants`, { cache: "no-store" }),
      fetch(`/api/turniere/${id}`, { cache: "no-store" }),
    ])
    const p = await pRes.json().catch(() => ({}))
    const t = await tRes.json().catch(() => ({}))
    return {
      darf: Boolean(p.manage),
      liste: (Array.isArray(p.participants) ? p.participants : []) as Teilnehmer[],
      turnier: (t.tournament ?? null) as Turnier | null,
    }
  }, [id])

  const uebernehmen = useCallback((d: { darf: boolean; liste: Teilnehmer[]; turnier: Turnier | null }) => {
    setDarf(d.darf); setListe(d.liste); setTurnier(d.turnier)
  }, [])

  useEffect(() => {
    let aktiv = true
    void (async () => {
      // Der erste setState kommt erst NACH dem await — nichts laeuft synchron
      // im Effektkoerper. `laedt` startet bereits auf true.
      try { const d = await laden(); if (aktiv) uebernehmen(d) }
      catch { if (aktiv) setFehler("Liste konnte nicht geladen werden.") }
      finally { if (aktiv) setLaedt(false) }
    })()
    return () => { aktiv = false }
  }, [laden, uebernehmen])

  // Der Knopf ist ein Ereignis-Handler — hier ist setState ohne Umweg erlaubt.
  const holen = useCallback(async () => {
    setLaedt(true); setFehler("")
    try { uebernehmen(await laden()) }
    catch { setFehler("Liste konnte nicht geladen werden.") }
    finally { setLaedt(false) }
  }, [laden, uebernehmen])

  // Kennzahlen. "bestaetigt" = aktiv, nicht auf der Warteliste.
  const zahlen = useMemo(() => {
    const aktiv = liste.filter(t => t.status !== "withdrawn")
    const warte = aktiv.filter(t => t.waitlist)
    const dabei = aktiv.filter(t => !t.waitlist)
    const bezahlt = dabei.filter(t => ["paid", "free"].includes(t.payment_status || ""))
    const offen = dabei.filter(t => !["paid", "free"].includes(t.payment_status || ""))
    const einnahmen = aktiv
      .filter(t => t.payment_status === "paid")
      .reduce((s, t) => s + betrag(t.amount_chf), 0)
    return {
      bestaetigt: dabei.length, warteliste: warte.length,
      bezahlt: bezahlt.length, offen: offen.length,
      einnahmen, max: turnier?.max_players ?? 0,
    }
  }, [liste, turnier])

  function exportieren() {
    const csv = alsCsv(liste.filter(t => t.status !== "withdrawn"))
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = dateiname(turnier)
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const kachel = (wert: string, label: string, farbe = W) => (
    <div style={{ background: CELL, borderRadius: 12, padding: "12px 14px", minWidth: 108, flex: "1 1 108px" }}>
      <div style={{ fontFamily: ANTON, fontSize: 26, lineHeight: 1, color: farbe }}>{wert}</div>
      <div style={{ fontSize: 11.5, color: MUT, marginTop: 5, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</div>
    </div>
  )

  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 12px", fontSize: 11, letterSpacing: ".08em",
    textTransform: "uppercase", color: MUT, whiteSpace: "nowrap", borderBottom: `1px solid ${LINE}`,
  }
  const td: React.CSSProperties = {
    padding: "12px", fontSize: 13.5, color: W, borderBottom: `1px solid ${LINE}`, verticalAlign: "top",
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: W, fontFamily: INTER, padding: "20px 16px 96px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        <Link href={`/turniere/${id}`} style={{ color: MUT, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
          ‹ Zurück zum Turnier
        </Link>

        <h1 style={{ fontFamily: ANTON, fontSize: 34, textTransform: "uppercase", letterSpacing: "-.01em", margin: "16px 0 4px" }}>
          Teilnehmer
        </h1>
        {turnier && (
          <p style={{ color: MUT, fontSize: 15, margin: "0 0 22px" }}>
            {turnier.name}{turnier.date ? ` · ${new Date(`${turnier.date}T12:00:00`).toLocaleDateString("de-CH")}` : ""}
            {turnier.city ? ` · ${turnier.city}` : ""}
          </p>
        )}

        {laedt && <p style={{ color: MUT }}>Lädt …</p>}
        {fehler && <p style={{ color: DANGER }}>{fehler}</p>}

        {!laedt && darf === false && (
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "20px 22px" }}>
            <p style={{ margin: 0, color: W, fontSize: 15.5 }}>
              Kein Zugriff auf die Teilnehmerdaten. Diese Ansicht ist der zentralen
              Administration und den Standortverantwortlichen dieses Turniers vorbehalten.
            </p>
          </div>
        )}

        {!laedt && darf && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              {kachel(`${zahlen.bestaetigt} / ${zahlen.max}`, "Kapazität")}
              {kachel(String(zahlen.bestaetigt), "bestätigt")}
              {kachel(String(zahlen.warteliste), "Warteliste")}
              {kachel(String(zahlen.bezahlt), "bezahlt")}
              {kachel(String(zahlen.offen), "offen", zahlen.offen > 0 ? GREEN : W)}
              {kachel(chf(zahlen.einnahmen), "Einnahmen")}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              <button onClick={exportieren} disabled={liste.length === 0}
                style={{
                  minHeight: 44, padding: "0 20px", borderRadius: 100, border: "none", cursor: "pointer",
                  background: GREEN, color: "#fff", fontSize: 13, fontWeight: 900,
                  letterSpacing: ".06em", textTransform: "uppercase", opacity: liste.length ? 1 : .5,
                }}>
                Teilnehmer exportieren
              </button>
              <button onClick={holen}
                style={{
                  minHeight: 44, padding: "0 20px", borderRadius: 100, cursor: "pointer",
                  background: "none", color: W, border: `1.5px solid ${LINE}`,
                  fontSize: 13, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase",
                }}>
                Aktualisieren
              </button>
            </div>

            {liste.length === 0 ? (
              <p style={{ color: MUT }}>Noch keine Anmeldungen.</p>
            ) : (
              <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
                  <thead>
                    <tr>
                      <th style={th}>Name</th>
                      <th style={th}>Kontakt</th>
                      <th style={th}>Spielstärke</th>
                      <th style={th}>Zahlung</th>
                      <th style={th}>Betrag</th>
                      <th style={th}>Warteliste</th>
                      <th style={th}>Anwesend</th>
                      <th style={th}>Angemeldet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map(t => {
                      const raus = t.status === "withdrawn"
                      return (
                        <tr key={t.id} style={raus ? { opacity: .45 } : undefined}>
                          <td style={td}>
                            <div style={{ fontWeight: 600 }}>
                              {t.first_name} {t.last_name}
                              {raus && <span style={{ color: MUT, fontWeight: 400 }}> · abgemeldet</span>}
                            </div>
                            <div style={{ color: MUT, fontSize: 12, marginTop: 2 }}>
                              {t.reg_type === "guest" ? "Gast" : "Player"}
                              {t.source ? ` · ${t.source}` : ""}
                            </div>
                          </td>
                          <td style={td}>
                            {t.email && <div><a href={`mailto:${t.email}`} style={{ color: W }}>{t.email}</a></div>}
                            {t.phone && <div style={{ marginTop: 3 }}><a href={`tel:${t.phone}`} style={{ color: MUT }}>{t.phone}</a></div>}
                          </td>
                          <td style={td}>{STAERKE[t.self_rating || ""] ?? t.self_rating ?? "—"}</td>
                          <td style={td}>{ZAHLUNG[t.payment_status || ""] ?? t.payment_status ?? "—"}</td>
                          <td style={td}>{betrag(t.amount_chf) > 0 ? chf(betrag(t.amount_chf)) : "—"}</td>
                          <td style={td}>{t.waitlist ? `ja${t.waitlist_pos ? ` · ${t.waitlist_pos}` : ""}` : "nein"}</td>
                          <td style={td}>{t.checked_in ? "ja" : "—"}</td>
                          <td style={{ ...td, color: MUT, whiteSpace: "nowrap" }}>{zeitpunkt(t.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ color: MUT, fontSize: 12.5, marginTop: 14, maxWidth: "68ch", lineHeight: 1.5 }}>
              Diese Liste enthält Kontaktdaten von Gästen. Nur für die Organisation des
              Turniers verwenden — nicht für Werbung, und nicht weitergeben.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
