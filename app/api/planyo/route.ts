import { NextRequest, NextResponse } from "next/server"

const PLANYO_API_KEY = process.env.PLANYO_API_KEY || ""
const PLANYO_BASE = "https://www.planyo.com/rest/"

const rateBuckets = new Map<string, { count: number; resetAt: number }>()
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = rateBuckets.get(key)
  if (!b || now > b.resetAt) { rateBuckets.set(key, { count: 1, resetAt: now + windowMs }); return false }
  b.count++; return b.count > max
}

async function planyo(method: string, params: Record<string, string>) {
  if (!PLANYO_API_KEY) throw new Error("PLANYO_API_KEY not set")
  const url = new URL(PLANYO_BASE)
  url.searchParams.set("method", method)
  url.searchParams.set("api_key", PLANYO_API_KEY)
  url.searchParams.set("lang", "de")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { next: { revalidate: 0 }, signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Planyo HTTP ${res.status}`)
  return res.json()
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const method = sp.get("method")
  const resourceId = sp.get("resource_id") ?? ""
  const date = sp.get("date")

  try {
    // ── Verfügbare Slots für ein Datum ───────────────────────────────────────
    if (method === "get_slots") {
      if (!date || !resourceId) return NextResponse.json({ error: "date + resource_id required" }, { status: 400 })
      const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
      const maxTables = parseInt(sp.get("max_tables") || "4")
      const slots = await Promise.all(HOURS.map(async (h) => {
        const start = `${date} ${String(h).padStart(2,"0")}:00`
        const end   = `${date} ${String(h+1).padStart(2,"0")}:00`
        const checks = await Promise.all(
          Array.from({ length: maxTables }, (_, i) => i + 1).map(async (qty) => {
            try {
              const r = await planyo("is_resource_available", { resource_id: resourceId, start_time: start, end_time: end, quantity: String(qty) })
              const v = r?.data?.is_available; return v === 1 || v === true
            } catch { return true }
          })
        )
        let freeCount = 0
        for (let i = checks.length - 1; i >= 0; i--) { if (checks[i]) { freeCount = i + 1; break } }
        return { hour: h, start, end, available: freeCount > 0, tablesBooked: maxTables - freeCount }
      }))
      return NextResponse.json({ slots })
    }

    // ── Monatskalender ───────────────────────────────────────────────────────
    if (method === "month_calendar") {
      if (!resourceId) return NextResponse.json({ error: "resource_id required" }, { status: 400 })
      const year  = parseInt(sp.get("year")  || String(new Date().getFullYear()))
      const month = parseInt(sp.get("month") || String(new Date().getMonth() + 1))
      const from  = `${year}-${String(month).padStart(2,"0")}-01`
      const to    = `${year}-${String(month).padStart(2,"0")}-${new Date(year, month, 0).getDate()}`
      const days: Record<string, { status: string; tablesBooked?: number }> = {}
      try {
        const res = await planyo("list_reservations", { resource_id: resourceId, start_date: from, end_date: to, status: "1" })
        const items: Record<string, { start_time: string; quantity?: string }> = res?.data?.reservations || {}
        for (const r of Object.values(items)) {
          if (!r.start_time) continue
          const dateStr = /^\d+$/.test(String(r.start_time))
            ? new Date(Number(r.start_time) * 1000).toISOString().split("T")[0]
            : String(r.start_time).split(" ")[0]
          const qty = parseInt(r.quantity || "1")
          if (!days[dateStr]) days[dateStr] = { status: "booked", tablesBooked: qty }
          else days[dateStr].tablesBooked = (days[dateStr].tablesBooked || 0) + qty
        }
      } catch { /* leer lassen */ }
      return NextResponse.json({ days })
    }

    return NextResponse.json({ error: "Unknown method" }, { status: 400 })
  } catch (e) {
    console.error("Planyo GET error", e)
    return NextResponse.json({ error: "Planyo Fehler" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { method, ...params } = body
  try {
    if (method === "make_reservation") {
      const required = ["resource_id","start_time","end_time","first_name","last_name","email"]
      for (const f of required) if (!params[f]) return NextResponse.json({ error: `${f} required` }, { status: 400 })
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
      if (rateLimited(`mkres:${ip}`, 3, 10 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Versuche — bitte kurz warten." }, { status: 429 })
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(params.email))) return NextResponse.json({ error: "Ungültige E-Mail" }, { status: 400 })
      const r = await planyo("make_reservation", {
        resource_id: params.resource_id, start_time: params.start_time, end_time: params.end_time,
        first_name: params.first_name, last_name: params.last_name, email: params.email,
        mobile_phone: params.phone || "", quantity: String(params.quantity || "1"), comments: params.comments || "",
      })
      return NextResponse.json(r)
    }
    return NextResponse.json({ error: "Unknown method" }, { status: 400 })
  } catch (e) {
    console.error("Planyo POST error", e)
    return NextResponse.json({ error: "Planyo Fehler" }, { status: 500 })
  }
}
