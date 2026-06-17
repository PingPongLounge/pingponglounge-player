"use client"
import { useEffect, useState, use } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"

const BG="#0C0D10",C="#111318",B="#1E2230",M="rgba(255,255,255,0.62)",G="#39FF14",W="#FFFFFF"
const GRAD={background:"linear-gradient(135deg,#39FF14 0%,#00D4AA 50%,#1FD1C4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 10px rgba(57,255,20,0.2))"} as const

type MatchDetail = {
  id: string; level: string; city: string; proposed_time: string | null
  message: string | null; status: string; creator_id: string; joiner_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creator: any; joiner: any
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params)
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      setUserId(user?.id || null)
      const { data } = await sb.from("open_matches")
        .select("id,level,city,proposed_time,message,status,creator_id,joiner_id,creator:profiles!open_matches_creator_id_fkey(name,elo),joiner:profiles!open_matches_joiner_id_fkey(name,elo)")
        .eq("id", matchId).single()
      if (data) setMatch(data as MatchDetail)
    }
    load()
  }, [matchId])

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/match/${matchId}/cancel`, { method: "POST" })
    window.history.back()
  }

  if (!match) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: M, fontWeight: 400, textTransform: "lowercase" }}>lädt...</p>
      <BottomNav /></main>

  const c_ = match.creator ? (Array.isArray(match.creator) ? match.creator[0] : match.creator) : null
  const j_ = match.joiner  ? (Array.isArray(match.joiner)  ? match.joiner[0]  : match.joiner)  : null
  const isCreator = userId === match.creator_id
  const isJoiner  = userId === match.joiner_id

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/match" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← open game</Link>
        <div style={{ margin: "20px 0 24px", textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em", textTransform: "lowercase", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "3px 10px" }}>{match.level}</span>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", margin: "10px 0 6px", ...GRAD }}>match</h1>
          <p style={{ fontSize: 13, color: M, fontWeight: 400, textTransform: "lowercase" }}>📍 {match.city}</p>
        </div>
        <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1A1D24", border: "1px solid #2A2D38", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏓</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: W }}>{c_?.name || "?"}</p>
              <p style={{ fontSize: 11, color: M, fontWeight: 400 }}>elo {c_?.elo ?? "—"}</p>
              {isCreator && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4, textTransform: "lowercase" }}>du</p>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: M, textTransform: "lowercase" }}>vs</div>
            <div style={{ flex: 1, textAlign: "center" }}>
              {j_ ? (<>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1A1D24", border: "1px solid #2A2D38", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏓</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: W }}>{j_.name}</p>
                <p style={{ fontSize: 11, color: M, fontWeight: 400 }}>elo {j_.elo ?? "—"}</p>
                {isJoiner && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4, textTransform: "lowercase" }}>du</p>}
              </>) : (<>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "transparent", border: "1px dashed #3A3D48", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: M }}>+</div>
                <p style={{ fontSize: 13, color: M, fontWeight: 400, textTransform: "lowercase" }}>wartet auf dich</p>
              </>)}
            </div>
          </div>
        </div>
        {isCreator && match.status !== "matched" && (
          <div style={{ marginTop: 16 }}>
            {confirmDelete ? (
              <div style={{ background: "#f8717110", border: "1px solid #f8717140", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 13, color: "#f87171", fontWeight: 600, marginBottom: 10 }}>match wirklich löschen?</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, background: "transparent", color: "rgba(255,255,255,0.85)", border: `1px solid #2A2D38`, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "lowercase" }}>abbrechen</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, background: "#f87171", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "lowercase" }}>{deleting ? "..." : "ja, löschen"}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", background: "transparent", color: "rgba(255,255,255,0.85)", border: `1px solid #2A2D38`, borderRadius: 10, padding: "11px", fontSize: 13, cursor: "pointer", fontWeight: 500, textTransform: "lowercase" }}>match löschen</button>
            )}
          </div>
        )}

        {match.status === "matched" && (
          <div style={{ background: `${G}12`, border: `1px solid ${G}30`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: G, textTransform: "lowercase" }}>✓ match ist voll!</p>
          </div>
        )}
      </div>
    </main>
  )
}
