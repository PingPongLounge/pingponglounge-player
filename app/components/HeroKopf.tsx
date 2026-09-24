"use client"
/* HeroKopf ist seit dem 24.09.2026 nur noch ein Weiterleiter.

   Bis dahin zeichnete er ein eigenes P-SVG und setzte die Wortmarke in
   Inter 900 — waehrend die Startseite ihr Logo aus PlayerZeichen holte
   und die Wortmarke in Anton setzte. Zwei Koepfe in einer App.

   Die acht Aufrufstellen (Liga, Match, Rangliste, Turniere, Profil,
   StartHomeV2 ...) bleiben unveraendert; gerendert wird PlayerKopf. */
import PlayerKopf from "./PlayerKopf"

export default function HeroKopf({ ziel = "/entdecken", rechts }: { ziel?: string; rechts?: React.ReactNode }) {
  return <PlayerKopf ziel={ziel} rechts={rechts} />
}
