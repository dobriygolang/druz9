// ADR-002 — Stylised SVG world atlas. Wraps AtlasSvgCanvas with the
// page header + insight card. Acts as a parallel surface to /map (the
// MapLibre geo view): use /map for "where on Earth?" and /atlas/world
// for "the druz9 universe at a glance".
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Panel, PageHeader, RpgButton, Badge } from '@/shared/ui/pixel'
import { AtlasSvgCanvas } from '@/widgets/Atlas/ui/AtlasSvgCanvas'
import { InsightCard } from '@/features/Insights/ui/InsightCard'

// First-pass clickable regions for the world atlas. Coordinates are
// percentages of the SVG viewBox (1024×1024 in big_map.svg) and were
// hand-picked to rough cluster centres. A future pipeline can extract
// them automatically from <g id="region-*"> nodes.
const ATLAS_REGIONS = [
  { id: 'north_peaks',      xPct: 32, yPct: 24, label: 'Северные вершины' },
  { id: 'capital_market',   xPct: 50, yPct: 50, label: 'Столичный рынок' },
  { id: 'east_archipelago', xPct: 78, yPct: 60, label: 'Восточный архипелаг' },
  { id: 'south_dunes',      xPct: 44, yPct: 80, label: 'Южные дюны' },
  { id: 'west_caverns',     xPct: 18, yPct: 58, label: 'Западные пещеры' },
] as const

type AtlasRegion = typeof ATLAS_REGIONS[number]

export function AtlasWorldPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [region, setRegion] = useState<AtlasRegion | null>(null)

  return (
    <>
      <PageHeader
        eyebrow={t('atlasWorld.eyebrow', { defaultValue: 'Мир · Атлас' })}
        title={t('atlasWorld.title', { defaultValue: 'Атлас мира' })}
        subtitle={t('atlasWorld.subtitle', {
          defaultValue: 'Стилизованная карта вселенной druz9. Тащи и крути колесо, клик по точке — детали региона.',
        })}
        right={
          <RpgButton size="sm" onClick={() => navigate('/map')}>
            {t('atlasWorld.openGeo', { defaultValue: 'геокарта →' })}
          </RpgButton>
        }
      />
      <InsightCard />
      <Panel style={{ padding: 8 }}>
        <AtlasSvgCanvas
          height={720}
          points={ATLAS_REGIONS.map((r) => ({ id: r.id, xPct: r.xPct, yPct: r.yPct, label: r.label }))}
          onPointClick={(id) => setRegion(ATLAS_REGIONS.find((r) => r.id === id) ?? null)}
        />
      </Panel>

      {region && (
        <Panel style={{ marginTop: 14, padding: 14 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 6 }}>
            регион
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <h3 className="font-display" style={{ margin: 0 }}>{region.label}</h3>
            <Badge variant="moss">id: {region.id}</Badge>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', margin: 0 }}>
            Контекст региона подтянется из бека, как только прокинем
            GetRegionContext (ADR-002, hub.proto). Сейчас — заглушка для
            проверки кликов на карте.
          </p>
        </Panel>
      )}
    </>
  )
}
