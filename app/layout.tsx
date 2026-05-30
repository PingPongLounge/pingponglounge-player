import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PPL Player',
  description: 'Ping Pong Lounge — Player Portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: '#0A0A0C', color: '#FFF9F3', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
