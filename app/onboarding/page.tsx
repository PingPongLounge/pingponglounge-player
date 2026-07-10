"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BG as DARK, CARD, CELL, W as TEXT, MUT as MUTED, GREEN as G, GRAD, lvColor, lvGrad, LEVEL_DESCS, LEVEL_ELO, eloToLevel, btn, input as inputBase } from "@/app/theme"

const LEVELS = [
  { name: "1", color: lvColor("1"), grad: lvGrad("1"), desc: LEVEL_DESCS["1"], elo: LEVEL_ELO["1"] },
  { name: "2", color: lvColor("2"), grad: lvGrad("2"), desc: LEVEL_DESCS["2"], elo: LEVEL_ELO["2"] },
  { name: "3", color: lvColor("3"), grad: lvGrad("3"), desc: LEVEL_DESCS["3"], elo: LEVEL_ELO["3"] },
  { name: "4", color: lvColor("4"), grad: lvGrad("4"), desc: LEVEL_DESCS["4"], elo: LEVEL_ELO["4"] },
  { name: "5", color: lvColor("5"), grad: lvGrad("5"), desc: LEVEL_DESCS["5"], elo: LEVEL_ELO["5"] },
  { name: "6", color: lvColor("6"), grad: lvGrad("6"), desc: LEVEL_DESCS["6"], elo: LEVEL_ELO["6"] },
  { name: "7", color: lvColor("7"), grad: lvGrad("7"), desc: LEVEL_DESCS["7"], elo: LEVEL_ELO["7"] },
]

const CANTON_MAP: Record<string, string> = {
  "Aargau":"AG","Appenzell Ausserrhoden":"AR","Appenzell Innerrhoden":"AI",
  "Basel-Landschaft":"BL","Basel-Stadt":"BS","Bern":"BE","Freiburg":"FR",
  "Genf":"GE","Glarus":"GL","Graubünden":"GR","Jura":"JU","Luzern":"LU",
  "Neuenburg":"NE","Nidwalden":"NW","Obwalden":"OW","Schaffhausen":"SH",
  "Schwyz":"SZ","Solothurn":"SO","St. Gallen":"SG","Tessin":"TI",
  "Thurgau":"TG","Uri":"UR","Waadt":"VD","Wallis":"VS","Zug":"ZG","Zürich":"ZH",
}
const CANTONS = Object.keys(CANTON_MAP)

