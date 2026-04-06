import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Hash, UserPlus, UserMinus, Globe, Lock, Calendar } from 'lucide-react'
import { circleApi } from '@/features/Circle/api/circleApi'
import type { Circle } from '@/entities/Circle/model/types'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

const CIRCLE_GRADIENTS = [
  { from: '#6366f1', to: '#8b5cf6' },
  { from: '#06b6d4', to: '#0ea5e9' },
  { from: '#f97316', to: '#f59e0b' },
  { from: '#10b981', to: '#059669' },
  { from: '#ec4899', to: '#f43f5e' },
  { from: '#8b5cf6', to: '#6366f1' },
]

function getCircleGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CIRCLE_GRADIENTS[Math.abs(hash) % CIRCLE_GRADIENTS.length]
}

export function CirclePage() {
  const { circleId } = useParams<{ circleId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [circle, setCircle] = useState<Circle | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!circleId) return
    setLoading(true)
    circleApi.getCircle(circleId)
      .then(setCircle)
      .catch(() => navigate('/community/circles', { replace: true }))
      .finally(() => setLoading(false))
  }, [circleId])

  const handleJoin = async () => {
    if (!circle) return
    setActionLoading(true)
    try {
      await circleApi.joinCircle(circle.id)
      setCircle(c => c ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c)
      toast('Вы вступили в круг', 'success')
    } catch {
      toast('Не удалось вступить', 'error')
    } finally { setActionLoading(false) }
  }

  const handleLeave = async () => {
    if (!circle) return
    setActionLoading(true)
    try {
      await circleApi.leaveCircle(circle.id)
      setCircle(c => c ? { ...c, isJoined: false, memberCount: Math.max(c.memberCount - 1, 0) } : c)
      toast('Вы покинули круг', 'success')
    } catch {
      toast('Не удалось покинуть круг', 'error')
    } finally { setActionLoading(false) }
  }

  if (loading) {
    return (
      <div className="min-h-full">
        <div className="h-14 bg-white dark:bg-[#0f1117] border-b border-[#E7E8E5] dark:border-[#1e3158] animate-pulse" />
        <div className="h-52 bg-gradient-to-br from-[#e2e8f0] to-[#cbd5e1] dark:from-[#1a2540] dark:to-[#161c2d] animate-pulse" />
        <div className="px-4 py-4 flex flex-col gap-3">
          <div className="h-24 bg-[#e2e8f0] dark:bg-[#1e3158] rounded-2xl animate-pulse" />
          <div className="h-32 bg-[#e2e8f0] dark:bg-[#1e3158] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!circle) return null

  const grad = getCircleGradient(circle.name)
  const initials = circle.name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-full flex flex-col">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md border-b border-[#E7E8E5] dark:border-[#1e3158] px-4 h-14 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => navigate('/community/circles')}
          className="flex items-center gap-1.5 text-sm font-medium text-[#666666] dark:text-[#7e93b0] hover:text-[#111111] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Круги
        </button>
        {circle.isJoined ? (
          <Button variant="secondary" size="sm" onClick={handleLeave} loading={actionLoading}>
            <UserMinus className="w-3.5 h-3.5" /> Покинуть
          </Button>
        ) : (
          <Button variant="orange" size="sm" onClick={handleJoin} loading={actionLoading}>
            <UserPlus className="w-3.5 h-3.5" /> Вступить
          </Button>
        )}
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pt-7 pb-8"
        style={{ background: `linear-gradient(135deg, ${grad.from}22, ${grad.to}33)` }}
      >
        {/* Decorative blurred orbs */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ background: grad.to }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-2xl opacity-15"
          style={{ background: grad.from }}
        />

        <div className="relative flex items-center gap-5">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ background: circle.isPublic ? `${grad.from}99` : '#64748b99' }}
              >
                {circle.isPublic
                  ? <><Globe className="w-2.5 h-2.5" /> Публичный</>
                  : <><Lock className="w-2.5 h-2.5" /> Закрытый</>
                }
              </span>
              {circle.isJoined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22c55e]/20 text-[#16a34a] dark:text-[#4ade80]">
                  Участник
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-[#0f172a] dark:text-[#e2e8f3] leading-tight truncate">
              {circle.name}
            </h1>
            <p className="text-sm text-[#475569] dark:text-[#7e93b0] mt-0.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              {circle.memberCount} участников
            </p>
          </div>
        </div>

        {/* Description inline in hero */}
        {circle.description && (
          <p className="relative mt-5 text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed bg-white/50 dark:bg-white/5 rounded-xl px-4 py-3 border border-white/60 dark:border-white/10 backdrop-blur-sm">
            {circle.description}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] px-5 py-4 flex flex-col items-center gap-1">
            <div
              className="text-2xl font-bold"
              style={{ color: grad.from }}
            >
              {circle.memberCount}
            </div>
            <span className="text-xs text-[#94a3b8] flex items-center gap-1">
              <Users className="w-3 h-3" /> Участников
            </span>
          </div>
          <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] px-5 py-4 flex flex-col items-center gap-1">
            <div
              className="text-2xl font-bold"
              style={{ color: grad.to }}
            >
              {circle.tags.length}
            </div>
            <span className="text-xs text-[#94a3b8] flex items-center gap-1">
              <Hash className="w-3 h-3" /> Тегов
            </span>
          </div>
        </div>

        {/* Tags */}
        {circle.tags.length > 0 && (
          <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] px-5 py-4">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Темы</p>
            <div className="flex flex-wrap gap-2">
              {circle.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: `${grad.from}18`,
                    color: grad.from,
                    border: `1px solid ${grad.from}30`,
                  }}
                >
                  <Hash className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer meta */}
        {circle.createdAt && (
          <div className="flex items-center gap-2 px-1 py-1 text-xs text-[#94a3b8]">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            Создан {formatDate(circle.createdAt)}
          </div>
        )}
      </div>
    </div>
  )
}
