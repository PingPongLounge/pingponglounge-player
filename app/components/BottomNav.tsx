/* 16.09.2026: Die feste untere Leiste ist ersatzlos weg. Die Navigation
   sitzt jetzt oben rechts hinter dem Hamburger und wird EINMAL im
   Root-Layout eingehaengt (app/layout.tsx → <HauptMenu />).

   Diese Datei bleibt als Leerstelle stehen, weil 22 Seiten <BottomNav />
   einbinden. Wuerde sie das Menue selbst rendern, staende es auf diesen
   Seiten doppelt. Ein Massen-Rename haette nichts verbessert und den
   Verlauf unlesbar gemacht; die Aufrufe verschwinden bei der naechsten
   Ueberarbeitung der jeweiligen Seite von selbst. */
export default function BottomNav() { return null }
