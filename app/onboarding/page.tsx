"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"


const NICK_PARTS = {
  pre: ["Spin","Loop","Slice","Smash","Top","Quick","Ghost","Iron","Fire","Swift","Turbo","Power","Sharp","Ping","Ace"],
  suf: ["Master","King","Pro","Wolf","Fox","Hawk","Storm","Blade","Force","Drive","Shot","Hero","Bull","Ace","Play"]
}
function genNicks(): string[] {
  const result: string[] = []
  while (result.length < 3) {
    const p = NICK_PARTS.pre[Math.floor(Math.random()*NICK_PARTS.pre.length)]
    const s = NICK_PARTS.suf[Math.floor(Math.random()*NICK_PARTS.suf.length)]
    const n = p + s
    if (!result.includes(n)) result.push(n)
  }
  return result
}

const LOCATIONS = [
  "Aargau","Appenzell Ausserrhoden","Appenzell Innerrhoden",
  "Basel-Landschaft","Basel-Stadt","Bern","Freiburg","Genf",
  "Glarus","Graubünden","Jura","Luzern","Neuenburg",
  "Nidwalden","Obwalden","Schaffhausen","Schwyz",
  "Solothurn","St. Gallen","Tessin","Thurgau","Uri",
  "Waadt","Wallis","Zug","Zürich"
]

const LEVELS = [
  { name: "Locker", color: "#4ADE80", desc: "Einsteiger & Neueinsteiger", elo: 1000 },
  { name: "Hobby", color: "#FACC15", desc: "Regelmässiger Freizeitspieler", elo: 1100 },
  { name: "Fortgeschritten", color: "#FB923C", desc: "Vereinserfahrung & Taktik", elo: 1300 },
  { name: "Competitive", color: "#FF00C8", desc: "Turnierspieler & Wettkampf", elo: 1500 },
]

const QUIZ = [
  {
    question: "Wie lange spielst du schon Tischtennis?",
    options: [
      { label: "Weniger als 6 Monate", points: 0 },
      { label: "6 Monate bis 2 Jahre", points: 1 },
      { label: "2 bis 5 Jahre", points: 2 },
      { label: "Mehr als 5 Jahre", points: 3 },
    ]
  },
  {
    question: "Kannst du Topspin mit der Vorhand spielen?",
    options: [
      { label: "Ja, sicher", points: 2 },
      { label: "Manchmal", points: 1 },
      { label: "Nein", points: 0 },
    ]
  },
  {
    question: "Kannst du Topspin auch mit der Rückhand spielen?",
    options: [
      { label: "Ja, sicher", points: 2 },
      { label: "Manchmal", points: 1 },
      { label: "Nein", points: 0 },
    ]
  },
  {
    question: "Kannst du Backspin (Unterschnitt) spielen?",
    options: [
      { label: "Ja, gezielt einsetzen", points: 2 },
      { label: "Manchmal", points: 1 },
      { label: "Nein", points: 0 },
    ]
  },
  {
    question: "Kannst du Aufschläge mit Effet (Spin) spielen?",
    options: [
      { label: "Ja, verschiedene Varianten", points: 2 },
      { label: "Einfache Varianten", points: 1 },
      { label: "Nein", points: 0 },
    ]
  },
  {
    question: "Erkennst du den Spin deines Gegners und passt dein Spiel an?",
    options: [
      { label: "Ja, meistens", points: 2 },
      { label: "Manchmal", points: 1 },
      { label: "Nein", points: 0 },
    ]
  },
  {
    question: "Spielst du in einem Verein oder an Turnieren?",
    options: [
      { label: "Ja, an Turnieren", points: 3 },
      { label: "Ja, in einem Verein", points: 2 },
      { label: "Nein", points: 0 },
    ]
  },
]

function calcLevel(score: number) {
  if (score >= 12) return LEVELS[3]
  if (score >= 8) return LEVELS[2]
  if (score >= 4) return LEVELS[1]
  return LEVELS[0]
}

