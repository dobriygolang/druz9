import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import { i18n } from '@/shared/i18n'

interface ActivityHeatmapProps {
  activity: { date: string; count: number }[]
  className?: string
}

const WEEKS = 52
const DAYS = 7
const CELL_SIZE = 10
const CELL_GAP = 2
const CELL_STEP = CELL_SIZE + CELL_GAP
const MONTH_LABEL_HEIGHT = 20
const DAY_LABEL_WIDTH = 30

const COLOR_EMPTY = '#E4EBE5'
const COLORS = [
  { min: 0, max: 0, color: COLOR_EMPTY },
  { min: 1, max: 2, color: '#d4e8b0' },
  { min: 3, max: 5, color: '#8bc34a' },
  { min: 6, max: 9, color: '#4caf50' },
  { min: 10, max: Infinity, color: '#2e7d32' },
]

function getColor(count: number): string {
  for (const c of COLORS) {
    if (count >= c.min && count <= c.max) return c.color
  }
  return COLOR_EMPTY
}

function formatTooltip(dateStr: string, count: number): string {
  try {
    const d = new Date(dateStr)
    const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'ru-RU'
    const day = d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    const suffix = i18n.resolvedLanguage?.startsWith('en')
      ? (count === 1 ? 'task' : 'tasks')
      : (count % 10 === 1 && count % 100 !== 11 ? 'задача' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'задачи' : 'задач')
    if (count === 0) return i18n.resolvedLanguage?.startsWith('en') ? `No tasks · ${day}` : `Нет задач · ${day}`
    return `${count} ${suffix} · ${day}`
  } catch {
    return `${count}`
  }
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activity, className }) => {
  const { t } = useTranslation()
  const { cells, monthLabels, totalLabel } = useMemo(() => {
    const lookup = new Map<string, number>()
    for (const a of activity) lookup.set(a.date, a.count)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (WEEKS * DAYS - 1))

    const cells: { date: string; count: number; col: number; row: number }[] = []
    const cur = new Date(startDate)
    let dayIndex = 0
    while (cur <= endDate) {
      const iso = cur.toISOString().slice(0, 10)
      const col = Math.floor(dayIndex / DAYS)
      const row = dayIndex % DAYS
      cells.push({ date: iso, count: lookup.get(iso) ?? 0, col, row })
      cur.setDate(cur.getDate() + 1)
      dayIndex++
    }

    // Month labels — single pass using column-indexed first cell instead of filter per week
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    for (const cell of cells) {
      if (cell.row !== 0) continue // only check first day of each week column
      const month = new Date(cell.date).getMonth()
      if (month !== lastMonth) {
        monthLabels.push({ col: cell.col, label: new Date(cell.date).toLocaleDateString(i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'ru-RU', { month: 'short' }) })
        lastMonth = month
      }
    }

    const total = cells.reduce((sum, c) => sum + c.count, 0)
    const suffix = i18n.resolvedLanguage?.startsWith('en')
      ? (total === 1 ? 'task' : 'tasks')
      : (total % 10 === 1 && total % 100 !== 11 ? 'задача' : total % 10 >= 2 && total % 10 <= 4 && (total % 100 < 10 || total % 100 >= 20) ? 'задачи' : 'задач')

    return { cells, monthLabels, totalLabel: i18n.resolvedLanguage?.startsWith('en') ? `${total} ${suffix} in the last year` : `${total} ${suffix} за последний год` }
  }, [activity, t])

  const dayLabels = [
    { label: t('heatmap.mon'), row: 0 },
    { label: t('heatmap.wed'), row: 2 },
    { label: t('heatmap.fri'), row: 4 },
  ]

  const svgWidth = DAY_LABEL_WIDTH + WEEKS * CELL_STEP - CELL_GAP
  const svgHeight = MONTH_LABEL_HEIGHT + DAYS * CELL_STEP - CELL_GAP

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ display: 'block' }}
      >
        {/* Month labels */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={`month-${col}`}
            x={DAY_LABEL_WIDTH + col * CELL_STEP}
            y={12}
            style={{ fontSize: '9px', fill: '#666666', fontFamily: 'inherit' }}
          >
            {label}
          </text>
        ))}

        {/* Day labels */}
        {dayLabels.map(({ label, row }) => (
          <text
            key={`day-${row}`}
            x={0}
            y={MONTH_LABEL_HEIGHT + row * CELL_STEP + CELL_SIZE / 2 + 3}
            style={{ fontSize: '9px', fill: '#94a3b8', fontFamily: 'inherit' }}
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {cells.map(({ date, count, col, row }) => (
          <rect
            key={date}
            x={DAY_LABEL_WIDTH + col * CELL_STEP}
            y={MONTH_LABEL_HEIGHT + row * CELL_STEP}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            ry={2}
            fill={getColor(count)}
          >
            <title>{formatTooltip(date, count)}</title>
          </rect>
        ))}
      </svg>
      <p className="text-xs text-[#94a3b8] mt-2">{totalLabel}</p>
    </div>
  )
}
