"use client"

export default function LogoutButton({ variant = "header" }: { variant?: "header" | "menu" }) {
  const style = variant === "menu"
    ? { background: "none", padding: 0, fontSize: "13px", fontWeight: 700, color: "#f87171", cursor: "pointer", fontFamily: "inherit" }
    : { background: "#353B46", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", color: "rgba(255,255,255,0.66)", cursor: "pointer", fontFamily: "inherit" }

  return (
    <form action="/auth/signout" method="post" style={{ display: "inline" }}>
      <button type="submit" style={style}>Abmelden</button>
    </form>
  )
}
