import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notify } from "@/lib/notify"
import { NextRequest, NextResponse } from "next/server"

async function meinName(admin: ReturnType<typeof createAdminClient>, id: string): Promise<string> {
  const { data } = await admin.from("public_profiles").select("name").eq("id", id).maybeSingle()
  return data?.name || "Ein Spieler"
}

// FREUNDE — Anfrage, Annahme, Entfernen. Gegenseitig: erst wenn der andere
// annimmt, gelten sie als Freunde und erscheinen im Freunde-Filter.
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()

  const { data: friends } = await admin.from("my_friends").select("friend_id").eq("user_id", user.id)
  // Offene eingehende Anfragen (ich bin addressee, status pending)
  const { data: incoming } = await admin.from("friendships")
    .select("id,requester").eq("addressee", user.id).eq("status", "pending")
  // Offene ausgehende
  const { data: outgoing } = await admin.from("friendships")
    .select("id,addressee").eq("requester", user.id).eq("status", "pending")

  const ids = [...new Set([
    ...(friends || []).map(f => f.friend_id),
    ...(incoming || []).map(i => i.requester),
    ...(outgoing || []).map(o => o.addressee),
  ])]
  const { data: profs } = ids.length
    ? await admin.from("public_profiles").select("id,name,elo,level,avatar_url").in("id", ids)
    : { data: [] }
  const pmap = new Map((profs || []).map(p => [p.id, p]))

  return NextResponse.json({
    friends: (friends || []).map(f => pmap.get(f.friend_id)).filter(Boolean),
    incoming: (incoming || []).map(i => ({ id: i.id, ...(pmap.get(i.requester) || {}) })),
    outgoing: (outgoing || []).map(o => ({ id: o.id, ...(pmap.get(o.addressee) || {}) })),
  })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, user_id } = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  if (action === "request") {
    if (!user_id || user_id === user.id) return NextResponse.json({ error: "Ungültig" }, { status: 400 })
    // Wer keine Anfragen will, bekommt keine.
    const { data: zielProfil } = await admin.from("profiles")
      .select("allow_friend_requests,name").eq("id", user_id).maybeSingle()
    if (zielProfil && zielProfil.allow_friend_requests === false)
      return NextResponse.json({ error: `${zielProfil.name || "Dieser Spieler"} nimmt zurzeit keine Anfragen an` }, { status: 403 })
    // Nimmt der andere gerade eine offene Anfrage von mir an? Oder gibt es schon
    // eine Gegenanfrage → dann direkt bestätigen.
    const { data: gegen } = await admin.from("friendships")
      .select("id,status").eq("requester", user_id).eq("addressee", user.id).maybeSingle()
    if (gegen) {
      if (gegen.status === "pending") {
        await admin.from("friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", gegen.id)
        await notify(admin, user_id, "friend_accepted", `${await meinName(admin, user.id)} ist jetzt dein Freund`, { link: "/liga" })
      }
      return NextResponse.json({ ok: true, accepted: true })
    }
    const { error } = await admin.from("friendships")
      .upsert({ requester: user.id, addressee: user_id, status: "pending" }, { onConflict: "requester,addressee", ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await notify(admin, user_id, "friend_request", `${await meinName(admin, user.id)} möchte dein Freund sein`, {
      body: "Nimm die Anfrage an, dann seht ihr euch im Freunde-Filter.", link: "/liga",
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "accept") {
    // Ich nehme eine eingehende Anfrage an (ich bin addressee).
    const { error } = await admin.from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("addressee", user.id).eq("requester", user_id).eq("status", "pending")
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    // Den Anfragenden benachrichtigen, dass angenommen wurde.
    await notify(admin, user_id, "friend_accepted", `${await meinName(admin, user.id)} hat deine Freundschaftsanfrage angenommen`, { link: "/liga" })
    return NextResponse.json({ ok: true })
  }

  if (action === "remove") {
    // Freundschaft (oder Anfrage) in beide Richtungen löschen.
    await admin.from("friendships").delete()
      .or(`and(requester.eq.${user.id},addressee.eq.${user_id}),and(requester.eq.${user_id},addressee.eq.${user.id})`)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 })
}
