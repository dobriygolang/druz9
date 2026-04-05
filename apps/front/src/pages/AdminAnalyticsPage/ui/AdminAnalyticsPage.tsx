import { useState } from 'react'
import { BarChart2, Users, Code2, Trophy, TrendingUp, Calendar } from 'lucide-react'

function StatCard({ label, value, icon, change }: { label: string; value: string | number; icon: React.ReactNode; change?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#CBCCC9] p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#F2F3F0] flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-[#0f172a] leading-none">{value}</p>
        <p className="text-xs text-[#666666] mt-0.5">{label}</p>
        {change && <p className="text-xs text-[#22c55e] mt-0.5">{change}</p>}
      </div>
    </div>
  )
}

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('7d')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Analytics</h1>
          <p className="text-sm text-[#666666] mt-0.5">Статистика платформы</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-[#CBCCC9] rounded-lg focus:outline-none"
        >
          <option value="7d">Последние 7 дней</option>
          <option value="30d">Последние 30 дней</option>
          <option value="90d">Последние 90 дней</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Пользователей" value="1,234" icon={<Users className="w-5 h-5 text-[#6366f1]" />} change="+12% за период" />
        <StatCard label="Активных сессий" value="456" icon={<Code2 className="w-5 h-5 text-[#6366F1]" />} change="+8%" />
        <StatCard label="Матчей Arena" value="89" icon={<Trophy className="w-5 h-5 text-[#f59e0b]" />} change="+23%" />
        <StatCard label="Событий" value="14" icon={<Calendar className="w-5 h-5 text-[#22c55e]" />} />
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#CBCCC9] p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6366f1]" /> Активность пользователей
          </h3>
          <div className="flex items-end gap-1 h-32">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{ height: `${h}%`, backgroundColor: '#6366f1', opacity: 0.7 + i * 0.04 }} />
                <span className="text-[9px] text-[#94a3b8]">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#CBCCC9] p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#6366F1]" /> Типы задач
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Coding', value: 65, color: '#6366f1' },
              { label: 'System Design', value: 22, color: '#6366F1' },
              { label: 'Behavioral', value: 13, color: '#22c55e' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#666666]">{item.label}</span>
                  <span className="font-medium text-[#0f172a]">{item.value}%</span>
                </div>
                <div className="h-2 bg-[#F2F3F0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
