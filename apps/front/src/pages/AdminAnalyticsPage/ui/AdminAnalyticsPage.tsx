import { useEffect, useState } from 'react'
import { BarChart2, Code2, Layers, CheckCircle, RefreshCw } from 'lucide-react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { getCategoryFromTopics, CATEGORY_LABELS } from '@/features/Admin/model/taskCategories'

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#132420] rounded-xl border border-[#C1CFC4] dark:border-[#1E4035] p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#F0F5F1] dark:bg-[#162E24] flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-[#0B1210] leading-none">{value}</p>
        <p className="text-xs text-[#4B6B52] mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#4B6B52]">{label}</span>
        <span className="font-medium text-[#0B1210]">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-[#F0F5F1] dark:bg-[#162E24] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

interface Stats {
  total: number
  active: number
  easy: number
  medium: number
  hard: number
  mock: number
  solo: number
  uncategorized: number
  languages: Record<string, number>
}

const LANG_LABELS: Record<string, string> = {
  PROGRAMMING_LANGUAGE_PYTHON: 'Python', PROGRAMMING_LANGUAGE_JAVASCRIPT: 'JavaScript',
  PROGRAMMING_LANGUAGE_TYPESCRIPT: 'TypeScript', PROGRAMMING_LANGUAGE_GO: 'Go',
  PROGRAMMING_LANGUAGE_RUST: 'Rust', PROGRAMMING_LANGUAGE_CPP: 'C++',
  PROGRAMMING_LANGUAGE_JAVA: 'Java', PROGRAMMING_LANGUAGE_SQL: 'SQL',
}
const LANG_COLORS: Record<string, string> = {
  PROGRAMMING_LANGUAGE_PYTHON: '#3572A5', PROGRAMMING_LANGUAGE_JAVASCRIPT: '#f1e05a',
  PROGRAMMING_LANGUAGE_TYPESCRIPT: '#3178c6', PROGRAMMING_LANGUAGE_GO: '#00ADD8',
  PROGRAMMING_LANGUAGE_RUST: '#dea584', PROGRAMMING_LANGUAGE_CPP: '#f34b7d',
  PROGRAMMING_LANGUAGE_JAVA: '#b07219', PROGRAMMING_LANGUAGE_SQL: '#e38c00',
}

export function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.listCodeTasks({ includeInactive: true })
      .then((tasks: any[]) => {
        const languages: Record<string, number> = {}
        let mock = 0, solo = 0, uncategorized = 0
        let easy = 0, medium = 0, hard = 0, active = 0

        for (const t of tasks) {
          if (t.isActive !== false) active++
          const cat = getCategoryFromTopics(t.topics)
          if (cat === 'mock') mock++
          else if (cat === 'solo_practice') solo++
          else uncategorized++

          if (t.difficulty === 'TASK_DIFFICULTY_EASY') easy++
          else if (t.difficulty === 'TASK_DIFFICULTY_MEDIUM') medium++
          else if (t.difficulty === 'TASK_DIFFICULTY_HARD') hard++

          if (t.language) languages[t.language] = (languages[t.language] ?? 0) + 1
        }
        setStats({ total: tasks.length, active, easy, medium, hard, mock, solo, uncategorized, languages })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-[#94a3b8] animate-spin" />
      </div>
    )
  }

  const s = stats ?? { total: 0, active: 0, easy: 0, medium: 0, hard: 0, mock: 0, solo: 0, uncategorized: 0, languages: {} }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#0B1210]">Analytics</h1>
        <p className="text-sm text-[#4B6B52] mt-0.5">Platform task statistics</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total tasks" value={s.total} icon={<Code2 className="w-5 h-5 text-[#059669]" />} />
        <StatCard label="Active" value={s.active} icon={<CheckCircle className="w-5 h-5 text-[#22c55e]" />} />
        <StatCard label="Mock Interview" value={s.mock} icon={<Layers className="w-5 h-5 text-[#34D399]" />} />
        <StatCard label="Solo Practice" value={s.solo} icon={<Layers className="w-5 h-5 text-[#f59e0b]" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-[#132420] rounded-xl border border-[#C1CFC4] dark:border-[#1E4035] p-5">
          <h3 className="text-sm font-semibold text-[#0B1210] mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#059669]" /> Difficulty
          </h3>
          <div className="flex flex-col gap-3">
            <ProgressBar label="Easy" value={s.easy} total={s.total} color="#22c55e" />
            <ProgressBar label="Medium" value={s.medium} total={s.total} color="#f59e0b" />
            <ProgressBar label="Hard" value={s.hard} total={s.total} color="#ef4444" />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white dark:bg-[#132420] rounded-xl border border-[#C1CFC4] dark:border-[#1E4035] p-5">
          <h3 className="text-sm font-semibold text-[#0B1210] mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#059669]" /> Categories
          </h3>
          <div className="flex flex-col gap-3">
            <ProgressBar label={CATEGORY_LABELS.mock ?? 'Mock'} value={s.mock} total={s.total} color="#059669" />
            <ProgressBar label={CATEGORY_LABELS.solo_practice ?? 'Solo'} value={s.solo} total={s.total} color="#f59e0b" />
            <ProgressBar label="No category" value={s.uncategorized} total={s.total} color="#94a3b8" />
          </div>
        </div>

        {/* Languages Distribution */}
        <div className="bg-white dark:bg-[#132420] rounded-xl border border-[#C1CFC4] dark:border-[#1E4035] p-5">
          <h3 className="text-sm font-semibold text-[#0B1210] mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#059669]" /> Languages
          </h3>
          <div className="flex flex-col gap-3">
            {Object.entries(s.languages)
              .sort((a, b) => b[1] - a[1])
              .map(([lang, count]) => (
                <ProgressBar
                  key={lang}
                  label={LANG_LABELS[lang] ?? lang}
                  value={count}
                  total={s.total}
                  color={LANG_COLORS[lang] ?? '#94a3b8'}
                />
              ))}
            {Object.keys(s.languages).length === 0 && (
              <p className="text-xs text-[#94a3b8] italic">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
