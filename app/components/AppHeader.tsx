"use client"
/* Der Kopfbalken fuer die Seiten, die noch keinen eigenen Kopf mitbringen
   (Feed, Matchhistorie, Achievements, PingPoints, Stunden, Erstellen,
   Benachrichtigungen, Admin, Staff …).

   24.09.2026: Hier stand ein ZWEITER Kopf — schwarz, "PPL.PLAYER" in Inter
   900, daneben ein neongrun umrandeter Avatarkreis. Auf jeder Seite, die
   inzwischen PlayerKopf mitbringt, standen dadurch zwei Koepfe
   uebereinander, und auf den uebrigen Seiten stand ein anderes Logo als im
   Rest der App. Gerendert wird jetzt derselbe PlayerKopf wie ueberall; nur
   die dunkle, klebende Leiste darum ist hier geblieben. */
import { usePathname } from "next/navigation"
import PlayerKopf from "./PlayerKopf"
import { DUNKEL } from "@/app/design"

// Seiten, die ihren Kopf selbst mitbringen (Hero mit PlayerKopf darin).
const HIDE = ["/", "/entdecken", "/rangliste", "/profil", "/spieler", "/login",
  "/onboarding", "/spielen", "/join", "/auth", "/liga", "/match", "/turniere",
  "/training", "/shop", "/freunde"]

export default function AppHeader() {
  const path = usePathname() || "/"
  /* 24.09.2026: Der Vergleich war path.startsWith(h) OHNE Schraegstrich.
     "/matchhistorie" beginnt mit "/match" und "/trainingscamp" mit
     "/training" — auf beiden Seiten fiel der Kopf deshalb ersatzlos weg,
     und es gab von dort keinen Weg zurueck ausser der unteren Leiste. */
  if (HIDE.some(h => h === path || (h !== "/" && path.startsWith(h + "/")))) return null
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: DUNKEL }}>
      <PlayerKopf />
    </header>
  )
}
