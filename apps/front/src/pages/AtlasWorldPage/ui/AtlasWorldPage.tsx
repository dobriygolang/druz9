// ADR-002 — Stylised SVG world atlas. Wraps AtlasSvgCanvas with the
// page header + insight card. Acts as a parallel surface to /map (the
// MapLibre geo view): use /map for "where on Earth?" and /atlas/world
// for "the druz9 universe at a glance".
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Panel, PageHeader, RpgButton, Badge } from '@/shared/ui/pixel'
import { AtlasSvgCanvas } from '@/widgets/Atlas/ui/AtlasSvgCanvas'
import { InsightCard } from '@/features/Insights/ui/InsightCard'
import { Tour } from '@/features/Tour/ui/Tour'
import { regionsApi, type RegionContext } from '@/features/Atlas/api/regionsApi'

// Region coordinates as percentages of the viewBox (1024×1024). Labels
// pull from i18n with a Russian default so missing translations stay
// readable. Backend GetRegionContext returns a localized title that
// overrides this on click — the local label is the canvas tooltip only.
const ATLAS_REGIONS = [
  { id: 'north_peaks',      xPct: 32, yPct: 24, i18nKey: 'atlasWorld.region.north_peaks',      defaultLabel: 'Северные вершины' },
  { id: 'capital_market',   xPct: 50, yPct: 50, i18nKey: 'atlasWorld.region.capital_market',   defaultLabel: 'Столичный рынок' },
  { id: 'east_archipelago', xPct: 78, yPct: 60, i18nKey: 'atlasWorld.region.east_archipelago', defaultLabel: 'Восточный архипелаг' },
  { id: 'south_dunes',      xPct: 44, yPct: 80, i18nKey: 'atlasWorld.region.south_dunes',      defaultLabel: 'Южные дюны' },
  { id: 'west_caverns',     xPct: 18, yPct: 58, i18nKey: 'atlasWorld.region.west_caverns',     defaultLabel: 'Западные пещеры' },
] as const

export function AtlasWorldPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ctx, setCtx] = useState<RegionContext | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) { setCtx(null); return }
    let cancelled = false
    setLoading(true)
    regionsApi
      .get(selectedId)
      .then((c) => { if (!cancelled) setCtx(c) })
      .catch(() => { if (!cancelled) setCtx(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  return (
    <>
      <Tour
        tourId="atlas_intro"
        steps={[
          { selector: '[data-tour=atlas-canvas]', title: 'Атлас мира', body: 'Зажми и тащи — двигаешь карту. Колесо мыши — зум. Точки — кликабельные регионы.' },
          { selector: '[data-tour=atlas-back-to-map]', title: 'Геокарта', body: 'Если нужна реальная география — переключись в /map. SVG-атлас живёт параллельно.' },
        ]}
      />
      <PageHeader
        eyebrow={t('atlasWorld.eyebrow', { defaultValue: 'Мир · Атлас' })}
        title={t('atlasWorld.title', { defaultValue: 'Атлас мира' })}
        subtitle={t('atlasWorld.subtitle', {
          defaultValue: 'Стилизованная карта вселенной druz9. Тащи и крути колесо, клик по точке — детали региона.',
        })}
        right={
          <span data-tour="atlas-back-to-map">
            <RpgButton size="sm" onClick={() => navigate('/map')}>
              {t('atlasWorld.openGeo', { defaultValue: 'геокарта →' })}
            </RpgButton>
          </span>
        }
      />
      <InsightCard />
      <Panel data-tour="atlas-canvas" style={{ padding: 8 }}>
        <AtlasSvgCanvas
          height={720}
          points={ATLAS_REGIONS.map((r) => ({
            id: r.id,
            xPct: r.xPct,
            yPct: r.yPct,
            label: t(r.i18nKey, { defaultValue: r.defaultLabel }),
          }))}
          onPointClick={(id) => setSelectedId(id)}
        />
      </Panel>

      {selectedId && (
        <Panel style={{ marginTop: 14, padding: 14 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 6 }}>
            {t('atlasWorld.region.eyebrow', { defaultValue: 'регион' })}
          </div>
          {loading && <div style={{ color: 'var(--ink-2)' }}>{t('common.loading', { defaultValue: 'Загрузка…' })}</div>}
          {!loading && ctx && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <h3 className="font-display" style={{ margin: 0 }}>{ctx.title}</h3>
                <Badge variant="moss">id: {ctx.regionId}</Badge>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', margin: '0 0 10px' }}>{ctx.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ctx.links.map((l) => (
                  <RpgButton key={l.actionUrl} size="sm" onClick={() => navigate(l.actionUrl)}>
                    {l.label}
                  </RpgButton>
                ))}
              </div>
            </>
          )}
          {!loading && !ctx && (
            <div style={{ color: 'var(--ink-2)' }}>
              {t('atlasWorld.region.unavailable', { defaultValue: 'Контекст временно недоступен.' })}
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
