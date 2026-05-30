export default function LigaPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0C', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <a href="/" style={{ color: '#6B6E7A', textDecoration: 'none', fontSize: '13px', display: 'block', marginBottom: '40px' }}>← Dashboard</a>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#FF00C8', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px' }}>Coming Q3 2026</p>
        <h1 style={{ fontSize: '56px', fontWeight: 900, textTransform: 'uppercase', color: '#FFF9F3', marginBottom: '16px' }}>LIGA</h1>
        <p style={{ fontSize: '15px', color: '#6B6E7A' }}>Stadtweise Saisons, Live-Tabelle, Auf-/Abstieg, ELO</p>
      </div>
    </main>
  )
}
