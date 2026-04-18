import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import { trainingApi, type SkillTreeData } from '@/features/Training/api/trainingApi'
import type { SkillNode, ModuleDetail } from '../model/skillTree'

function defaultDetail(node: SkillNode): ModuleDetail {
  return {
    title: `${node.label.replace('\n', ' ')} module`,
    desc:
      node.state === 'locked'
        ? 'Locked. Clear the prior nodes to unlock.'
        : 'A series of tasks and mini-projects on this topic.',
    tasks: 0,
    projects: 2,
    hours: '4–6h',
    rewards: ['+200 ✦', '+40 gold'],
    prereq: [],
    unlocks: [],
  }
}

export function TrainingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<SkillTreeData | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    trainingApi
      .getSkillTree()
      .then((next) => {
        if (cancelled) return
        setData(next)
        setSelectedId(next.selectedNodeId)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load the live skill tree.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const nodes = data?.nodes ?? []
  const edges = data?.edges ?? []
  const branchStats = data?.branchStats ?? []

  const byId = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<string, SkillNode>,
    [nodes],
  )

  const selected = byId[selectedId] ?? nodes[0]
  const detail = selected ? data?.modules[selected.id] ?? defaultDetail(selected) : null

  return (
    <>
      <PageHeader
        eyebrow="Workshop · training grounds"
        title="The Artisan's Skill Tree"
        subtitle="Every branch is a path of mastery. Mastered modules glow moss, the current one burns ember. Keystone nodes unlock system topics."
        right={
          <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
            <RpgButton size="sm">My progress</RpgButton>
            <RpgButton
              size="sm"
              variant="primary"
              disabled={!selected}
              onClick={() => navigate(detail?.actionUrl ?? `/training/task/${selected?.id ?? ''}`)}
            >
              {selected?.state === 'current' ? 'Continue' : 'Practice'} {selected?.id ?? 'module'}
            </RpgButton>
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
            Training unavailable
          </div>
          <div style={{ marginTop: 8, color: 'var(--ink-1)' }}>{error}</div>
          <RpgButton style={{ marginTop: 12 }} onClick={() => window.location.reload()}>
            Retry
          </RpgButton>
        </Panel>
      )}

      {!loading && !error && selected && detail && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {branchStats.map((branch) => (
              <Panel key={branch.name} variant="tight">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>{branch.name}</span>
                  <span
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {branch.done}/{branch.total}
                  </span>
                </div>
                <div className="rpg-bar">
                  <div
                    style={{
                      width: `${branch.total > 0 ? (branch.done / branch.total) * 100 : 0}%`,
                      height: '100%',
                      background: branch.color,
                    }}
                  />
                </div>
              </Panel>
            ))}
          </div>

          <div className="rpg-grid-2col rpg-skill-tree-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
            <div className="rpg-skill-canvas" style={{ height: 620 }}>
              <svg
                viewBox="0 0 1100 760"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                {edges.map(([from, to], index) => {
                  const fromNode = byId[from]
                  const toNode = byId[to]
                  if (!fromNode || !toNode) return null
                  const unlocked =
                    fromNode.state === 'unlocked' && (toNode.state === 'unlocked' || toNode.state === 'current')

                  return (
                    <line
                      key={`${from}-${to}-${index}`}
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={unlocked ? '#b8692a' : '#4a3a2c'}
                      strokeWidth={unlocked ? 3 : 2}
                      strokeDasharray={unlocked ? '' : '4 4'}
                    />
                  )
                })}
              </svg>

              {nodes.map((node) => {
                const isSelected = selectedId === node.id
                const base = node.keystone ? 39 : 28
                return (
                  <div
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    className={`rpg-skill-node rpg-skill-node--${node.state} ${node.keystone ? 'rpg-skill-node--keystone' : ''}`}
                    style={{
                      left: `${(node.x - base) / 11}%`,
                      top: `${((node.y - base) / 760) * 100}%`,
                      outline: isSelected ? '3px solid #e9b866' : 'none',
                      outlineOffset: 3,
                    }}
                    onClick={() => setSelectedId(node.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelectedId(node.id)
                    }}
                  >
                    {node.label.split('\n').map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                )
              })}

              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  bottom: 16,
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { label: 'currently learning', color: 'var(--ember-1)' },
                  { label: 'mastered', color: 'var(--moss-1)' },
                  { label: 'locked', color: '#3a3028' },
                ].map((legend) => (
                  <div
                    key={legend.label}
                    className="rpg-stat-chip"
                    style={{ background: 'rgba(0,0,0,0.5)', borderColor: legend.color }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: legend.color,
                        border: '2px solid var(--ink-0)',
                      }}
                    />
                    {legend.label}
                  </div>
                ))}
              </div>
            </div>

            <Panel style={{ alignSelf: 'start', position: 'sticky', top: 158 }}>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
              >
                Module
              </div>
              <h3
                className="font-display"
                style={{ whiteSpace: 'normal', fontSize: 17, margin: '4px 0 8px' }}
              >
                {detail.title}
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <Badge
                  variant={
                    selected.state === 'unlocked'
                      ? 'moss'
                      : selected.state === 'current'
                        ? 'ember'
                        : 'default'
                  }
                >
                  {selected.state}
                </Badge>
                {selected.keystone && <Badge variant="dark">keystone</Badge>}
              </div>
              <div style={{ color: 'var(--ink-2)', marginBottom: 10, fontSize: 13 }}>{detail.desc}</div>

              <div className="rpg-divider" />
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <DetailStat label="tasks" value={detail.tasks} />
                <DetailStat label="projects" value={detail.projects} />
                <DetailStat label="est time" value={detail.hours} />
              </div>

              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 6, letterSpacing: '0.1em' }}
              >
                Rewards
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {detail.rewards.map((reward, index) => (
                  <Badge key={index} variant="ember">
                    {reward}
                  </Badge>
                ))}
              </div>

              {detail.progressPct !== undefined && (
                <>
                  <div className="rpg-divider" />
                  <div
                    className="font-silkscreen uppercase"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-2)',
                      marginBottom: 6,
                      letterSpacing: '0.1em',
                    }}
                  >
                    Progress
                  </div>
                  <Bar value={detail.progressPct} />
                  <div
                    className="font-silkscreen uppercase"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-2)',
                      marginTop: 6,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {detail.tasksSolved} / {detail.tasks} tasks · {detail.projectsDone} / {detail.projects} projects
                  </div>
                  <RpgButton
                    variant="primary"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => navigate(detail.actionUrl ?? `/training/task/${selected.id}`)}
                  >
                    Resume task
                  </RpgButton>
                </>
              )}
              {selected.state === 'locked' && (
                <RpgButton variant="ghost" style={{ width: '100%', marginTop: 12 }} disabled>
                  Requires prior nodes
                </RpgButton>
              )}
              {selected.state === 'unlocked' && detail.progressPct === undefined && (
                <RpgButton
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={() => navigate(detail.actionUrl ?? `/training/task/${selected.id}`)}
                >
                  Review · practice again
                </RpgButton>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  )
}

function DetailStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div
        className="font-silkscreen uppercase"
        style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
      >
        {label}
      </div>
      <div
        style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 18, color: 'var(--ink-0)' }}
      >
        {value}
      </div>
    </div>
  )
}
