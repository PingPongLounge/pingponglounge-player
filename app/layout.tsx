import type { Metadata } from "next"
import { League_Spartan } from "next/font/google"
import "./globals.css"
import AppHeader from "./components/AppHeader"
import SplashScreen from "./components/SplashScreen"
import InvitePopup from "./components/InvitePopup"

const BASE = "https://playerapp.ch"

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-league-spartan",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  alternates: { canonical: BASE },
  title: "Player — Pingpong Next Level",
  description: "Liga, Open Games und Turniere — vom Anfänger bis zum Profi. Spiel, trag dein Resultat ein, steig auf.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "de_CH",
    url: BASE,
    siteName: "Player",
    title: "Player — Spiel. Trag ein. Steig auf.",
    description: "Liga, Open Games und Turniere — vom Anfänger bis zum Profi.",
    images: [{ url: "/share-card.jpg", width: 1200, height: 630, alt: "Player — Pingpong Next Level" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Player — Spiel. Trag ein. Steig auf.",
    description: "Liga, Open Games und Turniere — vom Anfänger bis zum Profi.",
    images: ["/share-card.jpg"],
  },
}

export const viewport = { themeColor: "#080808" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={leagueSpartan.variable}>
      <body style={{ margin: 0, background: "#080808", color: "#F4F1EB", fontFamily: "var(--font-league-spartan), system-ui, sans-serif", minHeight: "100vh" }}>
        <SplashScreen />
        <AppHeader />
        {children}
        <InvitePopup />
      </body>
    </html>
  )
}
