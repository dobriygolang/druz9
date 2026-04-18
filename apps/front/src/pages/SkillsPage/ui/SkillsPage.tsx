import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import { skillsApi, type SkillNode, type SkillTreeData } from '@/features/Skills/api/skillsApi'

const BRANCH_COLORS: Record<string, string> = {
  hub:      'var(--ember-1)',
  artisan:  'var(--moss-1)',
  scholar:  'var(--moss-2)',
  warrior:  'var(--ember-1)',
  merchant: 'var(--parch-3)',
  monk:     'var(--ink-2)',
}

const BRANCH_LABELS: Record<string, string> = {
  artisan:  'Artisan',
  scholar:  'Scholar',
  warrior:  'Warrior',
  merchant: 'Merchant',
  monk:     'Monk',
}

function nodeClass(node: SkillNode, animating: Set<string>): string {
  const base = 'rpg-skill-node'
  const keystone = node.keystone || node.branch === 'hub' ? 'rpg-skill-node--keystone' : ''
  const anim = animating.has(node.skillId) ? 'rpg-skill-node--animating' : ''
  let state: string
  if (node.branch === 'hub') {
    state = 'rpg-skill-node--current'
  } else if (node.state === 'allocated') {
    state = 'rpg-skill-node--allocated'
  } else if (node.state === 'available') {
    state = 'rpg-skill-node--available'
  } else {
    state = 'rpg-skill-node--locked'
  }
  return [base, state, keystone, anim].filter(Boolean).join(' ')
}

