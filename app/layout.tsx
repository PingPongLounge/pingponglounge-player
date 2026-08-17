import type { Metadata } from "next"
import "./globals.css"
import AppHeader from "./components/AppHeader"
import SplashScreen from "./components/SplashScreen"

// Ohne og:image kommt beim Teilen in WhatsApp eine nackte Zeile an — genau der
// Moment, in dem die Leute entscheiden, ob sie tippen. Deshalb: Karte, Titel, Text.
const BASE = "https://playerapp.ch"

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: "Player — Pingpong Next Level",
  description: "Liga, Open Games und Turniere — vom Anfänger bis zum Profi. Spiel, trag dein Resultat ein, steig auf.",
  // Safari (Favoriten, Home-Bildschirm) und Android zeigen KEIN SVG-Favicon —
  // ohne PNG/ICO kam die graue Kachel mit dem Anfangsbuchstaben.
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

// themeColor gehört seit Next 14 in den viewport-Export, nicht in metadata.
export const viewport = { themeColor: "#0A0B0D" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#0A0B0D", color: "#E8E6E1", fontFamily: "system-ui, sans-serif", minHeight: "100vh" }}>
        <SplashScreen />
        <AppHeader />
        {children}
      </body>
    </html>
  )
}
