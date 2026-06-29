"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import BottomNav from "@/app/components/BottomNav"
import Link from "next/link"
import {
  BG, CELL, W, SUB, MUT, LINE, DANGER, GREEN,
  gt, cardPad, cardActive, cellKey,
  chipBtn, btn, btnGhost, input, label, h1, h2, body, meta, eyebrow,
} from "@/app/theme"

// ─── LOKALE STYLE-ALIASE (auf Theme-Tokens gemappt, keine Logik) ───────────────
const TEXT = W
const LBL  = MUT
const G    = GREEN

// ─── TYPEN ────────────────────────────────────────────────────────────────────
type Slot = { hour: number; start: string; end: string; available: boolean; tablesBooked?: number }
type Step = "picker" | "details" | "confirm" | "done"

// ─── STANDORTE ────────────────────────────────────────────────────────────────
const LOCATIONS = [
  { id: "oerlikon",    resourceId: "142166", name: "Oerlikon",    city: "Zürich",
    tables: 7, pricePerHour: 25, priceHalfHour: 15,
    requiresPayment: false, eversports: null as string | null, teamOnly: false,
    openHours: [
      { dow: 2, open: "18:00", close: "22:00" }, { dow: 3, open: "18:00", close: "22:00" },
      { dow: 4, open: "18:00", close: "22:00" }, { dow: 5, open: "18:00", close: "22:00" },
    ]},
  { id: "langstrasse", resourceId: "206740", name: "Langstrasse", city: "Zürich",
    tables: 5, pricePerHour: 25, priceHalfHour: 15,
    requiresPayment: false, eversports: null as string | null, teamOnly: false,
    openHours: [
      { dow: 3, open: "18:00", close: "22:00" }, { dow: 4, open: "18:00", close: "00:00" },
      { dow: 5, open: "18:00", close: "21:00" }, { dow: 6, open: "18:00", close: "21:00" },
    ]},
  { id: "glattbrugg",  resourceId: "",       name: "Glattbrugg",  city: "Opfikon",
    tables: 9, pricePerHour: 25, priceHalfHour: 15,
    requiresPayment: false, eversports: "https://www.eversports.ch/widget/w/5a5zxf", teamOnly: false,
    tag: "24/7", openHours: [] as { dow: number; open: string; close: string }[] },
  { id: "basel",       resourceId: "251796", name: "Basel",       city: "Basel",
    tables: 5, pricePerHour: 25, priceHalfHour: 15,
    requiresPayment: false, eversports: null as string | null, teamOnly: false,
    openHours: [
      { dow: 5, open: "18:00", close: "22:00" }, { dow: 6, open: "18:00", close: "22:00" },
    ]},
  { id: "luzern",      resourceId: "229327", name: "Luzern",      city: "Kriens",
    tables: 6, pricePerHour: 25, priceHalfHour: 15,
    requiresPayment: false, eversports: null as string | null, teamOnly: true,
    tag: "Teamevents", openHours: [] as { dow: number; open: string; close: string }[] },
  { id: "stgallen",    resourceId: "251795", name: "St. Gallen",  city: "St. Gallen",
    tables: 4, pricePerHour: 20, priceHalfHour: 10,
    requiresPayment: true, eversports: null as string | null, teamOnly: false,
    openHours: [
      { dow: 0, open: "07:00", close: "00:00" }, { dow: 1, open: "07:00", close: "00:00" },
      { dow: 2, open: "07:00", close: "00:00" }, { dow: 3, open: "07:00", close: "00:00" },
      { dow: 4, open: "07:00", close: "00:00" }, { dow: 5, open: "07:00", close: "00:00" },
      { dow: 6, open: "07:00", close: "00:00" },
    ]},
]
type Location = typeof LOCATIONS[0]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function pad(n: number) { return String(n).padStart(2, "0") }
function formatDate(d: Date) {
  return d.toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" })
}
function getOpenStatus(loc: Location): { open: boolean; label: string } {
  if ((loc as any).tag === "24/7") return { open: true, label: "24/7 Offen" }
  const now = new Date()
  const dow = now.getDay()
  const hhmm = now.getHours() * 60 + now.getMinutes()
  const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h === 0 && m === 0 ? 24*60 : h*60+m }
  const slot = loc.openHours.find(h => h.dow === dow)
  if (!slot) return { open: false, label: "Geschlossen" }
  return hhmm >= toMin(slot.open) && hhmm < toMin(slot.close)
    ? { open: true,  label: `Offen · bis ${slot.close}` }
    : { open: false, label: `Öffnet ${slot.open}` }
}

