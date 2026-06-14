"use client"
import { createClient } from "@/lib/supabase/client"
export default function LogoutButton({ variant="header" }: { variant?: "header"|"menu" }) {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }
  const style = variant === "menu"
    ? { background:"none", border:"none", padding:0, fontSize:"13px", fontWeight:700, color:"#f87171", cursor:"pointer", fontFamily:"inherit" }
    : { background:"none", border:"1px solid #26282E", borderRadius:"8px", padding:"6px 14px", fontSize:"12px", color:"#6B6E7A", cursor:"pointer", fontFamily:"inherit" }
  return <button onClick={handleLogout} style={style}>Abmelden</button>
}