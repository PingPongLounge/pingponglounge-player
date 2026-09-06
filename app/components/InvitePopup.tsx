"use client"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Notif = { id:string; type:string; title:string; body:string|null; link:string|null; read_at:string|null }

export default function InvitePopup() {
  const router = useRouter()
  const [invite, setInvite] = useState<Notif | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" })
      if (!r.ok) return
      const j = await r.json()
      setInvite((j.notifications || []).find((n: Notif) => n.type === "event_invite" && !n.read_at) || null)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load() }, [load])
  if (!invite) return null

  async function dismiss(open: boolean) {
    setInvite(null)
    try { await fetch("/api/notifications", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id: invite!.id }) }) } catch { /* silent */ }
    if (open && invite?.link) router.push(invite.link)
  }

  return (
    <div style={{ position:"fixed", left:12, right:12, bottom:82, zIndex:500, maxWidth:440, margin:"0 auto", background:"#F4F1EB", color:"#080808", border:"1px solid rgba(8,8,8,.18)", boxShadow:"0 18px 60px rgba(0,0,0,.5)", padding:"18px" }} role="dialog" aria-label="Einladung">
      <div style={{ fontSize:10, fontWeight:900, letterSpacing:".16em", textTransform:"uppercase", color:"#8C3DFF", marginBottom:8 }}>Einladung</div>
      <div style={{ fontSize:18, fontWeight:900, lineHeight:1.12 }}>{invite.title}</div>
      {invite.body && <div style={{ fontSize:13, fontWeight:600, marginTop:7, opacity:.68 }}>{invite.body}</div>}
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <button onClick={() => dismiss(false)} style={{ flex:1, border:"1px solid #080808", background:"transparent", color:"#080808", padding:"12px 10px", fontWeight:900, fontFamily:"inherit", cursor:"pointer" }}>ABLEHNEN</button>
        <button onClick={() => dismiss(true)} style={{ flex:1, border:"1px solid #8C3DFF", background:"#8C3DFF", color:"#F4F1EB", padding:"12px 10px", fontWeight:900, fontFamily:"inherit", cursor:"pointer" }}>ANSEHEN</button>
      </div>
    </div>
  )
}