// ─── STEP BAR ─────────────────────────────────────────────────────────────────
const STEP_ORDER: Step[] = ["picker", "details", "confirm", "done"]
const STEP_LABELS: Record<Step, string> = { picker: "Wählen", details: "Angaben", confirm: "Bestätigen", done: "Fertig" }
function StepBar({ current }: { current: Step }) {
  if (current === "done") return null
  const idx = STEP_ORDER.indexOf(current)
  const visible = STEP_ORDER.filter(s => s !== "done")
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 16 }}>
      {visible.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: done || active ? TEXT : "transparent",
                border: done || active ? "none" : `1px solid ${CELL}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {done
                  ? <svg viewBox="0 0 10 8" style={{ width: 9 }}><path d="M1 4l2.5 2.5L9 1" stroke="#0E1014" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  : <span style={{ fontSize: 8, fontWeight: 900, color: active ? "#0E1014" : SUB }}>{i + 1}</span>
                }
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                textTransform: "uppercase" as const, letterSpacing: "0.06em",
                color: active ? TEXT : done ? G : "#34373F",
              }}>{STEP_LABELS[s]}</span>
            </div>
            {i < visible.length - 1 && <div style={{ width: 12, height: 1, background: CELL }} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── HAUPTKOMPONENTE ──────────────────────────────────────────────────────────
export default function BuchenPage() {
  const supabase = createClient()

  // User + Profil (immer eingeloggt in Player App)
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; phone: string; level: string | null; pingPoints: number } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from("profiles").select("id,name,level,phone").eq("id", user.id).single()
      const { data: ppData } = await supabase.from("ping_points_transactions").select("amount").eq("player_id", user.id)
      const pp = (ppData || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)
      const displayName = profile?.name || user.email?.split("@")[0] || "Player"
      setAuthUser({ id: user.id, name: displayName, email: user.email || "", phone: profile?.phone || "", level: profile?.level || null, pingPoints: pp })
      if (profile) {
        const parts = (profile.name || "").trim().split(" ")
        setForm(f => ({ ...f, firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "", email: user.email || "", phone: profile.phone || "" }))
      } else {
        setForm(f => ({ ...f, email: user.email || "" }))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stripe return
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("paid") === "1") {
      try {
        const stored = sessionStorage.getItem("stripe_booking")
        if (stored) {
          const data = JSON.parse(stored)
          setBookingRef(data.ref || "")
          setStripeReturn({ email: data.email, locName: data.locName, dateLabel: data.dateLabel, timeLabel: data.timeLabel })
          setStep("done")
          sessionStorage.removeItem("stripe_booking")
        }
      } catch { /* ignore */ }
      window.history.replaceState({}, "", "/buchen")
    }
    if (params.get("cancelled") === "1") {
      try { sessionStorage.removeItem("stripe_booking") } catch { /* ignore */ }
      setBookingError("Zahlung abgebrochen — du kannst neu buchen.")
      window.history.replaceState({}, "", "/buchen")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // State
  const [step, setStep]             = useState<Step>("picker")
  const [location, setLocation]     = useState<Location | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [showCal, setShowCal]       = useState(false)
  const [calMonth, setCalMonth]     = useState<Date>(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const [duration, setDuration]     = useState(1)
  const [slots, setSlots]           = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [tables, setTables]         = useState(1)
  const [persons, setPersons]       = useState(2)
  const [form, setForm]             = useState({ firstName: "", lastName: "", email: "", phone: "", comments: "" })
  const [redeemPoints, setRedeemPoints] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState("")
  const [bookingRef, setBookingRef] = useState("")
  const [stripeReturn, setStripeReturn] = useState<{ email: string; locName: string; dateLabel: string; timeLabel: string } | null>(null)

  // Slots laden
  const loadSlots = useCallback(async (date: Date) => {
    if (!location?.resourceId) return
    setSlotsLoading(true); setSlotsError(""); setSelectedSlot(null); setSlots([])
    try {
      const res = await fetch(`/api/planyo?method=get_slots&resource_id=${location.resourceId}&date=${isoDate(date)}&max_tables=${location.tables}`)
      const data = await res.json()
      if (data.slots) setSlots(data.slots)
      else setSlotsError("Slots konnten nicht geladen werden.")
    } catch {
      setSlotsError("Verbindungsfehler — bitte nochmals versuchen.")
    } finally {
      setSlotsLoading(false)
    }
  }, [location])

  useEffect(() => {
    if (step === "picker" && location?.resourceId && selectedDate) loadSlots(selectedDate)
  }, [step, location, selectedDate, loadSlots])

  // Preis
  const locPrice     = location?.pricePerHour  ?? 25
  const locHalfPrice = location?.priceHalfHour ?? 15
  const durH         = duration === 0.5 ? 0.5 : duration
  const priceBase    = duration === 0.5 ? locHalfPrice * tables : Math.round(locPrice * tables * durH)
  const pingPoints   = authUser?.pingPoints ?? 0
  const maxRedeem    = Math.min(pingPoints, Math.floor(priceBase / 2))
  const discount     = redeemPoints * 2
  const grandTotal   = Math.max(0, priceBase - discount)

  // Öffnungszeiten für gewähltes Datum
  const pickerDow  = selectedDate.getDay()
  const pickerOh   = location?.openHours.find(h => h.dow === pickerDow)
  const toMin      = (s: string) => { const [h, m] = s.split(":").map(Number); return h === 0 && m === 0 ? 24*60 : h*60+m }
  const openH      = pickerOh ? parseInt(pickerOh.open.split(":")[0]) : 0
  const closeH     = pickerOh ? (pickerOh.close === "00:00" ? 24 : parseInt(pickerOh.close.split(":")[0])) : 24
  const isClosed   = !!location?.resourceId && (location.openHours.length > 0) && !pickerOh && (location as any).tag !== "24/7"
  const isToday    = isoDate(selectedDate) === isoDate(new Date())
  const nowH       = new Date().getHours()

  const visibleSlots = (location?.resourceId && !isClosed)
    ? slots.filter(s => s.available && (pickerOh ? (s.hour >= openH && s.hour + durH <= closeH) : false) && !(isToday && s.hour <= nowH))
    : []

  function toProperCase(s: string) {
    return s.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  }

  async function submitBooking() {
    if (!location || !selectedSlot) return
    setSubmitting(true); setBookingError("")
    try {
      const startH = selectedSlot.hour
      const endTotalMins = startH * 60 + Math.round(durH * 60)
      const endHRaw = Math.floor(endTotalMins / 60)
      const endM = endTotalMins % 60
      const dateStr = isoDate(selectedDate)
      let endTime: string
      if (endHRaw >= 24) {
        const next = addDays(selectedDate, 1)
        endTime = `${isoDate(next)} ${pad(endHRaw - 24)}:${pad(endM)}`
      } else {
        endTime = `${dateStr} ${pad(endHRaw)}:${pad(endM)}`
      }
      const start = `${dateStr} ${pad(startH)}:00`

      const res = await fetch("/api/planyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "make_reservation",
          resource_id: location.resourceId,
          start_time: start,
          end_time: endTime,
          first_name: toProperCase(form.firstName),
          last_name:  toProperCase(form.lastName),
          email: form.email,
          mobile_phone: form.phone,
          quantity: String(tables),
          comments: [
            `Personen: ${persons}`,
            authUser?.level ? `Level: ${authUser.level}` : "",
            form.phone ? `Tel: ${form.phone}` : "",
            form.comments ? `Notiz: ${form.comments}` : "",
          ].filter(Boolean).join(" | "),
        }),
      })
      const data = await res.json()

      if (data?.response_code === 0 && data?.data?.reservation_id) {
        const resId = String(data.data.reservation_id)
        setBookingRef(resId)

        if (location.requiresPayment) {
          const dateLabel = formatDate(selectedDate)
          const timeLabel = `${pad(startH)}:00 · ${duration}h`
          sessionStorage.setItem("stripe_booking", JSON.stringify({ ref: resId, email: form.email, locName: location.name, dateLabel, timeLabel }))
          const { data: { session: sbSession } } = await supabase.auth.getSession()
          const checkRes = await fetch("/api/booking/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(sbSession?.access_token ? { Authorization: `Bearer ${sbSession.access_token}` } : {}),
            },
            body: JSON.stringify({ reservation_id: resId, location_name: location.name, date_label: dateLabel, time_label: timeLabel, email: form.email, redeem_points: redeemPoints }),
          })
          const checkData = await checkRes.json()
          if (checkData.url) { window.location.href = checkData.url; return }
          setBookingError(checkData.error || "Zahlung konnte nicht gestartet werden.")
          setSubmitting(false)
          return
        }

        // Ohne Zahlung: PingPoints direkt abziehen falls eingelöst
        if (redeemPoints > 0 && authUser) {
          await supabase.from("ping_points_transactions").insert({
            player_id: authUser.id, amount: -redeemPoints,
            description: `${redeemPoints}P = CHF ${redeemPoints * 2} Rabatt · Buchung #${resId}`,
            created_at: new Date().toISOString(),
          })
        }
        setStep("done")
      } else {
        const msg = data?.response_message || "Buchung fehlgeschlagen — bitte nochmals versuchen."
        setBookingError(msg.includes("Another user with this email") ? "Diese E-Mail wird bereits verwendet. Nutze die Daten deines bestehenden Accounts." : msg)
      }
    } catch {
      setBookingError("Verbindungsfehler — bitte nochmals versuchen.")
    } finally {
      setSubmitting(false)
    }
  }

  // Wrapper mit Back-Button
  function wrap(title: string, back: (() => void) | null, children: React.ReactNode) {
    return (
      <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {back ? (
              <button onClick={back} style={{ ...btnGhost, display: "inline-flex", width: "auto", padding: "8px 12px", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: "block" }}>
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            ) : <div style={{ width: 36 }} />}
            <h1 style={{ ...h1, fontSize: "clamp(24px, 5vw, 36px)", lineHeight: 0.92 }}>Tisch buchen</h1>
          </div>
          <StepBar current={step} />
          {children}
        </div>
        <BottomNav />
      </main>
    )
  }

  // ── STEP: PICKER ──────────────────────────────────────────────────────────────
  if (step === "picker") {
    const DURATIONS = [
      { val: 0.5, label: "30'" }, { val: 1, label: "1h" }, { val: 1.5, label: "1½h" },
      { val: 2, label: "2h" }, { val: 2.5, label: "2½h" }, { val: 3, label: "3h" },
    ]
    const now = new Date()
    const isSommerpause = now >= new Date("2026-06-30") && now <= new Date("2026-08-31T23:59:59")
    const dateLabel = isToday
      ? `Heute, ${formatDateShort(selectedDate)}`
      : formatDateShort(selectedDate)

    return wrap("Tisch buchen.", null, (
      <>
        {isSommerpause && (
          <div style={{ ...cardPad, padding: "14px 16px", marginBottom: 16 }}>
            <p style={{ ...eyebrow, color: "#FF9F2E", fontWeight: 800, fontSize: 12, letterSpacing: ".04em", marginBottom: 4 }}>Sommerpause — 30. Juni bis 31. August</p>
            <p style={{ ...body }}>
              Oerlikon, Langstrasse und Basel sind geschlossen. Buchungen via Glattbrugg (24/7) oder St. Gallen.
            </p>
          </div>
        )}

        {/* Standort */}
        <p style={{ ...label }}>Standort</p>
        {location ? (
          <div style={{ ...cardPad, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", marginBottom: 16 }}>
            <div>
              <div style={{ ...h2, fontSize: 16 }}>{location.name}</div>
              <div style={{ ...meta, marginTop: 2 }}>{location.city}</div>
            </div>
            <button onClick={() => { setLocation(null); setSelectedSlot(null); setSlots([]) }}
              style={{ ...btnGhost, display: "inline-block", width: "auto", fontSize: 12, padding: "7px 14px" }}>Ändern</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {LOCATIONS.map(loc => {
              const s = getOpenStatus(loc)
              return (
                <button key={loc.id}
                  onClick={() => {
                    if (loc.teamOnly) return
                    if (loc.eversports) { window.open(loc.eversports, "_blank"); return }
                    setLocation(loc); setSelectedSlot(null); setSlots([])
                  }}
                  style={{ ...cardPad, padding: "12px 14px", cursor: loc.teamOnly ? "not-allowed" : "pointer", textAlign: "left", opacity: loc.teamOnly ? 0.5 : 1, fontFamily: "inherit" }}>
                  <div style={{ ...eyebrow, fontWeight: 700, color: s.open ? G : MUT, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {s.label}
                  </div>
                  <div style={{ ...h2, fontSize: 15 }}>{loc.name}</div>
                  <div style={{ ...meta, marginTop: 2 }}>{loc.city}</div>
                </button>
              )
            })}
          </div>
        )}

        {location && (
          <>
            {/* Datum */}
            <p style={{ ...label }}>Datum</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showCal ? 10 : 16 }}>
              <button onClick={() => {
                const prev = addDays(selectedDate, -1)
                const today = new Date(); today.setHours(0,0,0,0)
                if (prev >= today) { setSelectedDate(prev); setSelectedSlot(null) }
              }} style={{ ...btnGhost, display: "inline-flex", alignItems: "center", justifyContent: "center", width: "auto", padding: "9px 16px", fontSize: 16, flexShrink: 0 }}>‹</button>
              <button onClick={() => { setCalMonth(() => { const d = new Date(selectedDate); d.setDate(1); return d }); setShowCal(v => !v) }}
                style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: "-.01em", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {dateLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={SUB} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showCal ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <button onClick={() => { setSelectedDate(addDays(selectedDate, 1)); setSelectedSlot(null) }}
                style={{ ...btnGhost, display: "inline-flex", alignItems: "center", justifyContent: "center", width: "auto", padding: "9px 16px", fontSize: 16, flexShrink: 0 }}>›</button>
            </div>

            {showCal && (() => {
              const today = new Date(); today.setHours(0,0,0,0)
              const y = calMonth.getFullYear(), m = calMonth.getMonth()
              const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
              const daysIn = new Date(y, m + 1, 0).getDate()
              const cells: (Date | null)[] = []
              for (let i = 0; i < firstDow; i++) cells.push(null)
              for (let d = 1; d <= daysIn; d++) cells.push(new Date(y, m, d))
              const canPrevMonth = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1)
              return (
                <div style={{ ...cardPad, padding: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <button onClick={() => canPrevMonth && setCalMonth(new Date(y, m - 1, 1))} style={{ ...btnGhost, display: "inline-flex", width: "auto", padding: "5px 12px", fontSize: 14, opacity: canPrevMonth ? 1 : 0.3 }}>‹</button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{calMonth.toLocaleDateString("de-CH", { month: "long", year: "numeric" })}</span>
                    <button onClick={() => setCalMonth(new Date(y, m + 1, 1))} style={{ ...btnGhost, display: "inline-flex", width: "auto", padding: "5px 12px", fontSize: 14 }}>›</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                    {["Mo","Di","Mi","Do","Fr","Sa","So"].map(w => <div key={w} style={{ textAlign: "center", fontSize: 9, color: MUT, padding: "2px 0" }}>{w}</div>)}
                    {cells.map((d, i) => {
                      if (!d) return <div key={i} />
                      const past = d < today
                      const isSel = isoDate(d) === isoDate(selectedDate)
                      return (
                        <button key={i} disabled={past}
                          onClick={() => { setSelectedDate(d); setSelectedSlot(null); setShowCal(false) }}
                          style={{ aspectRatio: "1", borderRadius: 8, border: "none", cursor: past ? "default" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: isSel ? 700 : 400,
                            background: isSel ? "#fff" : "transparent", color: isSel ? "#0E1014" : past ? "rgba(255,255,255,0.18)" : TEXT }}>
                          {d.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Dauer */}
            <p style={{ ...label }}>Dauer</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 16 }}>
              {DURATIONS.map(d => (
                <button key={d.val} onClick={() => { setDuration(d.val); setSelectedSlot(null) }}
                  style={{ ...chipBtn(duration === d.val), fontFamily: "inherit" }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Slots */}
            <p style={{ ...label }}>Verfügbare Zeiten</p>
            {isClosed ? (
              <div style={{ ...cardPad, padding: "20px 16px", textAlign: "center", marginBottom: 16 }}>
                <p style={{ ...body }}>Heute geschlossen.</p>
                {(() => {
                  const next = location.openHours.map(h => ({ ...h, days: (h.dow - pickerDow + 7) % 7 || 7 })).sort((a, b) => a.days - b.days)[0]
                  const days = ["So","Mo","Di","Mi","Do","Fr","Sa"]
                  return next ? <p style={{ ...meta, marginTop: 4 }}>Nächstes Öffnen: {days[next.dow]} ab {next.open}</p> : null
                })()}
              </div>
            ) : slotsLoading ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2.5px solid ${CELL}`, borderTopColor: G, margin: "0 auto 10px", animation: "spin 0.8s linear infinite" }} />
                <p style={{ ...body }}>Verfügbarkeit wird geprüft…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : slotsError ? (
              <div style={{ ...cardPad, padding: 16, textAlign: "center", marginBottom: 16 }}>
                <p style={{ ...body, color: DANGER }}>{slotsError}</p>
                <button onClick={() => loadSlots(selectedDate)} style={{ ...btnGhost, display: "inline-block", width: "auto", marginTop: 10 }}>Nochmals versuchen</button>
              </div>
            ) : visibleSlots.length === 0 ? (
              <div style={{ ...cardPad, padding: "20px 16px", textAlign: "center", marginBottom: 16 }}>
                <p style={{ ...body }}>Kein freier Tisch — anderes Datum oder Dauer wählen.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 16 }}>
                {visibleSlots.map(slot => {
                  const sel = selectedSlot?.hour === slot.hour
                  return (
                    <button key={slot.hour}
                      onClick={() => { setSelectedSlot(sel ? null : slot); if (!sel) setTables(1) }}
                      style={{
                        ...(sel ? cardActive : { background: CELL, border: "1.5px solid transparent" }),
                        borderRadius: 10, padding: "10px 4px", cursor: "pointer", textAlign: "center", fontFamily: "inherit",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: TEXT }}>{pad(slot.hour)}:00</div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Tische + Weiter */}
            {selectedSlot && (() => {
              const freeMax = location.tables
              const free = Math.max(0, freeMax - (selectedSlot.tablesBooked || 0))
              return (
                <div style={{ ...cardPad, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ ...cellKey, fontSize: 11, marginBottom: 0 }}>Tische</span>
                    <button onClick={() => setTables(t => Math.max(1, t-1))}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${CELL}`, background: "transparent", color: TEXT, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 900, minWidth: 20, textAlign: "center", color: TEXT }}>{tables}</span>
                    <button onClick={() => setTables(t => Math.min(free, t+1))}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${CELL}`, background: "transparent", color: TEXT, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>+</button>
                    <span style={{ ...meta, fontSize: 11 }}>max. {free}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: TEXT, marginLeft: "auto" }}>CHF {priceBase}.—</span>
                  </div>
                  <button onClick={() => setStep("details")} style={{ ...btn, width: "100%", fontFamily: "inherit" }}>
                    Weiter zu den Angaben
                  </button>
                </div>
              )
            })()}
          </>
        )}

        {!location && (
          <div style={{ ...meta, textAlign: "center", padding: "24px 0", color: MUT }}>
            Bitte zuerst einen Standort wählen.
          </div>
        )}
      </>
    ))
  }

  // ── STEP: DETAILS ─────────────────────────────────────────────────────────────
  if (step === "details") {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    const formValid  = !!(form.firstName.trim() && form.lastName.trim() && emailValid)
    return wrap("Tisch buchen.", () => setStep("picker"), (
      <>
        {/* Buchungs-Preview */}
        <div style={{ ...cardPad, padding: 16, marginBottom: 20 }}>
          <p style={{ ...eyebrow, marginBottom: 2 }}>{location?.name}</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: TEXT }}>
            {formatDate(selectedDate)} · {pad(selectedSlot?.hour ?? 0)}:00 · {duration}h
          </p>
          <p style={{ ...meta, marginTop: 4 }}>
            {tables} {tables === 1 ? "Tisch" : "Tische"} · CHF {priceBase}.—
          </p>
        </div>

        {/* Anzahl Personen */}
        <p style={{ ...label }}>Anzahl Personen</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setPersons(p => Math.max(2, p-1))} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${CELL}`, background: "transparent", color: TEXT, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>−</button>
          <span style={{ fontSize: 22, fontWeight: 900, minWidth: 30, textAlign: "center", color: TEXT }}>{persons}</span>
          <button onClick={() => setPersons(p => Math.min(tables * 4, p+1))} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${CELL}`, background: "transparent", color: TEXT, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>+</button>
          <span style={{ ...meta, fontSize: 11 }}>max. {tables * 4} pro {tables === 1 ? "Tisch" : "Tischen"}</span>
        </div>

        {/* Formular */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Vorname *</label>
            <input style={input} value={form.firstName} autoComplete="given-name"
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Max" />
          </div>
          <div>
            <label style={label}>Nachname *</label>
            <input style={input} value={form.lastName} autoComplete="family-name"
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Muster" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>E-Mail *</label>
          <input style={input} type="email" value={form.email} autoComplete="email"
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="max@example.ch" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Telefon</label>
          <input style={input} type="tel" value={form.phone} autoComplete="tel"
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+41 79 000 00 00" />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={label}>Notiz (optional)</label>
          <textarea style={{ ...input, minHeight: 70, resize: "vertical" as const }} value={form.comments}
            onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} placeholder="z.B. Geburtstag, besondere Wünsche…" />
        </div>

        {/* Gruppe ≥ 12 */}
        {persons >= 12 && (
          <div style={{ ...cardPad, padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: G, marginBottom: 2 }}>Ihr seid {persons} Personen — Teamevent-Pakete verfügbar.</p>
            <p style={{ ...meta }}>Quick Social CHF 49/P. · Team Night CHF 89/P. · All-In CHF 139/P.</p>
            <Link href="/teamevents" style={{ fontSize: 12, color: G, fontWeight: 700, textDecoration: "none" }}>Pakete ansehen →</Link>
          </div>
        )}

        <button disabled={!formValid} onClick={() => formValid && setStep("confirm")}
          style={{ ...btn, width: "100%", fontFamily: "inherit", opacity: formValid ? 1 : 0.4 }}>
          Weiter zur Bestätigung
        </button>
      </>
    ))
  }

  // ── STEP: CONFIRM ─────────────────────────────────────────────────────────────
  if (step === "confirm") {
    return wrap("Tisch buchen.", () => setStep("details"), (
      <>
        {/* Zusammenfassung */}
        <div style={{ ...cardPad, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Standort", value: location?.name || "" },
            { label: "Datum",    value: formatDate(selectedDate) },
            { label: "Zeit",     value: `${pad(selectedSlot?.hour ?? 0)}:00 · ${duration}h` },
            { label: "Tische",   value: `${tables} Tisch${tables > 1 ? "e" : ""} · ${persons} Personen` },
            { label: "Name",     value: `${form.firstName} ${form.lastName}` },
            { label: "E-Mail",   value: form.email },
            ...(form.phone ? [{ label: "Telefon", value: form.phone }] : []),
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={{ ...cellKey, fontSize: 11, marginBottom: 0, flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 14, color: TEXT, textAlign: "right" }}>{r.value}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: TEXT }}>Tischmiete</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: TEXT }}>CHF {priceBase}.—</span>
          </div>
          {redeemPoints > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: G, fontWeight: 700 }}>{redeemPoints} PingPoints Rabatt</span>
              <span style={{ fontSize: 13, color: G }}>−CHF {discount}.—</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: TEXT }}>Gesamt</span>
            <span style={{ fontSize: 22, fontWeight: 900, ...gt }}>
              CHF {grandTotal}.—
            </span>
          </div>
        </div>

        {/* PingPoints einlösen */}
        {maxRedeem > 0 && (
          <div style={{ ...cardPad, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 13, color: TEXT, fontWeight: 900 }}>PingPoints einlösen</p>
                <p style={{ ...meta, marginTop: 2 }}>{pingPoints} Punkte · 1 Punkt = CHF 2 Rabatt</p>
              </div>
              <span style={{ fontSize: 14, color: G, fontWeight: 900 }}>{pingPoints}P</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setRedeemPoints(p => Math.max(0, p-1))} disabled={redeemPoints === 0}
                style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${CELL}`, background: "transparent", color: TEXT, cursor: redeemPoints === 0 ? "not-allowed" : "pointer", fontSize: 18, opacity: redeemPoints === 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                {redeemPoints === 0
                  ? <span style={{ ...meta }}>Nicht einlösen</span>
                  : <span style={{ fontSize: 13, color: TEXT, fontWeight: 900 }}>{redeemPoints}P = −CHF {discount}.—</span>
                }
              </div>
              <button onClick={() => setRedeemPoints(p => Math.min(maxRedeem, p+1))} disabled={redeemPoints >= maxRedeem}
                style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${CELL}`, background: "transparent", color: TEXT, cursor: redeemPoints >= maxRedeem ? "not-allowed" : "pointer", fontSize: 18, opacity: redeemPoints >= maxRedeem ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        )}

        {/* PingPoints Preview */}
        <div style={{ ...cardPad, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ ...meta }}>
            Nach dieser Buchung: {Math.max(0, (pingPoints - redeemPoints + 1) % 10)}/10 PingPoints
            {pingPoints - redeemPoints + 1 >= 10 ? " · Gratis-Stunde verfügbar!" : ""}
          </p>
          <div style={{ background: CELL, borderRadius: 3, height: 4, marginTop: 6 }}>
            <div style={{ background: G, borderRadius: 3, height: 4, width: `${Math.min(100, ((pingPoints - redeemPoints + 1) % 10) * 10)}%`, transition: "width 0.4s" }} />
          </div>
        </div>

        {bookingError && (
          <div style={{ ...cardPad, padding: "14px 18px", marginBottom: 16 }}>
            <p style={{ ...body, color: DANGER }}>{bookingError}</p>
          </div>
        )}

        <button onClick={submitBooking} disabled={submitting}
          style={{ ...btn, width: "100%", fontFamily: "inherit", opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Buchung wird gespeichert…"
            : location?.requiresPayment
              ? `Jetzt buchen & bezahlen · CHF ${grandTotal}.—`
              : grandTotal === 0
                ? "Gratis buchen"
                : `Verbindlich reservieren · CHF ${grandTotal}.—`}
        </button>

        {!location?.requiresPayment && (
          <p style={{ ...meta, textAlign: "center", marginTop: 10, color: MUT }}>Bezahlung direkt vor Ort</p>
        )}
      </>
    ))
  }

  // ── STEP: DONE ────────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 100px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${G}18`, border: `2px solid ${G}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32, color: G }}>
          ✓
        </div>
        <h2 style={{ ...h1, fontSize: "clamp(24px, 5vw, 36px)", marginBottom: 8 }}>
          Buchung bestätigt
        </h2>
        <p style={{ ...body, fontSize: 15, marginBottom: 8 }}>
          Buchungsnummer: <strong style={{ color: TEXT }}>#{bookingRef}</strong>
        </p>
        <p style={{ ...body, marginBottom: 28 }}>
          Bestätigung wurde an <strong style={{ color: TEXT }}>{stripeReturn?.email || form.email}</strong> gesendet.
        </p>

        <div style={{ ...cardPad, padding: 20, textAlign: "left", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Standort", value: stripeReturn?.locName  || location?.name || "" },
            { label: "Datum",    value: stripeReturn?.dateLabel || formatDate(selectedDate) },
            { label: "Zeit",     value: stripeReturn?.timeLabel || `${pad(selectedSlot?.hour ?? 0)}:00 · ${duration}h` },
            { label: "Tische",   value: `${tables} Tisch${tables > 1 ? "e" : ""}` },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ ...cellKey, fontSize: 11, marginBottom: 0 }}>{r.label}</span>
              <span style={{ fontSize: 14, color: TEXT }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
          <button onClick={() => {
            setStep("picker"); setLocation(null); setSelectedSlot(null);
            setDuration(1); setTables(1); setPersons(2);
            setBookingRef(""); setBookingError(""); setStripeReturn(null); setRedeemPoints(0)
            const d = new Date(); d.setHours(0,0,0,0); setSelectedDate(d)
            window.history.replaceState({}, "", "/buchen")
          }} style={{ ...btnGhost, display: "inline-block", width: "auto", padding: "12px 24px" }}>
            Neue Buchung
          </button>
          <Link href="/entdecken" style={{ ...btn, display: "inline-block", width: "auto", padding: "12px 24px" }}>
            Zur Übersicht
          </Link>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
