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
import { NextActionCard } from '@/shared/ui/NextActionCard'
import { useProfileData, type ArenaStats } from '../hooks/useProfileData'
import { computeCompanyReadiness } from '../lib/computeReadiness'
import { ProfileHero } from './ProfileHero'
import { ProfileComparison } from './ProfileComparison'
import { NextMilestone } from './NextMilestone'
import { StrengthRadar } from './StrengthRadar'
import { CompanyReadiness } from './CompanyReadiness'
import { ActivitySection } from './ActivitySection'
import { AchievementShowcase } from './AchievementShowcase'

function LoadingProfile() {
  return (
    <div className="animate-pulse space-y-4 px-4 pb-6 pt-4 md:p-6">
      <div className="h-[220px] rounded-[32px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
      <div className="h-16 rounded-[22px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[360px] rounded-[28px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
        <div className="h-[360px] rounded-[28px] border border-[#CBCCC9] bg-white dark:border-[#1a2540] dark:bg-[#161c2d]" />
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

  useEffect(() => {
    setPinnedIds(user?.pinnedAchievements ?? [])
    setEditWorkplace(user?.currentWorkplace ?? '')
  }, [user])

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

  const handleGoalChange = async (newGoal: { kind: string; company?: string }) => {
    try {
      await authApi.setUserGoal(newGoal)
      refetch()
    } catch {
      toast(t('common.saveFailed'), 'error')
    }
  }

  const handlePinToggle = async (id: string) => {
    const next = pinnedIds.includes(id)
      ? pinnedIds.filter(item => item !== id)
      : [...pinnedIds, id].slice(0, 4)
    setPinnedIds(next)
    try {
      if (user) {
        await authApi.updatePinnedAchievements(user.id, next)
      }
    } catch {
      toast(t('profile.pinSaveFailed'), 'error')
    }
  }

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

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />
  }

  if (loading) {
    return <LoadingProfile />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-[#94a3b8] text-sm">
        {t('profile.notFound')}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:p-6">
      <PageMeta
        title={t('profile.meta.title')}
        description={t('profile.meta.description')}
        canonicalPath={userId ? `/profile/${userId}` : '/profile'}
      />

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

      {!isOwn && (
        <ProfileComparison
          theirProgress={progress}
          theirArenaStats={arenaStats}
          myProgress={myProgress}
          myArenaStats={myArenaStats}
          onChallenge={() => navigate('/practice/arena')}
        />
      )}

      <NextMilestone achievements={achievements} competencies={progress?.competencies ?? []} isOwn={isOwn} />

      {isOwn && progress?.goal && (
        <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
          <GoalSelector goal={progress.goal} companies={progress.companies} onChange={handleGoalChange} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <StrengthRadar
          competencies={progress?.competencies ?? []}
          strongest={progress?.strongest ?? []}
          weakest={progress?.weakest ?? []}
        />
        <CompanyReadiness readiness={readiness} />
      </div>

      {progress?.nextActions && progress.nextActions.length > 0 && (
        <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.progress.nextSteps')}</h3>
            <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.progress.nextStepsSubtitle')}</p>
          </div>
          <div className="flex flex-col gap-2">
            {progress.nextActions.map((action, i) => (
              <NextActionCard
                key={`${action.skillKey}-${i}`}
                title={action.title}
                description={action.description}
                actionType={action.actionType}
                href={action.actionUrl}
              />
            ))}
          </div>
        </div>
      )}

      <ActivitySection
        activity={activity}
        arenaStats={arenaStats}
        progress={progress}
        feed={feed}
      />

      <AchievementShowcase
        achievements={achievements}
        pinnedIds={pinnedIds}
        isOwn={isOwn}
        onTogglePin={isOwn ? handlePinToggle : undefined}
      />

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

      <Modal
        open={showTgCodeModal}
        onClose={() => {
          setShowTgCodeModal(false)
          setTgCode('')
        }}
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
          <p className="text-sm text-[#666666] dark:text-[#7e93b0]">
            {t('profile.telegramModal.body')}
          </p>
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
