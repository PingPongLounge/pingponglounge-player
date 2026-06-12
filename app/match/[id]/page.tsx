"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8"
const levelColor = (l: string) => ({ Locker: "#4ADE80", Hobby: "#FACC15", Fortgeschritten: "#FB923C", Competitive: PK }[l] || G)

type MatchDetail = {
  id: string; level: string; city: string; proposed_time: string | null
  message: string | null; status: string; creator_id: string; joiner_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creator: any; joiner: any
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const matchId = params.id
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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

  if (!match) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: M }}>Lädt...</p></main>

  const lc = levelColor(match.level)
  const c_ = match.creator ? (Array.isArray(match.creator) ? match.creator[0] : match.creator) : null
  const j_ = match.joiner  ? (Array.isArray(match.joiner)  ? match.joiner[0]  : match.joiner)  : null
  const isCreator = userId === match.creator_id
  const isJoiner  = userId === match.joiner_id

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/match" style={{ color: M, textDecoration: "none", fontSize: 13 }}>← Open Matches</Link></div>
        <div style={{ margin: "20px 0 24px", textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: lc, letterSpacing: "0.14em", textTransform: "uppercase" }}>{match.level}</span>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: W, textTransform: "uppercase", margin: "6px 0 4px" }}>MATCH</h1>
          <p style={{ fontSize: 13, color: M }}>📍 {match.city}</p>
        </div>
        <div style={{ background: C, border: `1px solid ${B}`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${G}18`, border: `2px solid ${G}40`, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏓</div>
              <p style={{ fontSize: 14, fontWeight: 800, color: W }}>{c_?.name || "?"}</p>
              <p style={{ fontSize: 11, color: M }}>ELO {c_?.elo ?? "—"}</p>
              {isCreator && <p style={{ fontSize: 10, color: G, marginTop: 4 }}>Du</p>}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: M }}>VS</div>
            <div style={{ flex: 1, textAlign: "center" }}>
              {j_ ? (<>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${PK}18`, border: `2px solid ${PK}40`, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏓</div>
                <p style={{ fontSize: 14, fontWeight: 800, color: W }}>{j_.name}</p>
                <p style={{ fontSize: 11, color: M }}>ELO {j_.elo ?? "—"}</p>
                {isJoiner && <p style={{ fontSize: 10, color: G, marginTop: 4 }}>Du</p>}
              </>) : (<>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: B, border: `2px dashed ${B}`, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>?</div>
                <p style={{ fontSize: 13, color: M }}>Wartet auf dich</p>
              </>)}
            </div>
          </div>
        </div>
        {match.status === "matched" && (
          <div style={{ background: `${G}12`, border: `1px solid ${G}30`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: G }}>✓ Match ist voll!</p>
          </div>
        )}
      </div>
    </main>
  )
}
