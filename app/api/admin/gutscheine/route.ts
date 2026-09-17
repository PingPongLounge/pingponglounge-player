import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { STAFF_EMAILS } from "@/lib/staff"
import { normCode, STUFEN, type Stufe } from "@/lib/gutschein"

/* Gutscheinverwaltung. Geschrieben wird ausschliesslich hier, serverseitig
   geprueft — die Seite im Browser ist nur die Oberflaeche.

   Die Tabelle gehoert auch dem Webshop. Diese Route fasst deshalb NUR Codes
   an, deren scope mindestens eine Eventart enthaelt: ein Shop-Code laesst sich
   von hier aus weder aendern noch loeschen. */
export const runtime = "nodejs"

const EVENTARTEN = ["tournament", "open_game", "single_night"] as const

async function staff() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return user && STAFF_EMAILS.includes(user.email || "") ? user : null
}

/** Ein Code gehoert den Events, sobald sein scope eine Eventart enthaelt. */
function istEventCode(scope: string[] | null | undefined) {
  return (scope ?? []).some(s => (EVENTARTEN as readonly string[]).includes(s))
}

export async function GET() {
  if (!await staff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const admin = createAdminClient()

  const { data: codes } = await admin
    .from("discount_codes")
    .select("id,code,value,scope,location_name,event_id,is_active,expires_at,max_uses,label,created_at")
    .order("created_at", { ascending: false })

  const nurEvents = (codes || []).filter(c => istEventCode(c.scope as string[]))

  // Einloesungen zaehlen — aus der Tabelle, nicht aus einem Feld. Ein Zaehler
  // verrutscht bei gleichzeitigen Buchungen; Zeilen tun das nicht.
  const jetzt = new Date().toISOString()
  const { data: rows } = await admin
    .from("voucher_redemptions")
    .select("code,status,reserved_until")
  const zaehler = new Map<string, { bestaetigt: number; reserviert: number }>()
  for (const r of rows || []) {
    const e = zaehler.get(r.code) || { bestaetigt: 0, reserviert: 0 }
    if (r.status === "confirmed") e.bestaetigt++
    else if (r.status === "reserved" && r.reserved_until && r.reserved_until > jetzt) e.reserviert++
    zaehler.set(r.code, e)
  }

  return NextResponse.json({
    codes: nurEvents.map(c => ({
      ...c,
      eingeloest: zaehler.get(c.code)?.bestaetigt ?? 0,
      reserviert: zaehler.get(c.code)?.reserviert ?? 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!await staff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const b = await req.json().catch(() => ({} as Record<string, unknown>))

  const code = normCode(b.code)
  if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code))
    return NextResponse.json({ error: "Code: 3–40 Zeichen, Buchstaben, Ziffern und Bindestrich." }, { status: 400 })

  const wert = Number(b.value)
  if (!STUFEN.includes(wert as Stufe))
    return NextResponse.json({ error: "Rabatt muss 20, 30, 50 oder 100 sein." }, { status: 400 })

  const scope = Array.isArray(b.scope) ? (b.scope as string[]).filter(x => (EVENTARTEN as readonly string[]).includes(x)) : []
  if (!scope.length)
    return NextResponse.json({ error: "Bitte mindestens eine Eventart wählen." }, { status: 400 })

  const admin = createAdminClient()

  // Einen bestehenden Shop-Code nicht übernehmen — sonst würde ein Rabattcode
  // des Webshops still zu einem Event-Gutschein.
  const { data: vorhanden } = await admin.from("discount_codes").select("code,scope").eq("code", code).maybeSingle()
  if (vorhanden && !istEventCode(vorhanden.scope as string[]))
    return NextResponse.json({ error: "Diesen Code gibt es bereits im Webshop." }, { status: 409 })

  const zeile = {
    code,
    kind: "percent",
    value: wert,
    scope,
    location_name: b.location_name ? String(b.location_name).trim().slice(0, 80) : null,
    event_id: b.event_id ? String(b.event_id) : null,
    expires_at: b.expires_at ? new Date(String(b.expires_at)).toISOString() : null,
    max_uses: b.max_uses == null || String(b.max_uses) === "" ? null : Math.max(1, parseInt(String(b.max_uses), 10)),
    is_active: b.is_active !== false,
    label: b.label ? String(b.label).trim().slice(0, 120) : null,
  }

  const { error } = await admin.from("discount_codes").upsert(zeile, { onConflict: "code" })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, code })
}

export async function PATCH(req: NextRequest) {
  if (!await staff()) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 })
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const code = normCode(b.code)
  if (!code) return NextResponse.json({ error: "Code fehlt" }, { status: 400 })

  const admin = createAdminClient()
  const { data: c } = await admin.from("discount_codes").select("scope").eq("code", code).maybeSingle()
  if (!c) return NextResponse.json({ error: "Unbekannter Code" }, { status: 404 })
  if (!istEventCode(c.scope as string[]))
    return NextResponse.json({ error: "Das ist ein Webshop-Code — bitte dort ändern." }, { status: 403 })

  const { error } = await admin.from("discount_codes")
    .update({ is_active: b.is_active === true }).eq("code", code)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
