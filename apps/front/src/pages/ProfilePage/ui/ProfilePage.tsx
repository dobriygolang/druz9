import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import { apiClient } from '@/shared/api/base'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { PageMeta } from '@/shared/ui/PageMeta'
import { GoalSelector } from '@/shared/ui/GoalSelector'
import { useProfileData, type ArenaStats } from '../hooks/useProfileData'
import { computeCompanyReadiness } from '../lib/computeReadiness'
import { ProfileHero } from './ProfileHero'
import { ProfileComparison } from './ProfileComparison'
import { StrengthRadar } from './StrengthRadar'
import { CompanyReadiness } from './CompanyReadiness'
import { ActivitySection } from './ActivitySection'
import { AchievementShowcase } from './AchievementShowcase'

const PINNED_STORAGE_KEY = 'druz9_pinned_achievements'

function loadPinnedIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${PINNED_STORAGE_KEY}_${userId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePinnedIds(userId: string, ids: string[]) {
  try {
    localStorage.setItem(`${PINNED_STORAGE_KEY}_${userId}`, JSON.stringify(ids))
  } catch { /* ignore quota errors */ }
}

function LoadingProfile() {
  return (
    <div className="animate-pulse space-y-4 px-4 pb-6 pt-4 md:p-6">
      <div className="h-[220px] rounded-[32px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[300px] rounded-[28px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
        <div className="h-[300px] rounded-[28px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: authUser, refresh } = useAuth()
  const { toast } = useToast()

  const {
    user,
    progress,
    achievements,
    activity,
    arenaStats,
    feed,
    loading,
    error,
    isOwn,
    refetch,
  } = useProfileData(userId)

  // ── Local state ────────────────────────────────────────────────
  const [myProgress, setMyProgress] = useState<typeof progress>(null)
  const [myArenaStats, setMyArenaStats] = useState<ArenaStats | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editWorkplace, setEditWorkplace] = useState('')
  const [saving, setSaving] = useState(false)
  const [bindingProvider, setBindingProvider] = useState<'telegram' | 'yandex' | null>(null)
  const [bindError, setBindError] = useState('')
  const [tgToken, setTgToken] = useState('')
  const [tgCode, setTgCode] = useState('')
  const [showTgCodeModal, setShowTgCodeModal] = useState(false)
  const [submittingTgCode, setSubmittingTgCode] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [goalOverride, setGoalOverride] = useState<{ kind: 'general_growth' | 'weakest_first' | 'company_prep'; company: string } | undefined>(undefined)
  const [showGoalSelector, setShowGoalSelector] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)

  // Load pinned achievements from localStorage
  useEffect(() => {
    if (user?.id) {
      setPinnedIds(loadPinnedIds(user.id))
    }
    setEditWorkplace(user?.currentWorkplace ?? '')
  }, [user])

  // Fetch comparison data for foreign profiles
  useEffect(() => {
    if (isOwn || !authUser?.id) {
      setMyProgress(null)
      setMyArenaStats(null)
      return
    }
    authApi.getProfileProgress(authUser.id).then(setMyProgress).catch(() => setMyProgress(null))
    apiClient.get(`/api/v1/arena/stats/${authUser.id}`)
      .then(res => {
        const s = res.data?.stats ?? res.data
        if (s && typeof s.rating === 'number') setMyArenaStats(s)
      })
      .catch(() => setMyArenaStats(null))
  }, [authUser?.id, isOwn])

  const readiness = useMemo(() => (progress ? computeCompanyReadiness(progress) : []), [progress])

  // The active goal: use local override if set, otherwise from fetched progress
  const activeGoal = goalOverride ?? progress?.goal ?? (isOwn ? { kind: 'general_growth' as const, company: '' } : undefined)

  // ── Goal selector — optimistic update ──────────────────────────
  const handleGoalChange = async (newGoal: { kind: string; company?: string }) => {
    const typedGoal = { kind: newGoal.kind as 'general_growth' | 'weakest_first' | 'company_prep', company: newGoal.company ?? '' }
    setGoalOverride(typedGoal)
    setGoalSaving(true)
    setShowGoalSelector(false)
    try {
      const savedGoal = await authApi.setUserGoal(newGoal)
      setGoalOverride(savedGoal)
    } catch {
      setGoalOverride(undefined)
      toast(t('common.saveFailed'), 'error')
    } finally {
      setGoalSaving(false)
    }
  }

  // ── Pin achievements — localStorage backed ─────────────────────
  const handlePinToggle = (id: string) => {
    if (!user) return
    const next = pinnedIds.includes(id)
      ? pinnedIds.filter(item => item !== id)
      : [...pinnedIds, id].slice(0, 4)
    setPinnedIds(next)
    savePinnedIds(user.id, next)
  }

  // ── Edit profile ───────────────────────────────────────────────
  const openEdit = () => {
    setEditWorkplace(user?.currentWorkplace ?? '')
    setEditMode(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await authApi.updateProfile({ currentWorkplace: editWorkplace })
      await refresh()
      refetch()
      setEditMode(false)
    } catch {
      toast(t('common.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Telegram binding ───────────────────────────────────────────
  const bindTelegram = async () => {
    setBindingProvider('telegram')
    setBindError('')
    try {
      const { token, botStartUrl } = await authApi.createTelegramAuthChallenge()
      setTgToken(token)
      setTgCode('')
      window.open(botStartUrl, '_blank')
      setShowTgCodeModal(true)
    } catch {
      setBindError(t('profile.bind.telegramOpenFailed'))
    } finally {
      setBindingProvider(null)
    }
  }

  const submitTgCode = async () => {
    if (!tgCode.trim() || !tgToken) return
    setSubmittingTgCode(true)
    try {
      await authApi.bindTelegram(tgToken, tgCode.trim())
      await refresh()
      refetch()
      setShowTgCodeModal(false)
      setTgCode('')
      setTgToken('')
      toast(t('profile.bind.telegramLinked'), 'success')
    } catch {
      toast(t('profile.bind.telegramCodeInvalid'), 'error')
    } finally {
      setSubmittingTgCode(false)
    }
  }

  const bindYandex = async () => {
    setBindingProvider('yandex')
    setBindError('')
    try {
      const { authUrl } = await authApi.startYandexAuth()
      window.location.href = authUrl
    } catch {
      setBindError(t('profile.bind.yandexOpenFailed'))
      setBindingProvider(null)
    }
  }

  // ── Render states ──────────────────────────────────────────────
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (loading) return <LoadingProfile />
  if (!user) return (
    <div className="flex items-center justify-center h-64 text-[#94a3b8] text-sm">{t('profile.notFound')}</div>
  )

  const hasCompetencies = (progress?.competencies?.length ?? 0) > 0
  const hasReadiness = readiness.length > 0

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:p-6">
      <PageMeta
        title={t('profile.meta.title')}
        description={t('profile.meta.description')}
        canonicalPath={userId ? `/profile/${userId}` : '/profile'}
      />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <ProfileHero
        user={user}
        progress={progress}
        arenaStats={arenaStats}
        isOwn={isOwn}
        onEdit={openEdit}
        onBindTelegram={bindTelegram}
        onBindYandex={bindYandex}
        bindingProvider={bindingProvider}
        bindError={bindError}
      />

      {/* ── Comparison strip (foreign profile only) ───────────── */}
      {!isOwn && (
        <ProfileComparison
          theirProgress={progress}
          theirArenaStats={arenaStats}
          myProgress={myProgress}
          myArenaStats={myArenaStats}
          onChallenge={() => navigate('/practice/arena')}
        />
      )}

      {/* ── Goal selector (own profile, collapsible) ──────────── */}
      {isOwn && activeGoal && (
        <div className="section-enter">
          {showGoalSelector ? (
            <div className="rounded-[20px] border border-[#CBCCC9] bg-white p-4 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <GoalSelector goal={activeGoal} companies={progress?.companies ?? []} onChange={handleGoalChange} />
              <button
                onClick={() => setShowGoalSelector(false)}
                className="mt-2 text-xs text-[#94a3b8] hover:text-[#475569] dark:hover:text-[#7e93b0]"
              >
                {t('common.close')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowGoalSelector(true)}
              disabled={goalSaving}
              className="inline-flex items-center gap-2 rounded-full border border-[#E7E8E5] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#6366F1] hover:text-[#6366F1] dark:border-[#1e3158] dark:bg-[#161c2d] dark:text-[#7e93b0] dark:hover:border-[#818cf8] dark:hover:text-[#818cf8]"
            >
              {t('goal.label')}: {t(`goal.${activeGoal.kind === 'general_growth' ? 'generalGrowth' : activeGoal.kind === 'weakest_first' ? 'weakAreas' : 'company'}`)}
              {activeGoal.kind === 'company_prep' && activeGoal.company ? ` · ${activeGoal.company}` : ''}
            </button>
          )}
        </div>
      )}

      {/* ── Skills + Readiness (2-column) ─────────────────────── */}
      {(hasCompetencies || hasReadiness) && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {hasCompetencies && (
            <StrengthRadar
              competencies={progress!.competencies}
              strongest={progress!.strongest}
              weakest={progress!.weakest}
            />
          )}
          {hasReadiness && <CompanyReadiness readiness={readiness} />}
        </div>
      )}

      {/* ── Activity + Arena (2-column) ───────────────────────── */}
      <ActivitySection
        activity={activity}
        arenaStats={arenaStats}
        progress={progress}
        feed={feed}
      />

      {/* ── Achievements ──────────────────────────────────────── */}
      {achievements.length > 0 && (
        <AchievementShowcase
          achievements={achievements}
          pinnedIds={pinnedIds}
          isOwn={isOwn}
          onTogglePin={isOwn ? handlePinToggle : undefined}
        />
      )}

      {/* ── Edit Profile Modal ────────────────────────────────── */}
      <Modal
        open={editMode}
        onClose={() => setEditMode(false)}
        title={t('profile.editModal.title')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditMode(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="orange" size="sm" onClick={saveEdit} loading={saving}>
              <Check className="w-3.5 h-3.5" /> {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t('profile.editModal.workplace')}
            value={editWorkplace}
            onChange={e => setEditWorkplace(e.target.value)}
            placeholder={t('profile.editModal.workplacePlaceholder')}
          />
        </div>
      </Modal>

      {/* ── Telegram Binding Modal ────────────────────────────── */}
      <Modal
        open={showTgCodeModal}
        onClose={() => { setShowTgCodeModal(false); setTgCode('') }}
        title={t('profile.telegramModal.title')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowTgCodeModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="orange" size="sm" onClick={submitTgCode} loading={submittingTgCode} disabled={!tgCode.trim()}>
              <Sparkles className="w-3.5 h-3.5" /> {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#666666] dark:text-[#7e93b0]">{t('profile.telegramModal.body')}</p>
          <Input
            label={t('profile.telegramModal.code')}
            value={tgCode}
            onChange={e => setTgCode(e.target.value)}
            placeholder={t('profile.telegramModal.codePlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter') submitTgCode() }}
          />
        </div>
      </Modal>
    </div>
  )
}
