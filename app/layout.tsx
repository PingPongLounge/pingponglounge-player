import type { Metadata } from "next"
import { Anton, Inter } from "next/font/google"
import "./globals.css"
import AppHeader from "./components/AppHeader"
import SplashScreen from "./components/SplashScreen"
import InvitePopup from "./components/InvitePopup"

const BASE = "https://playerapp.ch"

// 06.09.2026: League Spartan raus. Zwei Schriften, mehr nicht — Anton fuer
// Titel, Inter fuer die Oberflaeche, dasselbe System wie pingponglounge.ch.
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

/* Hochzaehlen, wenn sich das Icon aendert. Siehe Kommentar bei icons. */
const ICON_V = "2"

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  alternates: { canonical: BASE },
  title: "PPL Player — Ping Pong spielen",
  description: "Ping Pong spielen — Rating, Ranking, Liga und Community. Vom Anfänger bis zum Profi.",
  /* ── FAVICON ───────────────────────────────────────────────────────────
     EINE Quelle, und zwar diese. app/icon.svg ist am 12.09. herausgenommen
     worden: Next.js kennt zwei Wege, ein Favicon zu setzen — die
     Datei-Konvention (app/icon.*) und dieses Feld. Beides gleichzeitig
     heisst zwei Dateien, die dasselbe darstellen sollen, und genau daran
     ist die Farbe schon einmal auseinandergelaufen (17.08., Commit 17427ce:
     "doppelter Favicon-Eintrag mit falscher Farbe"). Wer das Icon aendert,
     aendert es jetzt in public/ — und nirgends sonst.

     Das ?v= ist kein Schmuck. Safari merkt sich Favicons sehr lange und
     zeigte deshalb noch das gruene Icon von vor dem 04.09., obwohl der
     Server laengst das violette ausliefert. Eine neue Adresse ist fuer den
     Browser ein neues Bild. Beim naechsten Iconwechsel diese Zahl
     hochzaehlen. */
  icons: {
    icon: [
      { url: `/favicon.svg?v=${ICON_V}`, type: "image/svg+xml" },
      { url: `/favicon-32.png?v=${ICON_V}`, sizes: "32x32", type: "image/png" },
      { url: `/favicon-16.png?v=${ICON_V}`, sizes: "16x16", type: "image/png" },
    ],
    shortcut: `/favicon.ico?v=${ICON_V}`,
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_V}`, sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "de_CH",
    url: BASE,
    siteName: "Player",
    title: "PPL Player — Ping Pong spielen",
    description: "Rating, Ranking, Liga und Community.",
    images: [{ url: "/share-card.jpg", width: 1200, height: 630, alt: "Player — Pingpong Next Level" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PPL Player — Ping Pong spielen",
    description: "Rating, Ranking, Liga und Community.",
    images: ["/share-card.jpg"],
  },
}

export const viewport = { themeColor: "#080808" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${anton.variable} ${inter.variable}`}>
      <body style={{ margin: 0, background: "#080808", color: "#F4F1EB", fontFamily: "var(--font-inter), system-ui, sans-serif", minHeight: "100vh" }}>
        <SplashScreen />
        <AppHeader />
        {children}
        <InvitePopup />
      </body>
    </html>
  )
}
