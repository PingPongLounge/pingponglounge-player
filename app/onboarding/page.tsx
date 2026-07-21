"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BG as DARK, CARD, CELL, W as TEXT, MUT as MUTED, GREEN as G, GRAD, lvColor, lvGrad, LEVEL_DESCS, LEVEL_ELO, eloToLevel, ratingLabel, btn, input as inputBase } from "@/app/theme"

const LEVELS = [
  { name: "1", color: lvColor("1"), grad: lvGrad("1"), desc: LEVEL_DESCS["1"], elo: LEVEL_ELO["1"] },
  { name: "2", color: lvColor("2"), grad: lvGrad("2"), desc: LEVEL_DESCS["2"], elo: LEVEL_ELO["2"] },
  { name: "3", color: lvColor("3"), grad: lvGrad("3"), desc: LEVEL_DESCS["3"], elo: LEVEL_ELO["3"] },
  { name: "4", color: lvColor("4"), grad: lvGrad("4"), desc: LEVEL_DESCS["4"], elo: LEVEL_ELO["4"] },
  { name: "5", color: lvColor("5"), grad: lvGrad("5"), desc: LEVEL_DESCS["5"], elo: LEVEL_ELO["5"] },
  { name: "6", color: lvColor("6"), grad: lvGrad("6"), desc: LEVEL_DESCS["6"], elo: LEVEL_ELO["6"] },
  { name: "7", color: lvColor("7"), grad: lvGrad("7"), desc: LEVEL_DESCS["7"], elo: LEVEL_ELO["7"] },
]

// Nur drei Fragen — die vier gestrichenen (Rückhand, Backspin, Aufschlag-Effet,
// Spin erkennen) korrelieren so stark mit diesen, dass sie kaum Information
// bringen und nur Zeit kosten. ELO korrigiert die Einstufung ohnehin nach wenigen Spielen.
const QUIZ = [
  { q: "Wie lange spielst du schon Tischtennis?",
    opts: [{ l: "Unter 6 Monate", p: 0 },{ l: "6 Monate – 2 Jahre", p: 2 },{ l: "2 – 5 Jahre", p: 4 },{ l: "Mehr als 5 Jahre", p: 6 }] },
  { q: "Kannst du Topspin Vorhand spielen?",
    opts: [{ l: "Ja, sicher", p: 4 },{ l: "Manchmal", p: 2 },{ l: "Nein", p: 0 }] },
  { q: "Spielst du in einem Verein oder an Turnieren?",
    opts: [{ l: "Ja, an Turnieren", p: 5 },{ l: "Ja, im Verein", p: 3 },{ l: "Nein", p: 0 }] },
]

// Die drei grossen Karten auf dem ersten Screen — ein Tap und man ist eingestuft.
const QUICK = [
  { key: "2", title: "Anfänger",        desc: "Du spielst gelegentlich, zum Spass." },
  { key: "4", title: "Fortgeschritten", desc: "Du beherrschst Topspin und spielst regelmässig." },
  { key: "6", title: "Profi",           desc: "Verein, Turniere, sicheres Spiel mit Spin." },
]

const ALL_NICKS = [
  "TopspinKing","LoopMaster","BackspinPro","DropShotAce","FlickKing",
  "ChopLord","SmashHero","ServeAce","PaddleNinja","TableWizard",
  "NetKiller","CarbonBlade","LoopLegend","SpinDoctor","PenholdPro",
  "RallyGod","LobMaster","BlockWall","CounterLoop","DriveForce",
  "EffetKing","SidespinPro","GhostServe","MirrorLoop","PingKing",
  "TableLion","NetHawk","PaddleFox","SpinShark","LoopWolf",
  "SmashBull","ChopTiger","ServeEagle","BladeRunner","CarbonKing",
  "ForehandFire","BackhandSteel","CrossCourtKing","SpeedGlue","PipsOut",
  "ButterflyCut","DragonLoop","PhoenixSmash","TigerServe","PandaSpin",
  "ZenSpin","DarkLoop","TableKing","NetAce","EdgeBall",
  "SpinWizard","LoopArtist","SmashMachine","BlockMaster","ServeMaestro",
  "TableSamurai","PaddleKnight","SpinSensei","LoopShogun","SmashNinja"
]

