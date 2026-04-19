// ADR-002 — Atlas/Hub "Card of advice". Renders the user's deterministic
// (or LLM-generated, when wired) recommendations. Hides itself silently
// on error so the page layout doesn't break for anonymous viewers.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { insightsApi, type Insight, type InsightItem } from '@/features/Insights/api/insightsApi'

export function InsightCard() {
  const [data, setData] = useState<Insight | null>(null)

  useEffect(() => {
    let cancelled = false
    insightsApi
      .getMine()
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!data) return null
  const empty = !data.topStrengths.length && !data.topGaps.length && !data.nextSteps.length
  if (empty && !data.summary) return null

  return (
    <div
      style={{
        background: 'var(--parch-0, #fbf3dd)',
        border: '3px solid var(--ink-0, #2a1a0c)',
        boxShadow: '4px 4px 0 var(--ember-1, #b34a18)',
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}>
        совет картографа
      </div>
      <p style={{ fontSize: 13, marginBottom: 10, color: 'var(--ink-0, #2a1a0c)' }}>{data.summary}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Column title="Сильные стороны" items={data.topStrengths} accent="moss" />
        <Column title="Слабые места" items={data.topGaps} accent="ember" />
        <Column title="Что делать дальше" items={data.nextSteps} accent="parch" linkable />
      </div>
      {data.generatedAt && (
        <div style={{ fontSize: 10, color: 'var(--ink-2, #7d6850)', marginTop: 10 }}>
          обновлено {formatGeneratedAt(data.generatedAt)} · источник: {data.source}
        </div>
      )}
    </div>
  )
}

function Column({
  title,
  items,
  accent,
  linkable,
}: { title: string; items: InsightItem[]; accent: 'moss' | 'ember' | 'parch'; linkable?: boolean }) {
  if (items.length === 0) return <div style={{ color: 'var(--ink-2, #7d6850)', fontSize: 12 }}>{title}: пока нет данных.</div>
  const accentColor = accent === 'moss' ? 'var(--moss-1, #3d6149)' : accent === 'ember' ? 'var(--ember-1, #b34a18)' : 'var(--ink-1, #5b4331)'
  return (
    <div>
      <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: accentColor, letterSpacing: '0.08em', marginBottom: 6 }}>
        {title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, idx) => (
          <li key={idx} style={{ fontSize: 12, lineHeight: 1.4 }}>
            {linkable && it.actionUrl ? (
              <Link to={it.actionUrl} style={{ color: 'var(--ember-1)', fontWeight: 600 }}>{it.title} →</Link>
            ) : (
              <strong style={{ color: 'var(--ink-0, #2a1a0c)' }}>{it.title}</strong>
            )}
            {it.description && <div style={{ color: 'var(--ink-2, #7d6850)' }}>{it.description}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatGeneratedAt(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}
