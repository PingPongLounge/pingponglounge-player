import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'

const BG = '#12151A', CARD = '#2A2F39', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.88)', MUT = 'rgba(255,255,255,.82)'
const GRAD = 'linear-gradient(135deg,#FF00C8,#FF5CDC)'

export default function ShopPage() {
  return (
    <main style={{ minHeight: '100vh', background: BG, padding: '20px 16px 110px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link href="/entdecken" style={{ color: MUT, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Start</Link>

        <div style={{ marginTop: 40, textAlign: 'center', background: CARD, borderRadius: 24, padding: '40px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.14)' }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="url(#sg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
            <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF00C8" /><stop offset="1" stopColor="#FF5CDC" /></linearGradient></defs>
            <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
          </svg>
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-.01em', marginTop: 16, ...{ background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' } }}>Shop</div>
          <div style={{ fontSize: 15, color: SUB, fontWeight: 300, marginTop: 12, lineHeight: 1.5 }}>Schläger, Bälle, Apparel & PingPoints-Prämien — bald direkt hier buchbar.</div>
          <a href="https://www.pingponglounge.ch" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 24, borderRadius: 15, padding: '14px 28px', fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', color: '#FFFFFF', textDecoration: 'none', background: GRAD }}>Zur Webseite</a>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
