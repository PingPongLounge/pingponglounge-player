"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import { SectionBlock, SectionIntro, SectionTopBar } from "@/app/components/SectionUI"
import { ratingLabel } from "@/app/theme"
import { OG_TRAINING_PREIS_CHF } from "@/lib/opengames"

const BG = "#20242C", CARD = "#2A2F39", CELL = "#353B46", W = "#FFFFFF"
const MUT = "rgba(255,255,255,.82)", GREEN = "#39FF14"
const GRAD = "linear-gradient(135deg,#39FF14,#1FD1C4)"

type Player = { user_id: string; name: string; elo: number; level: string }
type Training = {
  id: string; location_name: string; date: string | null; start_hour: number | null
  duration_minutes: number; max_players: number; current_players: number; price_per_player: number
  players: Player[]
}

function whenLabel(date: string | null, hour: number | null): string {
  if (!date) return hour != null ? `${String(hour).padStart(2, "0")}:00` : "Zeit offen"
  const d = new Date(`${date}T12:00:00`)
  const ds = d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" })
  return `${ds} · ${String(hour ?? 19).padStart(2, "0")}:00–20:30`
}

export default function TrainingPage() {
  const [list, setList] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/training")
        const j = await r.json()
        setList(j.trainings || [])
      } catch { /* still */ }
      setLoading(false)
    })()
  }, [])

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "0 0 100px" }}>
      <SectionTopBar section="Training" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "6px 16px 0" }}>
        <SectionBlock title="Training" meta={`Geführtes Coaching · CHF ${OG_TRAINING_PREIS_CHF} · alle Level`} img="/training-hero.jpg" />

        <SectionIntro storageKey="intro_training_v2" title="So funktioniert's" steps={[
          ["1", "Termin wählen", "Jeden Donnerstag in Glattbrugg, 19:00–20:30 — 8 Plätze, alle Level."],
          ["2", "Platz sichern", `CHF ${OG_TRAINING_PREIS_CHF} pro Person, direkt bezahlt. Absage bis 24 h vorher, Geld zurück.`],
          ["3", "Besser werden", "Drills und Matchpraxis mit Trainer. Zutritt per QR an der Tür."],
        ]} />

        <div style={{ margin: "24px 4px 12px", fontSize: 16, fontWeight: 900, textTransform: "uppercase", color: W }}>Nächste Trainings</div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: MUT, fontSize: 13 }}>Lädt …</div>
        ) : list.length === 0 ? (
          <div style={{ background: CARD, borderRadius: 18, padding: 22, textAlign: "center", color: MUT, fontSize: 14 }}>Aktuell keine Trainings ausgeschrieben.</div>
        ) : (
          <div style={{ background: CARD, borderRadius: 22, padding: "4px 16px" }}>
            {list.map((t, i) => {
              const frei = Math.max(0, t.max_players - t.current_players)
              const d = t.date ? new Date(`${t.date}T12:00:00`) : null
              return (
                <div key={t.id} style={{ padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.07)" }}>
                  <Link href={`/match/${t.id}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 46, flexShrink: 0 }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: W, lineHeight: 1 }}>{d ? d.toLocaleDateString("de-CH", { weekday: "short" }).replace(".", "") : "—"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: MUT, marginTop: 2 }}>{d ? d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" }) : ""}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: W }}>{whenLabel(t.date, t.start_hour)}</span>
                      <span style={{ display: "block", fontSize: 13, color: MUT, marginTop: 2 }}>{t.location_name} · {frei} von {t.max_players} frei</span>
                    </span>
                    {frei === 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: MUT, width: 96, textAlign: "center", flexShrink: 0 }}>Ausgebucht</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#06210F", background: GRAD, borderRadius: 9, padding: "9px 0", width: 96, textAlign: "center", flexShrink: 0 }}>Mitmachen</span>
                    )}
                  </Link>

                  {/* Wer kommt — mit Level, damit du das Niveau siehst */}
                  {t.players.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingLeft: 58 }}>
                      {t.players.map(p => (
                        <span key={p.user_id} style={{ fontSize: 12, fontWeight: 700, color: W, background: CELL, borderRadius: 999, padding: "5px 10px" }}>
                          {p.name} <span style={{ color: GREEN, fontWeight: 800 }}>{ratingLabel(p.elo)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
