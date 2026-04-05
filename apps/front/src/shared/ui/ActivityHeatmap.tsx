import React from 'react'
import { cn } from '../lib/cn'

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

const COLOR_EMPTY = '#E7E8E5'
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
    const day = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    if (count === 0) return `Нет задач · ${day}`
    const suffix =
      count % 10 === 1 && count % 100 !== 11
        ? 'задача'
        : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)
        ? 'задачи'
        : 'задач'
    return `${count} ${suffix} · ${day}`
  } catch {
    return `${count}`
  }
}

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const DAY_LABELS: { label: string; row: number }[] = [
  { label: 'Пн', row: 0 },
  { label: 'Ср', row: 2 },
  { label: 'Пт', row: 4 },
]

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activity, className }) => {
  // Build a date→count lookup
  const lookup = new Map<string, number>()
  for (const a of activity) {
    lookup.set(a.date, a.count)
  }

  // Build the grid: last 364 days, aligned to weeks (Mon–Sun)
  // "today" is the last day we show
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the end of the current week (Sunday) so the last column is complete
  // We show exactly 52 weeks = 364 days ending at today
  const endDate = new Date(today)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (WEEKS * DAYS - 1))

  // Build a flat array of { date, count } for each day from startDate to endDate
  const cells: { date: string; count: number; col: number; row: number }[] = []

  // What day of week is startDate? 0=Sun,1=Mon,...,6=Sat
  // We want Mon=0, Tue=1, ..., Sun=6
  const cur = new Date(startDate)
  // We need to know the first day offset to align columns correctly
  // Column 0 starts at the same day of week as startDate
  let dayIndex = 0
  while (cur <= endDate) {
    const iso = cur.toISOString().slice(0, 10)
    const col = Math.floor(dayIndex / DAYS)
    const row = dayIndex % DAYS
    cells.push({ date: iso, count: lookup.get(iso) ?? 0, col, row })
    cur.setDate(cur.getDate() + 1)
    dayIndex++
  }

  // Detect month labels: for each column, check if the first day of the week starts a new month
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  for (let w = 0; w < WEEKS; w++) {
    const cellsInWeek = cells.filter(c => c.col === w)
    if (cellsInWeek.length === 0) continue
    const firstDay = new Date(cellsInWeek[0].date)
    const month = firstDay.getMonth()
    if (month !== lastMonth) {
      monthLabels.push({ col: w, label: MONTH_NAMES[month] })
      lastMonth = month
    }
  }

  // Total count
  const total = cells.reduce((sum, c) => sum + c.count, 0)
  const totalLabel = (() => {
    const n = total
    const suffix =
      n % 10 === 1 && n % 100 !== 11
        ? 'задача'
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
        ? 'задачи'
        : 'задач'
    return `${n} ${suffix} за последний год`
  })()

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
        {DAY_LABELS.map(({ label, row }) => (
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
