import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Hash, UserPlus, UserMinus, Globe, Calendar } from 'lucide-react'
import { circleApi } from '@/features/Circle/api/circleApi'
import type { Circle } from '@/entities/Circle/model/types'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

// Deterministic gradient from circle name
function getCircleGradient(name: string) {
  const gradients = [
    'from-[#6366F1] to-[#8b5cf6]',
    'from-[#06b6d4] to-[#0ea5e9]',
    'from-[#f97316] to-[#f59e0b]',
    'from-[#10b981] to-[#059669]',
    'from-[#ec4899] to-[#f43f5e]',
    'from-[#8b5cf6] to-[#6366F1]',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
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
        <div className="h-56 bg-gradient-to-br from-[#e2e8f0] to-[#cbd5e1] animate-pulse" />
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="h-7 w-48 bg-[#e2e8f0] rounded-lg animate-pulse" />
          <div className="h-4 w-full bg-[#e2e8f0] rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-[#e2e8f0] rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!circle) return null

  const gradient = getCircleGradient(circle.name)
  const initials = circle.name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-full flex flex-col">
      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${gradient} pt-4 pb-10 px-6`}>
        <button
          onClick={() => navigate('/community/circles')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-end gap-5">
          {/* Circle avatar */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {circle.isPublic && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-medium text-white">
                  <Globe className="w-2.5 h-2.5" /> Публичный
                </span>
              )}
              {circle.isJoined && (
                <span className="px-2 py-0.5 bg-[#22c55e]/30 rounded-full text-[10px] font-semibold text-[#86efac]">
                  Участник
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-1 leading-tight">{circle.name}</h1>
            <p className="text-sm text-white/70 mt-0.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {circle.memberCount} участников
            </p>
          </div>
        </div>
      </div>

      {/* Content card that overlaps hero */}
      <div className="flex-1 px-4 -mt-4">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          {/* Action */}
          <div className="px-5 py-4 border-b border-[#f1f5f9]">
            {circle.isJoined ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                onClick={handleLeave}
                loading={actionLoading}
              >
                <UserMinus className="w-4 h-4" /> Покинуть круг
              </Button>
            ) : (
              <Button
                variant="orange"
                size="sm"
                className="w-full justify-center"
                onClick={handleJoin}
                loading={actionLoading}
              >
                <UserPlus className="w-4 h-4" /> Вступить в круг
              </Button>
            )}
          </div>

          {/* Description */}
          {circle.description && (
            <div className="px-5 py-4 border-b border-[#f1f5f9]">
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">О круге</p>
              <p className="text-sm text-[#475569] leading-relaxed">{circle.description}</p>
            </div>
          )}

          {/* Tags */}
          {circle.tags.length > 0 && (
            <div className="px-5 py-4 border-b border-[#f1f5f9]">
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Темы</p>
              <div className="flex flex-wrap gap-2">
                {circle.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#f0f0ff] rounded-full text-xs font-medium text-[#6366F1]"
                  >
                    <Hash className="w-3 h-3" />{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 divide-x divide-[#f1f5f9]">
            <div className="px-5 py-4 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-[#111111]">{circle.memberCount}</span>
              <span className="text-xs text-[#94a3b8] flex items-center gap-1"><Users className="w-3 h-3" /> Участников</span>
            </div>
            <div className="px-5 py-4 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-[#111111]">{circle.tags.length}</span>
              <span className="text-xs text-[#94a3b8] flex items-center gap-1"><Hash className="w-3 h-3" /> Тегов</span>
            </div>
          </div>

          {/* Created at */}
          {circle.createdAt && (
            <div className="px-5 py-3 border-t border-[#f1f5f9] flex items-center gap-2 text-xs text-[#94a3b8]">
              <Calendar className="w-3.5 h-3.5" />
              Создан {formatDate(circle.createdAt)}
            </div>
          )}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}
