import { Code2, Target, Swords, Calendar, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

interface NextActionCardProps {
  title: string
  description: string
  actionType: string
  href: string
  className?: string
}

const iconMap: Record<string, React.ReactNode> = {
  practice: <Code2 className="h-4 w-4 text-[#6366F1]" />,
  mock: <Target className="h-4 w-4 text-[#6366F1]" />,
  duel: <Swords className="h-4 w-4 text-[#6366F1]" />,
  daily: <Calendar className="h-4 w-4 text-[#f59e0b]" />,
}

export function NextActionCard({ title, description, actionType, href, className }: NextActionCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex items-center gap-3 rounded-[22px] border-l-4 border-l-[#6366F1] border border-[#e2e8f0] bg-[#F8FAFC] px-4 py-3.5 text-left no-underline transition-all hover:border-[#c7d2fe] hover:bg-[#eef2ff] hover:shadow-[0_4px_16px_rgba(99,102,241,0.08)] dark:border-[#1e3158] dark:border-l-[#6366F1] dark:bg-[#161c2d] dark:hover:bg-[#1a2540]',
        className,
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-[#0f1117]">
        {iconMap[actionType] ?? iconMap.practice}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{title}</p>
        <p className="mt-0.5 text-xs text-[#64748b] dark:text-[#7e93b0] line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#94a3b8] transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
