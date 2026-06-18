"use client"
import { useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#14161A",C="#1B1E25",B="#1E2230",M="rgba(255,255,255,0.66)",G="#39FF14",W="#FFFFFF"
const GRAD="linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)"

const STYLES = [
  { id:"graffiti", label:"Graffiti",  emoji:"🎨" },
  { id:"comic",    label:"Comic",     emoji:"💥" },
  { id:"anime",    label:"Anime",     emoji:"⚡" },
  { id:"pixel",    label:"Pixel Art", emoji:"👾" },
  { id:"noir",     label:"Noir",      emoji:"🖤" },
]

export default function AvatarPage() {
  const [photo, setPhoto]         = useState<string|null>(null)
  const [style, setStyle]         = useState("graffiti")
  const [result, setResult]       = useState<string|null>(null)
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState("")
  const [saved, setSaved]         = useState(false)
  const [genCount, setGenCount]   = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => setPhoto(e.target?.result as string)
    reader.readAsDataURL(file)
    setResult(null); setSaved(false); setError("")
  }, [])

  async function generate() {
    if (!photo) return
    setLoading(true); setError(""); setResult(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      const res = await fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: photo, style, userId: user?.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Fehler"); return }
      setResult(data.imageUrl)
      setGenCount(n => n + 1)
    } catch { setError("Netzwerkfehler") }
    finally { setLoading(false) }
  }

  async function save() {
    if (!result) return
    setSaving(true); setError("")
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError("Nicht eingeloggt"); return }

      // Bild von URL herunterladen + in Supabase Storage laden
      const imgRes = await fetch(result)
      const blob = await imgRes.blob()
      const filename = `avatar-${user.id}-${Date.now()}.png`
      const { data: upload, error: uploadErr } = await sb.storage
        .from("avatars")
        .upload(filename, blob, { contentType: "image/png", upsert: true })

      if (uploadErr) { setError("Upload fehlgeschlagen: " + uploadErr.message); return }

      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(filename)

      // Profil aktualisieren
      const { error: updateErr } = await sb.from("profiles")
        .update({ avatar_url: publicUrl }).eq("id", user.id)

      if (updateErr) { setError("Profil-Update fehlgeschlagen"); return }

      setSaved(true)
    } catch { setError("Speicherfehler") }
    finally { setSaving(false) }
  }

  return (
    <main style={{ minHeight:"100vh", background:BG, padding:"20px 16px 100px" }}>
      <div style={{ maxWidth:480, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <Link href="/profil" style={{ color:M, fontSize:20, textDecoration:"none" }}>←</Link>
          <h1 style={{ fontSize:22, fontWeight:900, fontFamily:"'League Spartan', system-ui, sans-serif", textTransform:"uppercase", letterSpacing:".1em", margin:0, background:GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            avatar erstellen
          </h1>
        </div>

        {/* Stil-Auswahl */}
        <p style={{ fontSize:11, fontWeight:700, color:M, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>stil</p>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {STYLES.map(s => (
            <button key={s.id} onClick={() => { setStyle(s.id); setResult(null); setSaved(false) }} style={{
              background: style===s.id ? "#fff" : C,
              border: `1px solid ${style===s.id ? "#fff" : B}`,
              borderRadius:999, padding:"8px 14px",
              fontSize:13, fontWeight:700,
              color: style===s.id ? "#14161A" : M,
              cursor:"pointer", whiteSpace:"nowrap"
            }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* Foto Upload */}
        <p style={{ fontSize:11, fontWeight:700, color:M, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>dein foto</p>
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          style={{
            background: photo ? "transparent" : C,
            border: `2px dashed ${photo ? "transparent" : B}`,
            borderRadius:14, minHeight:180,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", marginBottom:16, overflow:"hidden", position:"relative"
          }}
        >
          {photo ? (
            <img src={photo} alt="Foto" style={{ width:"100%", maxHeight:280, objectFit:"cover", objectPosition:"top", borderRadius:14 }} />
          ) : (
            <div style={{ textAlign:"center", padding:24 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📸</div>
              <p style={{ fontSize:14, color:M }}>foto hochladen oder hierher ziehen</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:4 }}>gesicht gut sichtbar → bestes resultat</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f) }} />
        </div>

        {/* Generieren Button */}
        {photo && !loading && (
          <button onClick={generate} style={{
            width:"100%", background:"#fff", color:"#14161A", border:"none",
            borderRadius:12, padding:"15px", fontSize:15, fontWeight:800,
            cursor:"pointer", textTransform:"lowercase", marginBottom:16
          }}>
            {genCount === 0 ? "🎨 avatar generieren" : "🔄 nochmals generieren"}
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
            <p style={{ color:W, fontWeight:700, fontSize:15 }}>generiere deinen avatar...</p>
            <p style={{ color:M, fontSize:12, marginTop:6 }}>~30–60 sekunden</p>
          </div>
        )}

        {/* Resultat */}
        {result && !loading && (
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:700, color:M, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>dein avatar</p>

            {/* Vorschau: Ganzkörper + Kopf-Preview */}
            <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
              <div style={{ flex:1, borderRadius:14, overflow:"hidden", border:`1px solid ${B}` }}>
                <img src={result} alt="Avatar" style={{ width:"100%", display:"block" }} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {/* Kopf-Crop Preview (wie Profilbild klein) */}
                <div style={{ width:72, height:72, borderRadius:"50%", overflow:"hidden", border:`2px solid #fff` }}>
                  <img src={result} alt="Avatar Kopf" style={{ width:"100%", height:"200%", objectFit:"cover", objectPosition:"top center" }} />
                </div>
                <p style={{ fontSize:10, color:M, textAlign:"center", margin:0 }}>profilbild</p>
                {/* Quadrat-Preview */}
                <div style={{ width:72, height:72, borderRadius:10, overflow:"hidden", border:`2px solid ${B}` }}>
                  <img src={result} alt="Avatar Square" style={{ width:"100%", height:"200%", objectFit:"cover", objectPosition:"top center" }} />
                </div>
                <p style={{ fontSize:10, color:M, textAlign:"center", margin:0 }}>karte</p>
              </div>
            </div>

            {saved ? (
              <div style={{ background:`${G}18`, border:`1px solid ${G}40`, borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
                <p style={{ fontSize:15, fontWeight:800, color:G, margin:0 }}>✓ avatar gespeichert!</p>
                <Link href="/profil" style={{ fontSize:13, color:M, display:"block", marginTop:6 }}>← zurück zum profil</Link>
              </div>
            ) : (
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={generate} style={{
                  flex:1, background:"transparent", border:`1px solid #2A3340`, borderRadius:10,
                  padding:"13px", fontSize:13, fontWeight:700, color:W, cursor:"pointer"
                }}>🔄 nochmals</button>
                <button onClick={save} disabled={saving} style={{
                  flex:2, background:"#fff", color:"#14161A", border:"none",
                  borderRadius:10, padding:"13px", fontSize:14, fontWeight:800,
                  cursor:saving ? "wait" : "pointer"
                }}>
                  {saving ? "speichert..." : "✓ als profilbild speichern"}
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p style={{ color:"#f87171", fontSize:13, marginTop:12 }}>{error}</p>}

        <p style={{ fontSize:11, color:M, marginTop:20, textAlign:"center" }}>
          3 generierungen pro stunde · ~30–60 sek pro avatar
        </p>
      </div>
    </main>
  )
}