const QUIZ = [
  { q: "Wie lange spielst du schon Tischtennis?",
    opts: [{ l: "Unter 6 Monate", p: 0 },{ l: "6 Monate – 2 Jahre", p: 1 },{ l: "2 – 5 Jahre", p: 2 },{ l: "Mehr als 5 Jahre", p: 3 }] },
  { q: "Kannst du Topspin Vorhand spielen?",
    opts: [{ l: "Ja, sicher", p: 2 },{ l: "Manchmal", p: 1 },{ l: "Nein", p: 0 }] },
  { q: "Kannst du Topspin Rückhand spielen?",
    opts: [{ l: "Ja, sicher", p: 2 },{ l: "Manchmal", p: 1 },{ l: "Nein", p: 0 }] },
  { q: "Kannst du Backspin (Unterschnitt) spielen?",
    opts: [{ l: "Ja, gezielt", p: 2 },{ l: "Manchmal", p: 1 },{ l: "Nein", p: 0 }] },
  { q: "Kannst du Aufschläge mit Effet spielen?",
    opts: [{ l: "Ja, verschiedene", p: 2 },{ l: "Einfache Varianten", p: 1 },{ l: "Nein", p: 0 }] },
  { q: "Erkennst du den Spin deines Gegners?",
    opts: [{ l: "Ja, meistens", p: 2 },{ l: "Manchmal", p: 1 },{ l: "Nein", p: 0 }] },
  { q: "Spielst du in einem Verein oder an Turnieren?",
    opts: [{ l: "Ja, an Turnieren", p: 3 },{ l: "Ja, im Verein", p: 2 },{ l: "Nein", p: 0 }] },
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

function calcLevel(score: number) {
  if (score >= 14) return LEVELS[6]
  if (score >= 11) return LEVELS[5]
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
const optBtn = (sel: boolean): React.CSSProperties => ({ width: "100%", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", color: TEXT, cursor: "pointer", textAlign: "left", marginBottom: "8px", fontWeight: sel ? 700 : 400, fontFamily: "inherit", display: "block", border: sel ? "1.5px solid transparent" : "1.5px solid transparent", background: sel ? `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` : CELL })

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [canton, setCanton] = useState("")
  const [mode, setMode] = useState<"" | "know" | "quiz">("")
  const [manualLevel, setManualLevel] = useState("")
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizScores, setQuizScores] = useState<number[]>([])
  const [realName, setRealName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [nicks, setNicks] = useState<string[]>([])
  const [loadingNicks, setLoadingNicks] = useState(false)
  const [pending, setPending] = useState<PendingResult | null>(null)

  // Pending-Resultat aus dem /spielen Hook-Flow lesen (best-effort).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ppl_pending_result")
      if (!raw) return
      const parsed = JSON.parse(raw) as PendingResult
      if (parsed && typeof parsed.elo === "number" && Number.isFinite(parsed.elo)) {
        setPending(parsed)
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
    const { data } = await supabase.from("profiles").select("name")
    const taken = (data || []).map((p: { name: string }) => p.name.toLowerCase())
    const available = ALL_NICKS.filter(n => !taken.includes(n.toLowerCase()))
    setNicks([...available].sort(() => Math.random() - 0.5).slice(0, 3))
    setLoadingNicks(false)
  }

  async function handleSave() {
    if (!chosenLevel) return
    setSaving(true); setSaveError("")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setSaveError("Nicht eingeloggt"); return }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, name: name.trim(), email: user.email,
      real_name: realName.trim() || null,
      canton: CANTON_MAP[canton] ?? canton,
      level: chosenLevel.name, elo: chosenLevel.elo,
    })
    if (error) { setSaveError("Fehler: " + error.message); setSaving(false); return }
    // Pending-Resultat aus dem /spielen Hook-Flow ist übernommen → aufräumen.
    if (pending) { try { localStorage.removeItem("ppl_pending_result") } catch { /* ignore */ } }
    try { await fetch("/api/credits/signup", { method: "POST" }) } catch { /* ignore */ }
    router.push("/entdecken")
  }

  function answerQuiz(points: number) {
    const next = [...quizScores, points]
    setQuizScores(next)
    if (quizIdx + 1 < QUIZ.length) setQuizIdx(quizIdx + 1)
    else setStep(3)
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

  if (step === 0) return (
    <div style={wrap}><div style={box}>
      <Header step={1} total={pending ? 2 : 3} />
      {pending && (
        <div style={{ background: "rgba(57,255,20,0.08)", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
          <p style={{ fontSize: "13px", color: G, fontWeight: 700, lineHeight: 1.4 }}>Dein Resultat ist gespeichert — sichere jetzt deinen Rang.</p>
        </div>
      )}
      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>Dein Profil</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "28px" }}>{pending ? "Nur noch Name + Kanton — dann ist dein Rang fix." : "Kurz einrichten — dann geht es los."}</p>
      <input style={inp} placeholder="Vor- und Nachname" value={realName} onChange={e => setRealName(e.target.value)} />
      <p style={{ fontSize: "11px", color: MUTED, margin: "-8px 0 14px 2px" }}>Erscheint nur als „Vorname N." — voll nur in deinem Profil.</p>
      <input style={inp} placeholder="Spielername (Nickname)" value={name} onChange={e => setName(e.target.value)} />
      <button type="button" onClick={genNicknames} style={{ background: "none", border: "1px solid " + CELL, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", color: MUTED, cursor: "pointer", marginBottom: "10px", letterSpacing: "0.04em", fontFamily: "inherit" }}>
        {loadingNicks ? "..." : "Vorschläge generieren"}
      </button>
      {nicks.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {nicks.map(n => (
            <button key={n} type="button" onClick={() => setName(n)} style={{ background: name === n ? `linear-gradient(${CARD},${CARD}) padding-box, ${GRAD} border-box` : CELL, border: "1.5px solid transparent", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", color: TEXT, cursor: "pointer", fontWeight: name === n ? 700 : 400, fontFamily: "inherit" }}>
              {n}
            </button>
          ))}
        </div>
      )}
      <select style={{ ...inp, marginTop: "4px" }} value={canton} onChange={e => setCanton(e.target.value)}>
        <option value="">Kanton wählen...</option>
        {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button style={primaryBtn(!name.trim() || !realName.trim())} disabled={!name.trim() || !realName.trim()} onClick={() => setStep(pending ? 3 : 1)}>Weiter</button>
    </div></div>
  )

  if (step === 1) return (
    <div style={wrap}><div style={box}>
      <Header step={2} total={3} />
      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>Dein Level</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "28px" }}>Kennst du dein Spielniveau?</p>
      <button style={optBtn(mode === "know")} onClick={() => setMode("know")}>Ja, ich kenne mein Level</button>
      <button style={optBtn(mode === "quiz")} onClick={() => setMode("quiz")}>Nein — hilf mir es herauszufinden</button>
      {mode === "know" && (
        <div style={{ marginTop: "16px" }}>
          {LEVELS.map(l => (
            <button key={l.name} style={optBtn(manualLevel === l.name)} onClick={() => setManualLevel(l.name)}>
              <span style={{ color: l.color, fontWeight: 800 }}>Level {l.name}</span>
              <span style={{ fontSize: "12px", color: MUTED, marginLeft: "8px" }}>{l.desc}</span>
            </button>
          ))}
        </div>
      )}
      <button style={primaryBtn(!mode || (mode === "know" && !manualLevel))} disabled={!mode || (mode === "know" && !manualLevel)} onClick={() => mode === "quiz" ? setStep(2) : setStep(3)}>Weiter</button>
    </div></div>
  )

  if (step === 2) {
    const q = QUIZ[quizIdx]
    return (
      <div style={wrap}><div style={box}>
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>frage {quizIdx + 1} / {QUIZ.length}</span>
          </div>
          <div style={{ background: CELL, borderRadius: "4px", height: "3px" }}>
            <div style={{ background: GRAD, height: "3px", borderRadius: "4px", width: `${((quizIdx) / QUIZ.length) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: TEXT, marginBottom: "24px", lineHeight: 1.3 }}>{q.q}</h2>
        {q.opts.map((o, i) => (
          <button key={i} style={optBtn(false)} onClick={() => answerQuiz(o.p)}>{o.l}</button>
        ))}
      </div></div>
    )
  }

  if (step === 3 && chosenLevel) return (
    <div style={wrap}><div style={box}>
      <Header step={pending ? 2 : 3} total={pending ? 2 : 3} />
      <p style={{ fontSize: "11px", fontWeight: 700, color: chosenLevel.color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" }}>{pending ? "Dein Start-Rang" : mode === "quiz" ? "Dein Ergebnis" : "Bestätigung"}</p>
      <h2 style={{ fontSize: "40px", fontWeight: 900, color: chosenLevel.color, textTransform: "uppercase", marginBottom: "4px", letterSpacing: "-0.02em" }}>Level {chosenLevel.name}</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "28px" }}>{chosenLevel.desc}</p>
      <div style={{ background: CARD, borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        {[{ label: "Name", value: name }, { label: "Kanton", value: canton }, { label: "Level", value: chosenLevel.name }, { label: "Start-ELO", value: String(chosenLevel.elo) }].map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <span style={{ fontSize: "13px", color: MUTED }}>{row.label}</span>
            <span style={{ fontSize: "13px", color: TEXT, fontWeight: 700 }}>{row.value}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", lineHeight: 1.6 }}>Dein Level passt sich automatisch an, je mehr du spielst — ELO startet bei {chosenLevel.elo}.</p>
      {saveError && <p style={{ fontSize: "13px", color: "#E5484D", marginBottom: "10px" }}>{saveError}</p>}
      <button style={primaryBtn(saving)} disabled={saving} onClick={handleSave}>
        {saving ? "Wird gespeichert…" : "Profil erstellen"}
      </button>
    </div></div>
  )

  return null
}