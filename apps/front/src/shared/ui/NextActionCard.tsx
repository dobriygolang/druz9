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
  practice: <Code2 className="h-4 w-4 text-[#059669]" />,
  mock: <Target className="h-4 w-4 text-[#059669]" />,
  duel: <Swords className="h-4 w-4 text-[#059669]" />,
  daily: <Calendar className="h-4 w-4 text-[#f59e0b]" />,
}

export function NextActionCard({ title, description, actionType, href, className }: NextActionCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex items-center gap-3 rounded-[22px] border-l-4 border-l-[#059669] border border-[#e2e8f0] bg-[#F8FAFC] px-4 py-3.5 text-left no-underline transition-all hover:border-[#A7F3D0] hover:bg-[#ecfdf5] hover:shadow-[0_4px_16px_rgba(5,150,105,0.08)] dark:border-[#1E4035] dark:border-l-[#059669] dark:bg-[#132420] dark:hover:bg-[#163028]',
        className,
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-[#0B1210]">
        {iconMap[actionType] ?? iconMap.practice}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">{title}</p>
        <p className="mt-0.5 text-xs text-[#7A9982] dark:text-[#7BA88A] line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#94a3b8] transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