const S = {
  wrap: { minHeight: "100vh", background: "#0A0A0C", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" } as React.CSSProperties,
  box: { maxWidth: "420px", width: "100%" } as React.CSSProperties,
  chip: { fontSize: "11px", fontWeight: 700, color: "#FF00C8", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: "8px", display: "block" },
  title: { fontSize: "32px", fontWeight: 900, color: "#FFF9F3", textTransform: "uppercase" as const, lineHeight: 1.1, marginBottom: "8px" },
  sub: { fontSize: "14px", color: "#6B6E7A", marginBottom: "28px", lineHeight: 1.6 },
  input: { width: "100%", background: "#0D0E12", border: "1px solid #26282E", borderRadius: "10px", padding: "14px 16px", fontSize: "15px", color: "#FFF9F3", outline: "none", marginBottom: "10px", boxSizing: "border-box" as const },
  btn: (disabled = false) => ({ width: "100%", background: disabled ? "#26282E" : "#FF00C8", color: disabled ? "#6B6E7A" : "#0A0A0C", border: "none", borderRadius: "10px", padding: "15px", fontSize: "14px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginTop: "8px" } as React.CSSProperties),
  opt: (selected: boolean) => ({ width: "100%", background: selected ? "rgba(255,0,200,0.1)" : "#0D0E12", border: selected ? "1px solid #FF00C8" : "1px solid #26282E", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", color: selected ? "#FF00C8" : "#FFF9F3", cursor: "pointer", textAlign: "left" as const, marginBottom: "8px", fontWeight: selected ? 700 : 400 } as React.CSSProperties),
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [mode, setMode] = useState<"" | "know" | "quiz">("")
  const [manualLevel, setManualLevel] = useState("")
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizScores, setQuizScores] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [nicks, setNicks] = useState<string[]>([])

  const score = quizScores.reduce((a, b) => a + b, 0)
  const quizResult = calcLevel(score)
  const chosenLevel = mode === "know" ? LEVELS.find(l => l.name === manualLevel) : quizResult

  async function handleSave() {
    if (!chosenLevel) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from("profiles").upsert({
      id: user.id,
      name: name.trim(),
      email: user.email,
      location,
      level: chosenLevel.name,
      elo: chosenLevel.elo,
    })
    router.push("/")
  }

  function answerQuiz(points: number) {
    const next = [...quizScores, points]
    setQuizScores(next)
    if (quizIdx + 1 < QUIZ.length) {
      setQuizIdx(quizIdx + 1)
    } else {
      setStep(3)
    }
  }

  if (step === 0) return (
    <div style={S.wrap}><div style={S.box}>
      <span style={S.chip}>Willkommen</span>
      <h1 style={S.title}>Dein Profil</h1>
      <p style={S.sub}>Kurz einrichten — dann kann es losgehen.</p>
      <input style={S.input} placeholder="Dein Name / Spitzname" value={name} onChange={e => setName(e.target.value)} />
      <button type="button" onClick={() => setNicks(genNicks())} style={{ background: "none", border: "1px solid #26282E", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: "#6B6E7A", cursor: "pointer", marginBottom: "10px", letterSpacing: "0.04em" }}>
        Vorschläge generieren
      </button>
      {nicks.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {nicks.map(n => (
            <button key={n} type="button" onClick={() => setName(n)} style={{ background: name === n ? "rgba(255,0,200,0.12)" : "#0D0E12", border: name === n ? "1px solid #FF00C8" : "1px solid #26282E", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", color: name === n ? "#FF00C8" : "#FFF9F3", cursor: "pointer", fontWeight: name === n ? 700 : 400 }}>
              {n}
            </button>
          ))}
        </div>
      )}
      <select style={S.input} value={location} onChange={e => setLocation(e.target.value)}>
        <option value="">Kanton wählen...</option>
        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <button style={S.btn(!name.trim() || !location)} disabled={!name.trim() || !location} onClick={() => setStep(1)}>Weiter</button>
    </div></div>
  )

  if (step === 1) return (
    <div style={S.wrap}><div style={S.box}>
      <span style={S.chip}>Schritt 2 / 3</span>
      <h1 style={S.title}>Dein Level</h1>
      <p style={S.sub}>Kennst du dein Spielniveau bereits?</p>
      <button style={S.opt(mode === "know")} onClick={() => setMode("know")}>Ja, ich kenne mein Level</button>
      <button style={S.opt(mode === "quiz")} onClick={() => setMode("quiz")}>Nein, hilf mir es herausfinden</button>
      {mode === "know" && (
        <div style={{ marginTop: "16px" }}>
          {LEVELS.map(l => (
            <button key={l.name} style={S.opt(manualLevel === l.name)} onClick={() => setManualLevel(l.name)}>
              <span style={{ color: l.color }}>{l.name}</span> — <span style={{ fontSize: "13px", color: "#6B6E7A" }}>{l.desc}</span>
            </button>
          ))}
        </div>
      )}
      <button
        style={S.btn(!mode || (mode === "know" && !manualLevel))}
        disabled={!mode || (mode === "know" && !manualLevel)}
        onClick={() => mode === "quiz" ? setStep(2) : setStep(3)}
      >Weiter</button>
    </div></div>
  )

  if (step === 2) {
    const q = QUIZ[quizIdx]
    const pct = Math.round((quizIdx / QUIZ.length) * 100)
    return (
      <div style={S.wrap}><div style={S.box}>
        <span style={S.chip}>Frage {quizIdx + 1} von {QUIZ.length}</span>
        <div style={{ background: "#1A1B1F", borderRadius: "4px", height: "4px", marginBottom: "28px" }}>
          <div style={{ background: "#FF00C8", height: "4px", borderRadius: "4px", width: `${pct}%`, transition: "width 0.3s" }} />
        </div>
        <h2 style={{ ...S.title, fontSize: "22px", marginBottom: "28px" }}>{q.question}</h2>
        {q.options.map((o, i) => (
          <button key={i} style={S.opt(false)} onClick={() => answerQuiz(o.points)}>{o.label}</button>
        ))}
      </div></div>
    )
  }

  if (step === 3 && chosenLevel) return (
    <div style={S.wrap}><div style={S.box}>
      <span style={S.chip}>{mode === "quiz" ? "Dein Ergebnis" : "Bestätigung"}</span>
      <h1 style={{ ...S.title, color: chosenLevel.color, fontSize: "44px" }}>{chosenLevel.name}</h1>
      <p style={S.sub}>{chosenLevel.desc}</p>
      <div style={{ background: "#0D0E12", border: "1px solid #26282E", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        {[
          { label: "Name", value: name },
          { label: "Standort", value: location },
          { label: "Level", value: chosenLevel.name },
          { label: "Start-ELO", value: String(chosenLevel.elo) },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #1A1B1F" }}>
            <span style={{ fontSize: "13px", color: "#6B6E7A" }}>{row.label}</span>
            <span style={{ fontSize: "13px", color: "#FFF9F3", fontWeight: 700 }}>{row.value}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "12px", color: "#6B6E7A", marginBottom: "16px" }}>Dein Level passt sich automatisch an je mehr du spielst.</p>
      <button style={S.btn(saving)} disabled={saving} onClick={handleSave}>
        {saving ? "Wird gespeichert..." : "Profil erstellen"}
      </button>
    </div></div>
  )

  return null
}