import type { Metadata } from "next"
import "./globals.css"
import AppHeader from "./components/AppHeader"

export const metadata: Metadata = {
  title: "Next Level Table Tennis",
  description: "Finde Mitspieler, spiel in der Liga und verfolge dein ELO-Ranking.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#0E1014", color: "#E8E6E1", fontFamily: "system-ui, sans-serif", minHeight: "100vh" }}>
        <AppHeader />
        {children}
      </body>
    </html>
  )
}
