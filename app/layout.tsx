import type { Metadata } from 'next'
import './globals.css'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Player',
  description: 'Player by Ping Pong Lounge — Liga, Turniere, ELO-Ranking',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
      </body>
    </html>
  )
}
