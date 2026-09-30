"use client"
/* Runder Avatar mit Initialen-Rueckfall — und, nur im eigenen Profil, ein
   kleiner violetter Knopf zum Wechseln des Bildes (07.09.2026, Oliver).

   Der Upload ist NICHT neu gebaut: er nutzt denselben Weg wie /profil/avatar —
   quadratisch zuschneiden, auf 400px verkleinern, in den Storage-Bucket
   "avatars", danach profiles.avatar_url setzen. Ohne das Verkleinern landen
   5-MB-Handyfotos in der Rangliste. */
import { useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const NEON = "#53FDB1", SCHWARZ = "#1A1718"

export function initialen(name?: string | null): string {
  if (!name) return "PP"
  const teile = name.trim().split(/\s+/).filter(Boolean)
  if (!teile.length) return "PP"
  if (teile.length === 1) return teile[0].slice(0, 2).toUpperCase()
  return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase()
}

/** Mittigen quadratischen Ausschnitt auf `groesse` px bringen. */
function quadrat(dataUrl: string, groesse = 400): Promise<Blob> {
  return new Promise((ok, fehler) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement("canvas")
      c.width = groesse; c.height = groesse
      const ctx = c.getContext("2d")
      if (!ctx) { fehler(new Error("Canvas nicht verfügbar")); return }
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, groesse, groesse)
      c.toBlob(b => b ? ok(b) : fehler(new Error("Konvertierung fehlgeschlagen")), "image/jpeg", 0.85)
    }
    img.onerror = () => fehler(new Error("Bild konnte nicht gelesen werden"))
    img.src = dataUrl
  })
}

export default function ProfilAvatar({
  src, name, groesse = 104, editierbar = false,
}: { src?: string | null; name: string; groesse?: number; editierbar?: boolean }) {
  const [bild, setBild] = useState<string | null>(src || null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState("")
  const feld = useRef<HTMLInputElement>(null)

  async function waehlen(datei: File) {
    setLaedt(true); setFehler("")
    try {
      const dataUrl: string = await new Promise((ok, nok) => {
        const r = new FileReader()
        r.onload = e => ok(e.target?.result as string)
        r.onerror = () => nok(new Error("Datei konnte nicht gelesen werden"))
        r.readAsDataURL(datei)
      })
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setFehler("Nicht angemeldet"); return }

      const blob = await quadrat(dataUrl)
      const name = `avatar-${user.id}-${Date.now()}.jpg`
      const { error: up } = await sb.storage.from("avatars")
        .upload(name, blob, { contentType: "image/jpeg", upsert: true })
      if (up) { setFehler("Upload fehlgeschlagen"); return }

      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(name)
      const { error: db } = await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)
      if (db) { setFehler("Profil konnte nicht aktualisiert werden"); return }
      setBild(publicUrl)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler beim Speichern")
    } finally { setLaedt(false) }
  }

  const knopf = Math.max(30, Math.round(groesse * 0.34))

  return (
    <div style={{ display: "inline-block" }}>
      <div style={{ position: "relative", width: groesse, height: groesse }}>
        <div style={{
          width: groesse, height: groesse, borderRadius: "50%", overflow: "hidden",
          /* Der Ring war neongruen und damit das lauteste Element des
             Profils. Ein Avatar ist kein Statussignal. */
          background: "color-mix(in srgb, currentColor 9%, transparent)",
          border: "2px solid color-mix(in srgb, currentColor 26%, transparent)",
          display: "grid", placeItems: "center", opacity: laedt ? .5 : 1,
        }}>
          {bild
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={bild} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <span style={{
                fontFamily: "var(--font-anton), Impact, sans-serif",
                fontSize: Math.round(groesse * 0.36), color: "currentColor", lineHeight: 1, letterSpacing: ".02em",
              }}>{initialen(name)}</span>}
        </div>

        {editierbar && (
          <>
            <button
              type="button"
              onClick={() => feld.current?.click()}
              disabled={laedt}
              aria-label="Profilbild ändern"
              style={{
                position: "absolute", right: -2, bottom: -2,
                width: knopf, height: knopf, borderRadius: "50%",
                background: NEON, border: `3px solid ${SCHWARZ}`, cursor: laedt ? "default" : "pointer",
                display: "grid", placeItems: "center", padding: 0,
              }}
            >
              <svg width={Math.round(knopf * 0.5)} height={Math.round(knopf * 0.5)} viewBox="0 0 24 24"
                fill="none" stroke={SCHWARZ} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 8.5h3.2l1.4-2h7.8l1.4 2H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
                <circle cx="12" cy="13.5" r="3.4" />
              </svg>
            </button>
            <input ref={feld} type="file" accept="image/*" hidden
              onChange={e => { const d = e.target.files?.[0]; if (d) waehlen(d); e.target.value = "" }} />
          </>
        )}
      </div>
      {editierbar && (
        <button type="button" onClick={() => feld.current?.click()} disabled={laedt}
          style={{
            display: "block", width: groesse, margin: "7px auto 0", padding: 0,
            background: "transparent", border: "none", textAlign: "center",
            cursor: laedt ? "default" : "pointer", whiteSpace: "nowrap",
            fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase",
            color: "color-mix(in srgb, currentColor 62%, transparent)",
          }}>{laedt ? "lädt …" : "Bild ändern"}</button>
      )}
      {fehler && <div style={{ fontSize: 13, color: "#FF7A72", marginTop: 8, maxWidth: 200 }}>{fehler}</div>}
    </div>
  )
}
