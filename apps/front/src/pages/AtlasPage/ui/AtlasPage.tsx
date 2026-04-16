import { Link } from 'react-router-dom'
import { PageMeta } from '@/shared/ui/PageMeta'

export function AtlasPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a2236 0%, #0a0f1a 70%)',
      padding: 24,
    }}>
      <PageMeta title="Atlas — DRUZ9" description="World atlas" canonicalPath="/atlas" />
      <div style={{
        maxWidth: 520, textAlign: 'center',
        padding: '40px 28px',
        background: 'linear-gradient(148deg, #F8F4EC, #EDE8DB)',
        border: '3px solid #C8AC7E', borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,.5)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🗺️</div>
        <h1 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 16,
          color: '#5C3A1E', marginBottom: 12, letterSpacing: '.08em',
        }}>World Atlas</h1>
        <p style={{ fontSize: 14, color: '#6B5A47', lineHeight: 1.6, marginBottom: 20 }}>
          The world map is being charted by the cartographers. Come back soon — new realms await.
        </p>
        <Link to="/home" style={{
          display: 'inline-block',
          padding: '10px 22px',
          background: 'linear-gradient(180deg, #059669, #047857)',
          border: '2px solid #047857', borderRadius: 8,
          color: '#fff', textDecoration: 'none',
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          textShadow: '0 1px 2px rgba(0,0,0,.3)',
        }}>← Back to Camp</Link>
      </div>
    </div>
  )
}
