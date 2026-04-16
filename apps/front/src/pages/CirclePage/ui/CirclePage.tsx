import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Hash, UserPlus, UserMinus, Globe, Lock, Calendar, Play, Share2, Check, Plus, ExternalLink, RefreshCw, Trash2, Zap, Trophy, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { circleApi, type CircleMember } from '@/features/Circle/api/circleApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import { eventApi, type Event, type EventRepeat } from '@/features/Event/api/eventApi'
import type { Circle, CirclePulse, CircleChallenge, CircleMemberStats } from '@/entities/Circle/model/types'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { useToast } from '@/shared/ui/Toast'
import { getCircleGradient } from '@/shared/lib/circleGradient'
import { PageMeta } from '@/shared/ui/PageMeta'

type Tab = 'pulse' | 'members' | 'challenge' | 'events'

const CHALLENGE_TEMPLATES = [
  { key: 'daily_completion', defaultTarget: 5 },
  { key: 'streak_days', defaultTarget: 5 },
  { key: 'duels_count', defaultTarget: 3 },
  { key: 'mocks_count', defaultTarget: 2 },
] as const

export function CirclePage() {
  const { t } = useTranslation()
  const { circleId } = useParams<{ circleId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [circle, setCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<CircleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('pulse')
  const [copied, setCopied] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventForm, setEventForm] = useState<{ title: string; description: string; meetingLink: string; scheduledAt: string; repeat: EventRepeat }>({
    title: '', description: '', meetingLink: '', scheduledAt: '', repeat: 'none',
  })
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Pulse state
  const [pulse, setPulse] = useState<CirclePulse | null>(null)
  const [pulseLoading, setPulseLoading] = useState(false)

  // Member stats state
  const [memberStats, setMemberStats] = useState<CircleMemberStats[]>([])
  const [memberStatsLoading, setMemberStatsLoading] = useState(false)

  // Challenge state
  const [challenge, setChallenge] = useState<CircleChallenge | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [showCreateChallenge, setShowCreateChallenge] = useState(false)
  const [challengeForm, setChallengeForm] = useState({ templateKey: 'daily_completion', targetValue: 5 })
  const [creatingChallenge, setCreatingChallenge] = useState(false)

  useEffect(() => {
    if (!circleId) return
    setLoading(true)
    circleApi.getCircle(circleId)
      .then(setCircle)
      .catch(() => navigate('/community/circles', { replace: true }))
      .finally(() => setLoading(false))
  }, [circleId])

  const membersLoadingRef = useRef(false)
  const loadMembers = useCallback(() => {
    if (!circleId || membersLoadingRef.current) return
    membersLoadingRef.current = true
    setMembersLoading(true)
    circleApi.listMembers(circleId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => { membersLoadingRef.current = false; setMembersLoading(false) })
  }, [circleId])

  const loadEvents = useCallback(() => {
    if (!circleId) return
    setEventsLoading(true)
    eventApi.listCircleEvents(circleId)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }, [circleId])

  const pulseLoadingRef = useRef(false)
  const loadPulse = useCallback(() => {
    if (!circleId || pulseLoadingRef.current) return
    pulseLoadingRef.current = true
    setPulseLoading(true)
    circleApi.getCirclePulse(circleId)
      .then(setPulse)
      .catch(() => {})
      .finally(() => { pulseLoadingRef.current = false; setPulseLoading(false) })
  }, [circleId])

  const memberStatsLoadingRef = useRef(false)
  const loadMemberStats = useCallback(() => {
    if (!circleId || memberStatsLoadingRef.current) return
    memberStatsLoadingRef.current = true
    setMemberStatsLoading(true)
    circleApi.getCircleMemberStats(circleId)
      .then(setMemberStats)
      .catch(() => {})
      .finally(() => { memberStatsLoadingRef.current = false; setMemberStatsLoading(false) })
  }, [circleId])

  const challengeLoadingRef = useRef(false)
  const loadChallenge = useCallback(() => {
    if (!circleId || challengeLoadingRef.current) return
    challengeLoadingRef.current = true
    setChallengeLoading(true)
    circleApi.getActiveChallenge(circleId)
      .then(setChallenge)
      .catch(() => {})
      .finally(() => { challengeLoadingRef.current = false; setChallengeLoading(false) })
  }, [circleId])

  useEffect(() => {
    if (activeTab === 'pulse') loadPulse()
    if (activeTab === 'members') { loadMembers(); loadMemberStats() }
    if (activeTab === 'events') loadEvents()
    if (activeTab === 'challenge') loadChallenge()
  }, [activeTab, loadPulse, loadMembers, loadMemberStats, loadEvents, loadChallenge])

  const handleCreateEvent = async () => {
    if (!circleId || !eventForm.title) return
    setCreatingEvent(true)
    try {
      const created = await eventApi.createCircleEvent(circleId, eventForm)
      setEvents(prev => [created, ...prev])
      setShowCreateEvent(false)
      setEventForm({ title: '', description: '', meetingLink: '', scheduledAt: '', repeat: 'none' })
      toast(t('circle.eventCreated'), 'success')
    } catch {
      toast(t('circle.eventCreateFailed'), 'error')
    } finally { setCreatingEvent(false) }
  }

  const handleJoin = async () => {
    if (!circle) return
    setActionLoading(true)
    try {
      await circleApi.joinCircle(circle.id)
      setCircle(c => c ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c)
      toast(t('circle.joined'), 'success')
      if (activeTab === 'members') loadMembers()
    } catch {
      toast(t('circle.joinFailed'), 'error')
    } finally { setActionLoading(false) }
  }

  const handleLeave = async () => {
    if (!circle) return
    setActionLoading(true)
    try {
      await circleApi.leaveCircle(circle.id)
      setCircle(c => c ? { ...c, isJoined: false, memberCount: Math.max(c.memberCount - 1, 0) } : c)
      toast(t('circle.left'), 'success')
    } catch {
      toast(t('circle.leaveFailed'), 'error')
    } finally { setActionLoading(false) }
  }

  const handleStartPractice = async () => {
    if (!circle) return
    setPracticeLoading(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL', name: circle.name })
      const inviteUrl = `${window.location.origin}/code-rooms/${room.id}`
      await navigator.clipboard.writeText(inviteUrl)
      toast(t('circle.practiceCreated'), 'success')
      navigate(`/code-rooms/${room.id}`)
    } catch {
      toast(t('circle.practiceCreateFailed'), 'error')
    } finally { setPracticeLoading(false) }
  }

  const handleInvite = async () => {
    if (!circleId || !inviteUserId.trim()) return
    setInviting(true)
    try {
      await circleApi.inviteMember(circleId, inviteUserId.trim())
      toast(t('circle.invited'), 'success')
      setShowInvite(false)
      setInviteUserId('')
      loadMembers()
    } catch {
      toast(t('circle.inviteFailed'), 'error')
    } finally { setInviting(false) }
  }

  const handleDelete = async () => {
    if (!circleId) return
    setDeleting(true)
    try {
      await circleApi.deleteCircle(circleId)
      toast(t('circle.deleted'), 'success')
      navigate('/community/circles', { replace: true })
    } catch {
      toast(t('circle.deleteFailed'), 'error')
    } finally { setDeleting(false) }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/community/circles/${circleId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast(t('circle.linkCopied'), 'success')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCreateChallenge = async () => {
    if (!circleId) return
    setCreatingChallenge(true)
    try {
      const created = await circleApi.createChallenge(circleId, challengeForm.templateKey, challengeForm.targetValue)
      setChallenge(created)
      setShowCreateChallenge(false)
      toast(t('circle.challenge.created'), 'success')
    } catch {
      toast(t('circle.challenge.createFailed'), 'error')
    } finally { setCreatingChallenge(false) }
  }

  if (loading) {
    return (
      <div className="min-h-full">
        <div className="h-14 bg-white dark:bg-[#0B1210] border-b border-[#E4EBE5] dark:border-[#1E4035] animate-pulse" />
        <div className="h-52 bg-gradient-to-br from-[#e2e8f0] to-[#C1D9CA] dark:from-[#163028] dark:to-[#161c2d] animate-pulse" />
        <div className="px-4 py-4 flex flex-col gap-3">
          <div className="h-24 bg-[#e2e8f0] dark:bg-[#1E4035] rounded-2xl animate-pulse" />
          <div className="h-32 bg-[#e2e8f0] dark:bg-[#1E4035] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!circle) return null

  const grad = getCircleGradient(circle.name)
  const initials = circle.name.slice(0, 2).toUpperCase()
  const isCreator = user && circle.creatorId === user.id

  return (
    <div className="min-h-full flex flex-col">
      <PageMeta
        title={circle.name}
        description={circle.description || t('circle.meta.description')}
        canonicalPath={circleId ? `/community/circles/${circleId}` : '/community/circles'}
      />
      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0B1210]/80 backdrop-blur-md border-b border-[#E4EBE5] dark:border-[#1E4035] px-4 h-14 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => navigate('/community/circles')}
          className="flex items-center gap-1.5 text-sm font-medium text-[#4B6B52] dark:text-[#7BA88A] hover:text-[#111111] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('circles.title')}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F5F1] dark:hover:bg-[#1E4035] text-[#4B6B52] dark:text-[#7BA88A] transition-colors"
            title={t('circle.share')}
          >
            {copied ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Share2 className="w-4 h-4" />}
          </button>
          {isCreator && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#94a3b8] hover:text-red-500 transition-colors"
              title={t('circle.deleteTitle')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {circle.isJoined ? (
            <Button variant="secondary" size="sm" onClick={handleLeave} loading={actionLoading}>
              <UserMinus className="w-3.5 h-3.5" /> {t('circle.leave')}
            </Button>
          ) : (
            <Button variant="orange" size="sm" onClick={handleJoin} loading={actionLoading}>
              <UserPlus className="w-3.5 h-3.5" /> {t('circle.join')}
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pt-7 pb-8"
        style={{ background: `linear-gradient(135deg, ${grad.from}22, ${grad.to}33)` }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: grad.to }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-2xl opacity-15" style={{ background: grad.from }} />

        <div className="relative flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ background: circle.isPublic ? `${grad.from}99` : '#64748b99' }}
              >
                {circle.isPublic
                  ? <><Globe className="w-2.5 h-2.5" /> {t('circle.public')}</>
                  : <><Lock className="w-2.5 h-2.5" /> {t('circle.private')}</>
                }
              </span>
              {circle.isJoined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22c55e]/20 text-[#16a34a] dark:text-[#4ade80]">
                  {t('circle.member')}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-[#0B1210] dark:text-[#E2F0E8] leading-tight truncate">{circle.name}</h1>
            <p className="text-sm text-[#4B6B52] dark:text-[#7BA88A] mt-0.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              {t('circle.membersCount', { count: circle.memberCount })}
            </p>
          </div>
        </div>

        {circle.description && (
          <p className="relative mt-5 text-sm text-[#1E4035] dark:text-[#94a3b8] leading-relaxed bg-white/50 dark:bg-white/5 rounded-xl px-4 py-3 border border-white/60 dark:border-white/10 backdrop-blur-sm">
            {circle.description}
          </p>
        )}

        {/* Tags */}
        {circle.tags.length > 0 && (
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {circle.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: `${grad.from}18`, color: grad.from, border: `1px solid ${grad.from}30` }}
              >
                <Hash className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Start practice CTA */}
        <div className="relative mt-4">
          <Button
            variant="orange"
            size="sm"
            onClick={handleStartPractice}
            loading={practiceLoading}
            className="shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            {t('circle.startPractice')}
          </Button>
          <p className="text-[11px] text-[#7A9982] dark:text-[#4A7058] mt-1.5">
            {t('circle.startPracticeHint')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-1 bg-transparent flex-wrap">
        {([
          { id: 'pulse' as Tab, label: t('circle.tabs.pulse'), icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'members' as Tab, label: `${t('circle.tabs.members')} · ${circle.memberCount}`, icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'challenge' as Tab, label: t('circle.tabs.challenge'), icon: <Target className="w-3.5 h-3.5" /> },
          { id: 'events' as Tab, label: `${t('circle.tabs.events')}${events.length > 0 ? ` · ${events.length}` : ''}`, icon: <Calendar className="w-3.5 h-3.5" /> },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#132420] text-[#111111] dark:text-[#E2F0E8] shadow-sm border border-[#E4EBE5] dark:border-[#1E4035]'
                : 'text-[#4B6B52] dark:text-[#7BA88A] hover:text-[#111111] dark:hover:text-[#e2e8f3]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">

        {/* ===== PULSE TAB ===== */}
        {activeTab === 'pulse' && (
          <>
            {pulseLoading ? (
              <>
                <div className="h-20 bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] animate-pulse" />
                <div className="h-40 bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] animate-pulse" />
              </>
            ) : pulse ? (
              <>
                {/* Active today */}
                <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">{t('circle.pulse.activeToday')}</p>
                      <p className="text-2xl font-bold text-[#111111] dark:text-[#E2F0E8] mt-1">
                        {pulse.activeToday}<span className="text-sm font-normal text-[#94a3b8]">/{pulse.totalMembers}</span>
                      </p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${grad.from}18` }}
                    >
                      <Zap className="w-6 h-6" style={{ color: grad.from }} />
                    </div>
                  </div>
                </div>

                {/* Week activity bars */}
                {pulse.weekActivity.length > 0 && (
                  <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-4">
                    <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">{t('circle.pulse.weekActivity')}</p>
                    <div className="flex flex-col gap-2">
                      {pulse.weekActivity.map(day => {
                        const total = day.dailyCount + day.duelCount + day.mockCount
                        const maxBar = Math.max(...pulse.weekActivity.map(d => d.dailyCount + d.duelCount + d.mockCount), 1)
                        const pct = Math.round((total / maxBar) * 100)
                        const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })
                        return (
                          <div key={day.date} className="flex items-center gap-3">
                            <span className="text-xs text-[#94a3b8] w-10 text-right flex-shrink-0">{dayLabel}</span>
                            <div className="flex-1 h-5 bg-[#f1f5f9] dark:bg-[#162E24] rounded-full overflow-hidden relative">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${grad.from}, ${grad.to})`, minWidth: total > 0 ? '8px' : '0' }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[#4B6B52] dark:text-[#7BA88A] w-6 text-right flex-shrink-0">{total}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-[#94a3b8]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#059669]" />{t('circle.pulse.daily')}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" />{t('circle.pulse.duels')}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" />{t('circle.pulse.mocks')}</span>
                    </div>
                  </div>
                )}

                {/* Recent actions */}
                {pulse.recentActions.length > 0 && (
                  <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] overflow-hidden">
                    <div className="px-5 pt-4 pb-2">
                      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">{t('circle.pulse.recentActions')}</p>
                    </div>
                    <div className="divide-y divide-[#F0F5F1] dark:divide-[#1E4035]">
                      {pulse.recentActions.map((action, idx) => {
                        const name = [action.firstName, action.lastName].filter(Boolean).join(' ') || t('circle.memberFallback')
                        const actionColor = action.actionType === 'daily' ? '#059669' : action.actionType === 'duel' ? '#f59e0b' : '#22c55e'
                        return (
                          <div key={idx} className="flex items-center gap-3 px-5 py-2.5">
                            <Avatar name={name} src={action.avatarUrl || undefined} size="xs" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#111111] dark:text-[#E2F0E8] truncate">
                                <span className="font-medium">{name}</span>
                                {' '}
                                <span className="text-[#4B6B52] dark:text-[#7BA88A]">
                                  {t(`circle.pulse.action.${action.actionType}`, { detail: action.actionDetail })}
                                </span>
                              </p>
                            </div>
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: actionColor }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty pulse state */}
                {pulse.recentActions.length === 0 && pulse.weekActivity.every(d => d.dailyCount + d.duelCount + d.mockCount === 0) && (
                  <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-10 text-center">
                    <Zap className="w-8 h-8 text-[#C1CFC4] mx-auto mb-3" />
                    <p className="text-sm text-[#94a3b8]">{t('circle.pulse.empty')}</p>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {/* ===== MEMBERS TAB ===== */}
        {activeTab === 'members' && (
          <>
            {circle.isJoined && !circle.isPublic && (
              <div className="flex justify-end">
                <Button variant="orange" size="sm" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-3.5 h-3.5" /> {t('circle.invite')}
                </Button>
              </div>
            )}

            {/* Stats table */}
            {memberStatsLoading ? (
              <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] overflow-hidden">
                <div className="divide-y divide-[#F0F5F1] dark:divide-[#1E4035]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-[#e2e8f0] dark:bg-[#1E4035]" />
                      <div className="flex-1">
                        <div className="h-3 w-32 bg-[#e2e8f0] dark:bg-[#1E4035] rounded mb-1.5" />
                        <div className="h-2.5 w-48 bg-[#e2e8f0] dark:bg-[#1E4035] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : memberStats.length > 0 ? (
              <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] overflow-hidden">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_70px_70px_70px_70px] gap-2 px-5 py-2.5 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider border-b border-[#F2F3F0] dark:border-[#1E4035]">
                  <span>{t('circle.stats.name')}</span>
                  <span className="text-center">{t('circle.stats.rating', 'Rating')}</span>
                  <span className="text-center">{t('circle.stats.daily')}</span>
                  <span className="text-center">{t('circle.stats.duels')}</span>
                  <span className="text-center">{t('circle.stats.mocks')}</span>
                  <span className="text-center">{t('circle.stats.role')}</span>
                </div>
                <div className="divide-y divide-[#F0F5F1] dark:divide-[#1E4035]">
                  {memberStats.map(s => {
                    const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || t('circle.memberFallback')
                    return (
                      <button
                        key={s.userId}
                        onClick={() => navigate(`/profile/${s.userId}`)}
                        className="w-full flex items-center sm:grid sm:grid-cols-[1fr_80px_70px_70px_70px_70px] gap-2 px-5 py-3 hover:bg-[#F0F5F1] dark:hover:bg-[#162E24] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={name} src={s.avatarUrl || undefined} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#111111] dark:text-[#E2F0E8] truncate">{name}</p>
                            {s.role === 'creator' && (
                              <p className="text-[11px] text-[#059669]">{t('circle.creator')}</p>
                            )}
                          </div>
                        </div>
                        {/* Mobile: inline stats */}
                        <div className="flex items-center gap-3 sm:contents text-xs text-[#4B6B52] dark:text-[#7BA88A] ml-auto sm:ml-0">
                          <span className="sm:text-center sm:text-sm sm:font-medium sm:text-[#111111] sm:dark:text-[#E2F0E8]">
                            {s.arenaRating ?? 300}
                            {s.arenaLeague && <span className="ml-1 text-[10px] text-[#94a3b8]">{s.arenaLeague}</span>}
                          </span>
                          <span className="sm:text-center sm:text-sm sm:font-medium sm:text-[#111111] sm:dark:text-[#E2F0E8]">{s.dailySolved}</span>
                          <span className="sm:text-center sm:text-sm sm:font-medium sm:text-[#111111] sm:dark:text-[#E2F0E8]">{s.duelsWon}/{s.duelsPlayed}</span>
                          <span className="sm:text-center sm:text-sm sm:font-medium sm:text-[#111111] sm:dark:text-[#E2F0E8]">{s.mocksDone}</span>
                          <span className="hidden sm:block sm:text-center text-xs text-[#94a3b8]">{s.role}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : members.length === 0 && !membersLoading ? (
              <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-10 text-center">
                <Users className="w-8 h-8 text-[#C1CFC4] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8]">{t('circle.noMembers')}</p>
              </div>
            ) : null}
          </>
        )}

        {/* ===== CHALLENGE TAB ===== */}
        {activeTab === 'challenge' && (
          <>
            {challengeLoading ? (
              <div className="h-40 bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] animate-pulse" />
            ) : challenge ? (
              <>
                {/* Challenge header */}
                <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${grad.from}18` }}>
                        <Trophy className="w-4 h-4" style={{ color: grad.from }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">
                          {t(`circle.challenge.template.${challenge.templateKey}`)}
                        </p>
                        <p className="text-[11px] text-[#94a3b8]">
                          {t('circle.challenge.target', { value: challenge.targetValue })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{t('circle.challenge.endsIn')}</p>
                      <p className="text-xs font-medium text-[#111111] dark:text-[#E2F0E8]">
                        {Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / 86400000))} {t('circle.challenge.days')}
                      </p>
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  {(() => {
                    const completed = challenge.progress.filter(p => p.current >= challenge.targetValue).length
                    const total = challenge.progress.length
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                    return (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[#4B6B52] dark:text-[#7BA88A]">{t('circle.challenge.teamProgress')}</span>
                          <span className="font-medium text-[#111111] dark:text-[#E2F0E8]">{completed}/{total}</span>
                        </div>
                        <div className="h-2.5 bg-[#f1f5f9] dark:bg-[#162E24] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${grad.from}, ${grad.to})` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Per-member progress */}
                <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] overflow-hidden">
                  <div className="divide-y divide-[#F0F5F1] dark:divide-[#1E4035]">
                    {challenge.progress.map(p => {
                      const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || t('circle.memberFallback')
                      const done = p.current >= challenge.targetValue
                      const pct = Math.min(100, Math.round((p.current / challenge.targetValue) * 100))
                      return (
                        <div key={p.userId} className="flex items-center gap-3 px-5 py-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${done ? 'bg-[#22c55e] text-white' : 'bg-[#f1f5f9] dark:bg-[#162E24] text-[#94a3b8]'}`}>
                            {done ? <Check className="w-3 h-3" /> : null}
                          </span>
                          <Avatar name={name} src={p.avatarUrl || undefined} size="xs" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#111111] dark:text-[#E2F0E8] truncate">{name}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-16 h-1.5 bg-[#f1f5f9] dark:bg-[#162E24] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: done ? '#22c55e' : grad.from }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[#4B6B52] dark:text-[#7BA88A] w-10 text-right">
                              {p.current}/{challenge.targetValue}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-10 text-center">
                <Target className="w-8 h-8 text-[#C1CFC4] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8] mb-4">{t('circle.challenge.empty')}</p>
                {isCreator && (
                  <Button variant="orange" size="sm" onClick={() => setShowCreateChallenge(true)}>
                    <Plus className="w-3.5 h-3.5" /> {t('circle.challenge.create')}
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== EVENTS TAB ===== */}
        {activeTab === 'events' && (
          <>
            {circle.isJoined && (
              <div className="flex justify-end">
                <Button variant="orange" size="sm" onClick={() => setShowCreateEvent(true)}>
                  <Plus className="w-3.5 h-3.5" /> {t('circle.createEvent')}
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {eventsLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] animate-pulse" />
                ))
              ) : events.length === 0 ? (
                <div className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] px-5 py-10 text-center">
                  <Calendar className="w-8 h-8 text-[#C1CFC4] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">{t('circle.noEvents')}</p>
                  {circle.isJoined && (
                    <button onClick={() => setShowCreateEvent(true)} className="mt-3 text-xs text-[#059669] hover:underline">
                      {t('circle.createFirstEvent')}
                    </button>
                  )}
                </div>
              ) : events.map(ev => {
                const repeatLabel = ev.repeat && ev.repeat !== 'none' ? t(`events.repeat.${ev.repeat as EventRepeat}`) : null
                return (
                  <div key={ev.id} className="bg-white dark:bg-[#132420] rounded-2xl border border-[#E4EBE5] dark:border-[#1E4035] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">{ev.title}</h4>
                          {repeatLabel && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#ecfdf5] dark:bg-[#0d2a1f] text-[#059669] rounded-full font-medium">
                              <RefreshCw className="w-2.5 h-2.5" />{repeatLabel}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-xs text-[#4B6B52] dark:text-[#7BA88A] mt-1 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                            <Calendar className="w-3 h-3" />
                            {ev.scheduledAt
                              ? new Date(ev.scheduledAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : t('events.scheduleUnknown')}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                            <Users className="w-3 h-3" />{ev.participantCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {ev.meetingLink && (
                          <a href={ev.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-[#059669] hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" /> {t('circle.link')}
                          </a>
                        )}
                        {ev.isJoined ? (
                          <button onClick={() => eventApi.leaveEvent(ev.id).then(loadEvents)}
                            className="text-xs text-[#94a3b8] hover:text-red-500 transition-colors">
                            {t('events.leave')}
                          </button>
                        ) : (
                          <button onClick={() => eventApi.joinEvent(ev.id).then(loadEvents)}
                            className="text-xs font-medium text-[#059669] hover:underline">
                            {t('events.join')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Invite member modal */}
      <Modal
        open={showInvite}
        onClose={() => { setShowInvite(false); setInviteUserId('') }}
        title={t('circle.inviteMemberTitle')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowInvite(false); setInviteUserId('') }}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleInvite} loading={inviting} disabled={!inviteUserId.trim()}>{t('circle.invite')}</Button>
          </>
        }
      >
        <Input
          label={t('circle.userId')}
          value={inviteUserId}
          onChange={e => setInviteUserId(e.target.value)}
          placeholder={t('circle.userIdPlaceholder')}
        />
      </Modal>

      {/* Create event modal */}
      <Modal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        title={t('circle.newEvent')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateEvent(false)}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleCreateEvent} loading={creatingEvent}
              disabled={!eventForm.title}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label={t('events.form.title')} value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder={t('circle.eventTitlePlaceholder')} />
          <Input label={t('events.form.dateTime')} type="datetime-local" value={eventForm.scheduledAt} onChange={e => setEventForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <div>
            <label className="text-xs font-medium text-[#4B6B52] mb-1 block">{t('circle.repeat')}</label>
            <select
              value={eventForm.repeat}
              onChange={e => setEventForm(f => ({ ...f, repeat: e.target.value as EventRepeat }))}
              className="select-field w-full"
            >
              {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as EventRepeat[]).map(val => (
                <option key={val} value={val}>{t(`events.repeat.${val}`)}</option>
              ))}
            </select>
          </div>
          <Input label={t('events.form.link')} value={eventForm.meetingLink} onChange={e => setEventForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/..." />
          <Input label={t('events.form.description')} value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder={t('circle.eventDescriptionPlaceholder')} />
        </div>
      </Modal>

      {/* Create challenge modal */}
      <Modal
        open={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        title={t('circle.challenge.createTitle')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateChallenge(false)}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleCreateChallenge} loading={creatingChallenge}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[#4B6B52] dark:text-[#94a3b8] mb-2 block">{t('circle.challenge.selectType')}</label>
            <div className="flex flex-col gap-2">
              {CHALLENGE_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.key}
                  onClick={() => setChallengeForm(f => ({ ...f, templateKey: tmpl.key, targetValue: tmpl.defaultTarget }))}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    challengeForm.templateKey === tmpl.key
                      ? 'border-[#059669] bg-[#ecfdf5] dark:bg-[#0d2a1f]'
                      : 'border-[#E4EBE5] dark:border-[#1E4035] hover:border-[#94a3b8]'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111111] dark:text-[#E2F0E8]">
                      {t(`circle.challenge.template.${tmpl.key}`)}
                    </p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      {t(`circle.challenge.templateDesc.${tmpl.key}`)}
                    </p>
                  </div>
                  {challengeForm.templateKey === tmpl.key && (
                    <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#4B6B52] dark:text-[#94a3b8] mb-1 block">{t('circle.challenge.targetLabel')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={challengeForm.targetValue}
              onChange={e => setChallengeForm(f => ({ ...f, targetValue: Math.max(1, parseInt(e.target.value) || 1) }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E4EBE5] dark:border-[#1E4035] bg-white dark:bg-[#0B1210] text-sm text-[#111111] dark:text-[#E2F0E8] focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
            />
            <p className="text-[11px] text-[#94a3b8] mt-1">{t('circle.challenge.duration')}</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('circle.deleteTitle')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleDelete} loading={deleting}>{t('events.delete')}</Button>
          </>
        }
      >
        <p className="text-sm text-[#4B6B52] dark:text-[#94a3b8]">
          {t('circle.deleteBody')}
        </p>
      </Modal>
    </div>
  )
}
