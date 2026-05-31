"use client"
import { createClient } from "@/lib/supabase/client"
export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }
  return <button onClick={handleLogout} style={{ background: "none", border: "1px solid #26282E", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", color: "#6B6E7A", cursor: "pointer", fontFamily: "inherit" }}>Abmelden</button>
}