// Max. Punktzahl im gekürzten Quiz: 6 + 4 + 5 = 15
function calcLevel(score: number) {
  if (score >= 14) return LEVELS[6]
  if (score >= 12) return LEVELS[5]
  if (score >= 9)  return LEVELS[4]
  if (score >= 7)  return LEVELS[3]
  if (score >= 5)  return LEVELS[2]
  if (score >= 3)  return LEVELS[1]
  return LEVELS[0]
}

// Nächstkleineres Level zu einer ELO (für den /spielen Hook-Flow).
function levelForElo(elo: number) {
  const key = eloToLevel(elo)
  return LEVELS.find(l => l.name === key) ?? LEVELS[0]
}

type PendingResult = { elo: number; won?: boolean; sets?: unknown; ort?: string; ts?: number }

const inp: React.CSSProperties = { ...inputBase, padding: "14px 16px", fontSize: "15px", boxSizing: "border-box" }
const primaryBtn = (disabled = false): React.CSSProperties => ({ ...btn, width: "100%", marginTop: "10px", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" })
const optBtn = (sel: boolean): React.CSSProperties => ({ width: "100%", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", color: TEXT, cursor: "pointer", textAlign: "left", marginBottom: "8px", fontWeight: sel ? 700 : 400, fontFamily: "inherit", display: "block", background: sel ? "rgba(255,255,255,.14)" : CELL })

export default function OnboardingPage() {
  const router = useRouter()
  // Schritte: 0 = Level (drei Karten) · 1 = Quiz (optional) · 2 = Spielername
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [mode, setMode] = useState<"" | "know" | "quiz">("")
  const [manualLevel, setManualLevel] = useState("")
  const [showAllLevels, setShowAllLevels] = useState(false)
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizScores, setQuizScores] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [nicks, setNicks] = useState<string[]>([])
  const [loadingNicks, setLoadingNicks] = useState(false)
  const [pending, setPending] = useState<PendingResult | null>(null)

  // Pending-Resultat aus dem /spielen Hook-Flow lesen (best-effort).
  // Wer über den QR-Code kommt, hat sein Level schon durchs Spielergebnis —
  // die Level-Frage entfällt, er landet direkt beim Spielernamen.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ppl_pending_result")
      if (!raw) return
      const parsed = JSON.parse(raw) as PendingResult
      if (parsed && typeof parsed.elo === "number" && Number.isFinite(parsed.elo)) {
        setPending(parsed)
        setStep(2)
      }
    } catch { /* ungültiges JSON o.ä. → normaler Flow */ }
  }, [])

  const score = quizScores.reduce((a, b) => a + b, 0)
  const quizResult = calcLevel(score)
  // Bei vorhandenem Pending-Resultat kommt das Level/ELO direkt aus dem Match-Ergebnis
  // und das Quiz/die Level-Auswahl entfällt.
  const pendingLevel = pending
    ? { ...levelForElo(pending.elo), elo: pending.elo }
    : null
  const chosenLevel = pendingLevel ?? (mode === "know" ? LEVELS.find(l => l.name === manualLevel) : quizResult)

  async function genNicknames() {
    setLoadingNicks(true)
    const supabase = createClient()
    // public_profiles statt profiles: RLS auf profiles lässt jeden nur die EIGENE
    // Zeile lesen — die Liste der vergebenen Namen wäre sonst immer leer.
    const { data } = await supabase.from("public_profiles").select("name")
    const taken = (data || []).map((p: { name: string | null }) => (p.name || "").toLowerCase()).filter(Boolean)
    const available = ALL_NICKS.filter(n => !taken.includes(n.toLowerCase()))
    const pool = available.length ? available : ALL_NICKS
    setNicks([...pool].sort(() => Math.random() - 0.5).slice(0, 3))
    setLoadingNicks(false)
  }

  async function handleSave() {
    if (!chosenLevel) return
    setSaving(true); setSaveError("")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setSaveError("Nicht eingeloggt"); return }
    // Echter Name und Kanton sind bewusst NICHT mehr Teil des Onboardings —
    // sie werden im Profil nachgetragen. Nur Spielername + Level sind nötig.
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, name: name.trim(), email: user.email,
      level: chosenLevel.name, elo: chosenLevel.elo,
    })
    if (error) { setSaveError("Fehler: " + error.message); setSaving(false); return }
    // Pending-Resultat aus dem /spielen Hook-Flow ist übernommen → aufräumen.
    if (pending) { try { localStorage.removeItem("ppl_pending_result") } catch { /* ignore */ } }
    try { await fetch("/api/credits/signup", { method: "POST" }) } catch { /* ignore */ }
    // Ab jetzt ist jeder automatisch in der Liga — es gibt kein Beitreten mehr.
    try { await fetch("/api/liga/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }) } catch { /* ignore */ }
    router.push("/entdecken")
  }

  function answerQuiz(points: number) {
    const next = [...quizScores, points]
    setQuizScores(next)
    if (quizIdx + 1 < QUIZ.length) setQuizIdx(quizIdx + 1)
    else setStep(2) // nach der letzten Frage direkt zum Spielernamen
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: DARK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }
  const box: React.CSSProperties = { maxWidth: "400px", width: "100%" }

  const Header = ({ step: s, total }: { step: number; total: number }) => (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>schritt {s} / {total}</span>
        <span style={{ fontSize: "11px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em" }}>PLAYER</span>
      </div>
      <div style={{ background: CELL, borderRadius: "4px", height: "3px" }}>
        <div style={{ background: GRAD, height: "3px", borderRadius: "4px", width: `${(s / total) * 100}%`, transition: "width 0.4s" }} />
      </div>
    </div>
  )

  // ── Schritt 0: Level. Ein Tap und man ist eingestuft. ────────────────────────
  if (step === 0 && !pending) return (
    <div style={wrap}><div style={box}>
      <Header step={1} total={2} />
      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>Wie gut spielst du?</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "24px" }}>Grob reicht — dein Level passt sich automatisch an, sobald du spielst.</p>

      {!showAllLevels && QUICK.map(q => {
        const l = LEVELS.find(x => x.name === q.key)!
        const sel = mode === "know" && manualLevel === q.key
        return (
          <button key={q.key} onClick={() => { setMode("know"); setManualLevel(q.key); setStep(2) }}
            style={{ ...optBtn(sel), padding: "18px 18px", marginBottom: "10px" }}>
            <span style={{ display: "block", fontSize: "17px", fontWeight: 900, color: l.color, marginBottom: "3px" }}>{q.title}</span>
            <span style={{ display: "block", fontSize: "13px", color: MUTED, lineHeight: 1.4 }}>{q.desc}</span>
          </button>
        )
      })}

      {showAllLevels && (
        <div style={{ marginBottom: "6px" }}>
          {LEVELS.map(l => (
            <button key={l.name} onClick={() => { setMode("know"); setManualLevel(l.name); setStep(2) }} style={optBtn(manualLevel === l.name)}>
              <span style={{ color: l.color, fontWeight: 800 }}>Level {l.name}</span>
              <span style={{ fontSize: "12px", color: MUTED, marginLeft: "8px" }}>{l.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Beide Wege bleiben freiwillig — niemand muss das Quiz machen */}
      <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
        <button type="button" onClick={() => setShowAllLevels(v => !v)}
          style={{ flex: 1, background: CELL, borderRadius: "10px", padding: "12px", fontSize: "12.5px", color: MUTED, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          {showAllLevels ? "Weniger anzeigen" : "Genauer einstufen"}
        </button>
        <button type="button" onClick={() => { setMode("quiz"); setQuizIdx(0); setQuizScores([]); setStep(1) }}
          style={{ flex: 1, background: CELL, borderRadius: "10px", padding: "12px", fontSize: "12.5px", color: MUTED, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Nicht sicher? 3 Fragen
        </button>
      </div>
    </div></div>
  )

  // ── Schritt 1: Quiz (freiwillig, 3 Fragen) ──────────────────────────────────
  if (step === 1) {
    const q = QUIZ[quizIdx]
    return (
      <div style={wrap}><div style={box}>
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>frage {quizIdx + 1} / {QUIZ.length}</span>
            <button type="button" onClick={() => setStep(0)} style={{ background: "none", fontSize: "11px", color: MUTED, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Zurück</button>
          </div>
          <div style={{ background: CELL, borderRadius: "4px", height: "3px" }}>
            <div style={{ background: GRAD, height: "3px", borderRadius: "4px", width: `${(quizIdx / QUIZ.length) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: TEXT, marginBottom: "24px", lineHeight: 1.3 }}>{q.q}</h2>
        {q.opts.map((o, i) => (
          <button key={i} style={optBtn(false)} onClick={() => answerQuiz(o.p)}>{o.l}</button>
        ))}
      </div></div>
    )
  }

  // ── Schritt 2: Spielername — das einzige Feld, das man tippen muss ──────────
  if (step === 2 && chosenLevel) return (
    <div style={wrap}><div style={box}>
      <Header step={2} total={2} />

      {pending && (
        <div style={{ background: "rgba(57,255,20,0.08)", borderRadius: "10px", padding: "12px 14px", marginBottom: "18px" }}>
          <p style={{ fontSize: "13px", color: G, fontWeight: 700, lineHeight: 1.4 }}>Dein Resultat ist gespeichert — sichere jetzt deinen Rang.</p>
        </div>
      )}

      {/* Einstufung als Ergebnis zeigen, nicht als weiteren Bestätigungsschritt */}
      <div style={{ background: CARD, borderRadius: "12px", padding: "14px 16px", marginBottom: "22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "10.5px", fontWeight: 700, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px" }}>Deine Einstufung</div>
          <div style={{ fontSize: "17px", fontWeight: 900, color: chosenLevel.color }}>Level {chosenLevel.name}</div>
          <div style={{ fontSize: "11.5px", color: MUTED, marginTop: "1px" }}>Start-Rating {ratingLabel(chosenLevel.elo)}</div>
        </div>
        {!pending && (
          <button type="button" onClick={() => { setStep(0); setShowAllLevels(false) }}
            style={{ background: CELL, borderRadius: "8px", padding: "8px 12px", fontSize: "11.5px", color: MUTED, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Ändern</button>
        )}
      </div>

      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>Dein Spielername</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "20px" }}>So sehen dich die anderen in der Rangliste.</p>

      <input style={inp} placeholder="Spielername" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <button type="button" onClick={genNicknames} style={{ background: CELL, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", color: MUTED, cursor: "pointer", marginBottom: "10px", letterSpacing: "0.04em", fontFamily: "inherit" }}>
        {loadingNicks ? "..." : "Vorschläge generieren"}
      </button>
      {nicks.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          {nicks.map(n => (
            <button key={n} type="button" onClick={() => setName(n)} style={{ background: name === n ? "rgba(255,255,255,.14)" : CELL, borderRadius: "8px", padding: "8px 14px", fontSize: "13px", color: TEXT, cursor: "pointer", fontWeight: name === n ? 700 : 400, fontFamily: "inherit" }}>
              {n}
            </button>
          ))}
        </div>
      )}

      {saveError && <p style={{ fontSize: "13px", color: "#E5484D", margin: "10px 0 0" }}>{saveError}</p>}

      <button style={primaryBtn(saving || !name.trim())} disabled={saving || !name.trim()} onClick={handleSave}>
        {saving ? "Wird gespeichert…" : "Los geht's"}
      </button>
      {!name.trim() && <p style={{ fontSize: "12px", color: MUTED, textAlign: "center", marginTop: "10px" }}>Wähl einen Spielernamen — oder nimm einen Vorschlag.</p>}

      <p style={{ fontSize: "11.5px", color: MUTED, textAlign: "center", marginTop: "16px", lineHeight: 1.5 }}>
        Echten Namen und Kanton kannst du später im Profil ergänzen.
      </p>
    </div></div>
  )

  return null
}
