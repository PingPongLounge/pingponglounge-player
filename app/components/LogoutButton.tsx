"use client"
/* 24.09.2026: Der Knopf war eine dunkle Pille mit Radius 8 — gebaut fuer
   den alten dunklen Kopfbereich. Auf der hellen Profilseite stand er als
   fremder Koerper darin. Jetzt die Umriss-Form des Systems; die Variante
   "menu" bleibt die schmale Textzeile im Hamburger. */
import { knopfUmriss } from "@/app/design"

export default function LogoutButton({ variant = "header" }: { variant?: "header" | "menu" }) {
  const style: React.CSSProperties = variant === "menu"
    ? { background: "none", padding: 0, fontSize: 13, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.72)", cursor: "pointer", fontFamily: "inherit" }
    : { ...knopfUmriss, width: "100%" }

  return (
    <form action="/auth/signout" method="post" style={variant === "menu" ? { display: "inline" } : { display: "block" }}>
      <button type="submit" style={style}>Abmelden</button>
    </form>
  )
}
