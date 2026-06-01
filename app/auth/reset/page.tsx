"use client"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

export default function ResetPage() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const info = [
      "SEARCH: " + window.location.search,
      "HASH: " + (window.location.hash ? window.location.hash.substring(0, 60) + "..." : "(leer)"),
    ].join("\n")
    setDebugInfo(info)
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#111214", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, fontFamily: "monospace" }}>
      <div style={{ width: "100%", maxWidth: 500, background: "#1A1C1F", borderRadius: 12, padding: 24 }}>
        <h2 style={{ color: "#39FF14", marginBottom: 16 }}>Debug Reset URL</h2>
        <pre style={{ color: "#fff", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {debugInfo || "Lädt…"}
        </pre>
      </div>
    </div>
  )
}