export function SkillsPage() {
  const [data, setData] = useState<SkillTreeData | null>(null)
  const [selectedId, setSelectedId] = useState('artisan_core')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [animating, setAnimating] = useState<Set<string>>(new Set())
  const [animEdges, setAnimEdges] = useState<Set<string>>(new Set())

  // Zoom / pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    skillsApi
      .getSkillTree()
      .then((d) => {
        setData(d)
        setSelectedId('artisan_core')
      })
      .catch(() => setError('Failed to load skill tree.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const byId = useMemo(
    () => Object.fromEntries((data?.nodes ?? []).map((n) => [n.skillId, n])),
    [data],
  )

  const selected = byId[selectedId]

  const branchStats = useMemo(() => {
    const stats: Record<string, { done: number; total: number }> = {}
    for (const n of data?.nodes ?? []) {
      if (n.branch === 'hub') continue
      if (!stats[n.branch]) stats[n.branch] = { done: 0, total: 0 }
      stats[n.branch].total++
      if (n.state === 'allocated') stats[n.branch].done++
    }
    return stats
  }, [data])

  function triggerAnimations(skillId: string) {
    setAnimating(prev => new Set([...prev, skillId]))
    setTimeout(() => setAnimating(prev => { const s = new Set(prev); s.delete(skillId); return s }), 1200)

    const edgeKeys = new Set(
      (data?.edges ?? [])
        .filter(e => e.fromSkillId === skillId || e.toSkillId === skillId)
        .map(e => `${e.fromSkillId}:${e.toSkillId}`)
    )
    setAnimEdges(edgeKeys)
    setTimeout(() => setAnimEdges(new Set()), 800)
  }

  async function handleAllocate() {
    if (!selected || busy) return
    setBusy(true)
    try {
      const res = await skillsApi.allocate(selected.skillId)
      if (res.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                pointsAvailable: res.pointsRemaining,
                pointsSpent: prev.pointsSpent + 1,
                nodes: prev.nodes.map((n) =>
                  n.skillId === selected.skillId
                    ? { ...n, state: 'allocated' as const, refundGold: n.refundGold || 50 }
                    : n,
                ),
              }
            : prev,
        )
        triggerAnimations(selected.skillId)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRefund() {
    if (!selected || busy) return
    setBusy(true)
    try {
      const res = await skillsApi.refund(selected.skillId)
      if (res.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                pointsAvailable: prev.pointsAvailable + 1,
                pointsSpent: prev.pointsSpent - 1,
                nodes: prev.nodes.map((n) =>
                  n.skillId === selected.skillId
                    ? { ...n, state: 'available' as const, refundGold: 0 }
                    : n,
                ),
              }
            : prev,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    setZoom(z => Math.min(Math.max(z * factor, 0.25), 3.5))
  }

  function handleMouseDown(e: React.MouseEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.x) / zoom
    const dy = (e.clientY - dragRef.current.y) / zoom
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy })
  }

  function handleMouseUp() {
    dragRef.current = null
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <>
      <PageHeader
        eyebrow="Workshop · character"
        title="Passive Skill Tree"
        subtitle="Allocate passive skills to gain permanent bonuses. Each node costs 1 skill point. Keystone nodes unlock powerful effects at the end of each branch."
        right={
          <div style={{ textAlign: 'right' }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>
              skill points
            </div>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 22, color: 'var(--ember-1)', lineHeight: 1 }}>
              {data?.pointsAvailable ?? 0}
              <span style={{ fontSize: 13, color: 'var(--ink-2)', marginLeft: 4 }}>
                / {data?.pointsEarned ?? 0}
              </span>
            </div>
          </div>
        }
      />

      {loading && (
        <Panel>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
            Syncing from backend
          </div>
          <div style={{ marginTop: 8, color: 'var(--ink-1)' }}>Loading skill tree…</div>
        </Panel>
      )}

      {!loading && error && (
        <Panel>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--danger-1)' }}>
            Skills unavailable
          </div>
          <div style={{ marginTop: 8, color: 'var(--ink-1)' }}>{error}</div>
          <RpgButton style={{ marginTop: 12 }} onClick={load}>Retry</RpgButton>
        </Panel>
      )}

      {!loading && !error && selected && (
        <>
          {/* Branch bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
            {(['artisan', 'scholar', 'warrior', 'merchant', 'monk'] as const).map((branch) => {
              const s = branchStats[branch] ?? { done: 0, total: 0 }
              return (
                <Panel key={branch} variant="tight">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>{BRANCH_LABELS[branch]}</span>
                    <span className="font-silkscreen uppercase" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
                      {s.done}/{s.total}
                    </span>
                  </div>
                  <div className="rpg-bar">
                    <div style={{ width: s.total > 0 ? `${(s.done / s.total) * 100}%` : '0%', height: '100%', background: BRANCH_COLORS[branch] }} />
                  </div>
                </Panel>
              )
            })}
          </div>

          <div className="rpg-grid-2col rpg-skill-tree-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
            {/* Canvas */}
            <div
              className="rpg-skill-canvas"
              style={{ height: 620 }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className="rpg-skill-canvas-inner"
                style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
              >
                <svg
                  viewBox="0 0 1100 760"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                >
                  {(data?.edges ?? []).map((edge, idx) => {
                    const from = byId[edge.fromSkillId]
                    const to = byId[edge.toSkillId]
                    if (!from || !to) return null
                    const lit = from.state === 'allocated' && (to.state === 'allocated' || to.branch === 'hub')
                    const edgeKey = `${edge.fromSkillId}:${edge.toSkillId}`
                    const isAnimating = animEdges.has(edgeKey)
                    return (
                      <line
                        key={idx}
                        className={lit && isAnimating ? 'rpg-edge--animating' : undefined}
                        x1={from.x} y1={from.y}
                        x2={to.x}   y2={to.y}
                        stroke={lit ? '#b8692a' : '#4a3a2c'}
                        strokeWidth={lit ? 3 : 2}
                        strokeDasharray={lit ? undefined : '4 4'}
                        style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                      />
                    )
                  })}
                </svg>

                {(data?.nodes ?? []).map((node) => {
                  const isSelected = selectedId === node.skillId
                  const base = (node.keystone || node.branch === 'hub') ? 39 : 28
                  return (
                    <div
                      key={node.skillId}
                      role="button"
                      tabIndex={node.state === 'locked' ? -1 : 0}
                      className={nodeClass(node, animating)}
                      style={{
                        left: `${(node.x - base) / 11}%`,
                        top: `${((node.y - base) / 760) * 100}%`,
                        outline: isSelected ? '3px solid #e9b866' : 'none',
                        outlineOffset: 3,
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(node.skillId) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedId(node.skillId)
                      }}
                    >
                      {node.label.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  )
                })}
              </div>

              {/* Legend + zoom controls */}
              <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', zIndex: 20 }}>
                {[
                  { label: 'allocated', color: 'var(--moss-1)' },
                  { label: 'available', color: 'var(--parch-2)' },
                  { label: 'locked', color: '#3a3028' },
                ].map((l) => (
                  <div key={l.label} className="rpg-stat-chip" style={{ background: 'rgba(0,0,0,0.5)', borderColor: l.color }}>
                    <span style={{ width: 10, height: 10, background: l.color, border: '2px solid var(--ink-0)' }} />
                    {l.label}
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 6, zIndex: 20 }}>
                <button
                  className="rpg-stat-chip font-silkscreen"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid var(--ink-0)', cursor: 'pointer', fontSize: 14, padding: '2px 8px', color: 'var(--parch-2)' }}
                  onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(z * 1.2, 3.5)) }}
                >+</button>
                <button
                  className="rpg-stat-chip font-silkscreen"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid var(--ink-0)', cursor: 'pointer', fontSize: 14, padding: '2px 8px', color: 'var(--parch-2)' }}
                  onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(z * 0.85, 0.25)) }}
                >−</button>
                <button
                  className="rpg-stat-chip font-silkscreen"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid var(--ink-0)', cursor: 'pointer', fontSize: 9, padding: '2px 6px', color: 'var(--ink-2)', letterSpacing: '0.05em' }}
                  onClick={(e) => { e.stopPropagation(); resetView() }}
                >reset</button>
              </div>
            </div>

            {/* Detail panel */}
            <Panel style={{ alignSelf: 'start', position: 'sticky', top: 158 }}>
              <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>
                Passive Skill
              </div>
              <h3 className="font-display" style={{ whiteSpace: 'normal', fontSize: 17, margin: '4px 0 8px' }}>
                {selected.label.replace('\n', ' ')}
              </h3>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <Badge variant={selected.state === 'allocated' ? 'moss' : selected.state === 'available' ? 'ember' : 'default'}>
                  {selected.branch === 'hub' ? 'always active' : selected.state}
                </Badge>
                {(selected.keystone || selected.branch === 'hub') && <Badge variant="dark">keystone</Badge>}
              </div>

              <div style={{ color: 'var(--ink-2)', marginBottom: 10, fontSize: 13 }}>
                {selected.description}
              </div>

              <div className="rpg-divider" />

              {selected.effect.label && (
                <>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 6, letterSpacing: '0.1em' }}>
                    Effect
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <Badge variant="ember">{selected.effect.label}</Badge>
                  </div>
                </>
              )}

              {selected.state === 'allocated' && selected.refundGold > 0 && (
                <>
                  <div className="rpg-divider" />
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                    Refund cost · {selected.refundGold} gold
                  </div>
                  <Bar value={100} />
                </>
              )}

              {/* Actions */}
              {selected.branch === 'hub' && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-2)', textAlign: 'center' }}>
                  Starting node · always active
                </div>
              )}
              {selected.branch !== 'hub' && selected.state === 'available' && (
                <RpgButton
                  variant="primary"
                  style={{ width: '100%', marginTop: 12 }}
                  disabled={busy || (data?.pointsAvailable ?? 0) === 0}
                  onClick={handleAllocate}
                >
                  {(data?.pointsAvailable ?? 0) > 0 ? 'Allocate (1 point)' : 'No skill points'}
                </RpgButton>
              )}
              {selected.branch !== 'hub' && selected.state === 'allocated' && (
                <RpgButton
                  variant="ghost"
                  style={{ width: '100%', marginTop: 12 }}
                  disabled={busy}
                  onClick={handleRefund}
                >
                  Refund · {selected.refundGold} gold
                </RpgButton>
              )}
              {selected.state === 'locked' && (
                <RpgButton variant="ghost" style={{ width: '100%', marginTop: 12 }} disabled>
                  Requires prerequisite
                </RpgButton>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
