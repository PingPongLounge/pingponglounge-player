"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const G = "#39FF14"
const DARK = "#0A0A0C"
const SURFACE = "#111214"
const CARD = "#15161A"
const BORDER = "#26282E"
const TEXT = "#E8E6E1"
const MUTED = "#6B6E7A"
const PK = "#FF00C8"

const LEVELS = [
  { name: "Rookie",     color: "#4ADE80", desc: "Einsteiger, spiele zum Spass",       elo: 1000 },
  { name: "Challenger", color: "#FACC15", desc: "Regelmässiger Freizeitspieler",       elo: 1100 },
  { name: "Advanced",   color: "#FB923C", desc: "Vereinserfahrung & Taktik",           elo: 1300 },
  { name: "Elite",      color: PK,        desc: "Turnierspieler & Wettkampf",          elo: 1500 },
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
  if (score >= 12) return LEVELS[3]
  if (score >= 8)  return LEVELS[2]
  if (score >= 4)  return LEVELS[1]
  return LEVELS[0]
}

// Nächstkleineres Level zu einer ELO (für den /spielen Hook-Flow).
function levelForElo(elo: number) {
  let chosen = LEVELS[0]
  for (const l of LEVELS) if (elo >= l.elo) chosen = l
  return chosen
}

type PendingResult = { elo: number; won?: boolean; sets?: unknown; ort?: string; ts?: number }

const inp: React.CSSProperties = { width: "100%", background: SURFACE, border: "1px solid " + BORDER, borderRadius: "10px", padding: "14px 16px", fontSize: "15px", color: TEXT, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }
const primaryBtn = (disabled = false): React.CSSProperties => ({ width: "100%", background: disabled ? BORDER : G, color: disabled ? MUTED : DARK, border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "10px", fontFamily: "inherit" })
const optBtn = (sel: boolean): React.CSSProperties => ({ width: "100%", background: sel ? "rgba(57,255,20,0.08)" : CARD, border: sel ? "1px solid " + G : "1px solid " + BORDER, borderRadius: "10px", padding: "14px 16px", fontSize: "14px", color: sel ? G : TEXT, cursor: "pointer", textAlign: "left", marginBottom: "8px", fontWeight: sel ? 700 : 400, fontFamily: "inherit", display: "block" })

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [canton, setCanton] = useState("")
  const [mode, setMode] = useState<"" | "know" | "quiz">("")
  const [manualLevel, setManualLevel] = useState("")
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizScores, setQuizScores] = useState<number[]>([])
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
        <span style={{ fontSize: "11px", fontWeight: 700, color: G, letterSpacing: "0.14em", textTransform: "uppercase" }}>Schritt {s} / {total}</span>
        <span style={{ fontSize: "11px", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em" }}>PLAYER</span>
      </div>
      <div style={{ background: BORDER, borderRadius: "4px", height: "3px" }}>
        <div style={{ background: G, height: "3px", borderRadius: "4px", width: `${(s / total) * 100}%`, transition: "width 0.4s" }} />
      </div>
    </div>
  )

  if (step === 0) return (
    <div style={wrap}><div style={box}>
      <Header step={1} total={pending ? 2 : 3} />
      {pending && (
        <div style={{ background: "rgba(57,255,20,0.08)", border: "1px solid " + G + "55", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
          <p style={{ fontSize: "13px", color: G, fontWeight: 700, lineHeight: 1.4 }}>Dein Resultat ist gespeichert — sichere jetzt deinen Rang.</p>
        </div>
      )}
      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "uppercase", marginBottom: "6px" }}>Dein Profil</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "28px" }}>{pending ? "Nur noch Name + Kanton — dann ist dein Rang fix." : "Kurz einrichten — dann geht es los."}</p>
      <input style={inp} placeholder="Dein Name oder Spitzname" value={name} onChange={e => setName(e.target.value)} />
      <button type="button" onClick={genNicknames} style={{ background: "none", border: "1px solid " + BORDER, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", color: MUTED, cursor: "pointer", marginBottom: "10px", letterSpacing: "0.04em", fontFamily: "inherit" }}>
        {loadingNicks ? "..." : "Vorschläge generieren"}
      </button>
      {nicks.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {nicks.map(n => (
            <button key={n} type="button" onClick={() => setName(n)} style={{ background: name === n ? "rgba(57,255,20,0.1)" : CARD, border: name === n ? "1px solid " + G : "1px solid " + BORDER, borderRadius: "8px", padding: "8px 14px", fontSize: "13px", color: name === n ? G : TEXT, cursor: "pointer", fontWeight: name === n ? 700 : 400, fontFamily: "inherit" }}>
              {n}
            </button>
          ))}
        </div>
      )}
      <select style={{ ...inp, marginTop: "4px" }} value={canton} onChange={e => setCanton(e.target.value)}>
        <option value="">Kanton wählen...</option>
        {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button style={primaryBtn(!name.trim() || !canton)} disabled={!name.trim() || !canton} onClick={() => setStep(pending ? 3 : 1)}>Weiter</button>
    </div></div>
  )

  if (step === 1) return (
    <div style={wrap}><div style={box}>
      <Header step={2} total={3} />
      <h2 style={{ fontSize: "28px", fontWeight: 900, color: TEXT, textTransform: "uppercase", marginBottom: "6px" }}>Dein Level</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "28px" }}>Kennst du dein Spielniveau?</p>
      <button style={optBtn(mode === "know")} onClick={() => setMode("know")}>Ja, ich kenne mein Level</button>
      <button style={optBtn(mode === "quiz")} onClick={() => setMode("quiz")}>Nein — hilf mir es herausfinden</button>
      {mode === "know" && (
        <div style={{ marginTop: "16px" }}>
          {LEVELS.map(l => (
            <button key={l.name} style={optBtn(manualLevel === l.name)} onClick={() => setManualLevel(l.name)}>
              <span style={{ color: l.color, fontWeight: 800 }}>{l.name}</span>
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
            <span style={{ fontSize: "11px", fontWeight: 700, color: G, letterSpacing: "0.14em", textTransform: "uppercase" }}>Frage {quizIdx + 1} / {QUIZ.length}</span>
          </div>
          <div style={{ background: BORDER, borderRadius: "4px", height: "3px" }}>
            <div style={{ background: G, height: "3px", borderRadius: "4px", width: `${((quizIdx) / QUIZ.length) * 100}%`, transition: "width 0.3s" }} />
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
      <h2 style={{ fontSize: "40px", fontWeight: 900, color: chosenLevel.color, textTransform: "uppercase", marginBottom: "4px", letterSpacing: "-0.02em" }}>{chosenLevel.name}</h2>
      <p style={{ fontSize: "14px", color: MUTED, marginBottom: "28px" }}>{chosenLevel.desc}</p>
      <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        {[{ label: "Name", value: name }, { label: "Kanton", value: canton }, { label: "Level", value: chosenLevel.name }, { label: "Start-ELO", value: String(chosenLevel.elo) }].map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + BORDER }}>
            <span style={{ fontSize: "13px", color: MUTED }}>{row.label}</span>
            <span style={{ fontSize: "13px", color: TEXT, fontWeight: 700 }}>{row.value}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", lineHeight: 1.6 }}>Dein Level passt sich automatisch an je mehr du spielst — ELO startet bei {chosenLevel.elo}.</p>
      {saveError && <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "10px" }}>{saveError}</p>}
      <button style={primaryBtn(saving)} disabled={saving} onClick={handleSave}>
        {saving ? "Wird gespeichert..." : "Profil erstellen →"}
      </button>
    </div></div>
  )

  return null
}