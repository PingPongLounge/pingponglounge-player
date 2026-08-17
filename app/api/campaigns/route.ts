import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Liefert die aktuell aktive Kampagne für eine Oberfläche ("app" oder "web").
// Zeitfenster (starts_at/ends_at) wird hier geprüft; RLS lässt nur active=true lesen.
export async function GET(req: NextRequest) {
  const surfaceParam = req.nextUrl.searchParams.get("surface")
  const surface = surfaceParam === "web" ? "web" : "app"
  const sb = await createClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await sb
    .from("campaigns")
    .select("id,title,kicker,body,cta_label,cta_url,image_url,surface,starts_at,ends_at,priority")
    .eq("active", true)
    .in("surface", [surface, "both"])
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ campaign: null })
  return NextResponse.json({ campaign: (data && data[0]) || null })
}
