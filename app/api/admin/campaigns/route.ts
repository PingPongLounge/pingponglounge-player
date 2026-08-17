import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { STAFF_EMAILS } from "@/lib/staff"

export const runtime = "nodejs"

async function requireStaff() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !STAFF_EMAILS.includes(user.email || "")) return null
  return user
}

const SURFACES = ["app", "web", "both"]
// Nur sichere URLs: root-relativ ("/…") oder http(s). Verhindert javascript:-URLs.
function safeUrl(v: unknown, n: number): string | null {
  if (v == null) return null
  const u = String(v).trim().slice(0, n)
  if (!u) return null
  if (u.startsWith("/") || /^https?:\/\//i.test(u)) return u
  return null
}
function clean(body: Record<string, unknown>) {
  const s = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n))
  const surface = SURFACES.includes(String(body.surface)) ? String(body.surface) : "both"
  return {
    title: (s(body.title, 120) || "").trim(),
    kicker: s(body.kicker, 60),
    body: s(body.body, 400),
    cta_label: s(body.cta_label, 40),
    cta_url: safeUrl(body.cta_url, 300),
    image_url: safeUrl(body.image_url, 400),
    surface,
    active: body.active !== false,
    starts_at: body.starts_at ? String(body.starts_at) : null,
    ends_at: body.ends_at ? String(body.ends_at) : null,
    priority: Number.isFinite(Number(body.priority)) ? Math.trunc(Number(body.priority)) : 0,
  }
}

export async function GET() {
  if (!await requireStaff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const admin = createAdminClient()
  const { data } = await admin.from("campaigns").select("*").order("created_at", { ascending: false })
  return NextResponse.json({ campaigns: data || [] })
}

export async function POST(req: NextRequest) {
  if (!await requireStaff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const row = clean(body)
  if (!row.title) return NextResponse.json({ error: "Titel ist Pflicht" }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from("campaigns").insert(row).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  if (!await requireStaff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || "")
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 })
  const admin = createAdminClient()
  // Nur "active" toggeln, wenn nur das mitkommt — sonst ganzen Datensatz aktualisieren.
  const patch = "active" in body && Object.keys(body).length <= 2
    ? { active: body.active !== false, updated_at: new Date().toISOString() }
    : { ...clean(body), updated_at: new Date().toISOString() }
  const { error } = await admin.from("campaigns").update(patch).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await requireStaff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from("campaigns").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
