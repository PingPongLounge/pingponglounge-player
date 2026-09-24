import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import { IconBuchungen } from '@/app/components/Icons'

const BG = '#0E0E10', CARD = '#1A1A1E', W = '#FFFFFF'
const SUB = 'rgba(255,255,255,.88)', MUT = 'rgba(255,255,255,.82)'
const GRAD = 'linear-gradient(135deg,#39FF14,#12D45C)'

export default function ShopPage() {
  return (
    <main className="p-dunkel" style={{ minHeight: '100vh', padding: '20px 16px 110px' }}>
      <div className="ppl-huelle">
        <Link href="/entdecken" style={{ color: MUT, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Start</Link>

        <div style={{ marginTop: 40, textAlign: 'center', background: CARD, borderRadius: 24, padding: '40px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.14)' }}>
          <IconBuchungen size={46} style={{ margin: '0 auto', color: '#39FF14' }} />
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-.01em', marginTop: 16, ...{ background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' } }}>Shop</div>
          <div style={{ fontSize: 15, color: SUB, fontWeight: 300, marginTop: 12, lineHeight: 1.5 }}>Schläger, Bälle, Apparel & PingPoints-Prämien — bald direkt hier buchbar.</div>
          <a href="https://www.pingponglounge.ch" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 24, borderRadius: 15, padding: '14px 28px', fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', color: '#0B0B0D', textDecoration: 'none', background: GRAD }}>Zur Webseite</a>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
