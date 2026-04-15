import { useState, useEffect, useCallback } from 'react'
import { Search, Briefcase, ExternalLink, Plus, MapPin, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Textarea } from '@/shared/ui/Textarea'
import { Select } from '@/shared/ui/Select'
import { ErrorState } from '@/shared/ui/ErrorState'
import { referralApi, type CreateReferralData } from '@/features/Referral/api/referralApi'
import type { Referral } from '@/entities/Referral/model/types'
import { useToast } from '@/shared/ui/Toast'
import { formatDate } from '@/shared/lib/dateFormat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

const EMPTY_FORM: CreateReferralData = {
  title: '',
  company: '',
  vacancyUrl: '',
  description: '',
  experience: '',
  location: '',
  employmentType: '',
}

function ReferralCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-4 bg-[#CBCCC9]/40 rounded w-1/3 mb-3" />
      <div className="h-5 bg-[#CBCCC9]/40 rounded w-2/3 mb-2" />
      <div className="h-3 bg-[#CBCCC9]/40 rounded w-full mb-1" />
      <div className="h-3 bg-[#CBCCC9]/40 rounded w-4/5 mb-4" />
      <div className="flex gap-2">
        <div className="h-3 bg-[#CBCCC9]/40 rounded w-16" />
        <div className="h-3 bg-[#CBCCC9]/40 rounded w-20" />
      </div>
    </Card>
  )
}

export function VacanciesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const employmentTypes = [
    { value: 'EMPLOYMENT_TYPE_FULL_TIME', label: t('vacancies.type.fullTime') },
    { value: 'EMPLOYMENT_TYPE_PART_TIME', label: t('vacancies.type.partTime') },
    { value: 'EMPLOYMENT_TYPE_REMOTE', label: t('vacancies.type.remote') },
    { value: 'EMPLOYMENT_TYPE_CONTRACT', label: t('vacancies.type.contract') },
    { value: 'EMPLOYMENT_TYPE_INTERNSHIP', label: t('vacancies.type.internship') },
  ]
  const filterPills = [
    { key: 'all', label: t('vacancies.filter.all') },
    { key: 'EMPLOYMENT_TYPE_FULL_TIME', label: t('vacancies.type.fullTime') },
    { key: 'EMPLOYMENT_TYPE_PART_TIME', label: t('vacancies.type.partTime') },
    { key: 'EMPLOYMENT_TYPE_REMOTE', label: t('vacancies.type.remote') },
    { key: 'EMPLOYMENT_TYPE_CONTRACT', label: t('vacancies.type.contract') },
  ]
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CreateReferralData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const fetchReferrals = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await referralApi.list()
      setReferrals(res.referrals)
    } catch {
      setError(t('common.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  const handleCreate = async () => {
    if (!form.title || !form.company) return
    setSubmitting(true)
    try {
      const created = await referralApi.create(form)
      setReferrals(prev => [created, ...prev])
      setForm(EMPTY_FORM)
      setModalOpen(false)
      toast(t('vacancies.posted'), 'success')
    } catch {
      toast(t('vacancies.postFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = referrals.filter(r => {
    if (filter !== 'all' && r.employmentType !== filter) {
      return false
    }
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    }
    return true
  })

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchReferrals() }} />

  const remoteCount = referrals.filter(referral => referral.employmentType.toLowerCase().includes('remote')).length

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className={isMobile ? 'mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-8' : 'mx-auto max-w-6xl px-8 py-8'}>
        {isMobile ? (
          <>
            <section className="section-enter mb-4 overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(255,247,237,0.96)_42%,_rgba(239,246,255,0.92))] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-[#1a2540] dark:bg-[linear-gradient(145deg,_rgba(22,28,45,0.98),_rgba(30,41,59,0.94)_52%,_rgba(30,30,74,0.56))] md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6366F1] dark:text-[#a5b4fc]">
                    {t('vacancies.eyebrow')}
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-[#111111] font-geist dark:text-[#f8fafc]">
                    {t('vacancies.title')}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[#475569] dark:text-[#94a3b8]">
                    {t('vacancies.subtitle')}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 backdrop-blur dark:border-[#24324f] dark:bg-[#111827]/72">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085] dark:text-[#7e93b0]">{t('vacancies.roles')}</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#111111] dark:text-[#f8fafc]">{loading ? '—' : filtered.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 backdrop-blur dark:border-[#24324f] dark:bg-[#111827]/72">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085] dark:text-[#7e93b0]">{t('vacancies.type.remote')}</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#111111] dark:text-[#f8fafc]">{loading ? '—' : remoteCount}</p>
                    </div>
                  </div>

                  <Button variant="orange" size="md" onClick={() => setModalOpen(true)} className="justify-center rounded-full px-5">
                    <Plus className="w-4 h-4" />
                    {t('vacancies.add')}
                  </Button>
                </div>
              </div>

              <div className="relative mt-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type="text"
                  placeholder={t('vacancies.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-white/80 bg-white/86 py-3 pl-10 pr-4 text-sm text-[#111111] placeholder-[#666666] shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] transition-colors font-geist dark:border-[#24324f] dark:bg-[#111827]/78 dark:text-[#f8fafc]"
                />
              </div>
            </section>

            <div className="-mx-4 mb-6 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
              <div className="inline-flex gap-2">
                {filterPills.map(pill => (
                  <button
                    key={pill.key}
                    onClick={() => setFilter(pill.key)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors font-geist ${
                      filter === pill.key
                        ? 'bg-[#6366F1] text-white shadow-[0_10px_20px_rgba(99,102,241,0.24)]'
                        : 'bg-white border border-[#CBCCC9] text-[#666666] hover:bg-[#F2F3F0] dark:bg-[#161c2d] dark:border-[#1a2540] dark:text-[#94a3b8] dark:hover:bg-[#1a2236]'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">{t('vacancies.title')}</h1>
                <p className="mt-1 text-sm text-[#666666] dark:text-[#7e93b0]">{t('vacancies.desktopSubtitle')}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-sm text-[#666666] dark:text-[#7e93b0]">
                  <span><span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{loading ? '—' : filtered.length}</span> {t('vacancies.rolesLower')}</span>
                  <span className="h-4 w-px bg-[#CBCCC9] dark:bg-[#1e3158]" />
                  <span><span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{loading ? '—' : remoteCount}</span> {t('vacancies.remoteLower')}</span>
                </div>
                <Button variant="orange" size="md" onClick={() => setModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  {t('vacancies.add')}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type="text"
                  placeholder={t('vacancies.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[#CBCCC9] bg-white py-2.5 pl-10 pr-4 text-sm text-[#111111] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 dark:border-[#1a2540] dark:bg-[#161c2d] dark:text-[#f8fafc]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {filterPills.map(pill => (
                  <button
                    key={pill.key}
                    onClick={() => setFilter(pill.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      filter === pill.key
                        ? 'border-[#6366F1] bg-[#6366F1] text-white'
                        : 'border-[#CBCCC9] bg-white text-[#666666] hover:bg-[#F2F3F0] dark:border-[#1a2540] dark:bg-[#161c2d] dark:text-[#94a3b8] dark:hover:bg-[#1a2236]'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Grid */}
        {loading ? (
          <div className={`mt-6 grid grid-cols-1 gap-4 ${isMobile ? 'sm:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ReferralCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`mt-6 section-enter flex flex-col items-center justify-center border border-dashed border-[#CBCCC9] bg-white py-20 text-center dark:border-[#1a2540] dark:bg-[#161c2d] ${isMobile ? 'rounded-[30px]' : 'rounded-2xl'}`}>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/10">
              <Briefcase className="w-8 h-8 text-[#6366F1]" />
            </div>
            <p className="text-lg font-semibold text-[#111111] font-geist mb-1">
              {t('vacancies.emptyTitle')}
            </p>
            <p className="text-sm text-[#666666] font-geist">
              {t('vacancies.emptyBody')}
            </p>
          </div>
        ) : (
          <div className={`mt-6 grid grid-cols-1 gap-4 ${isMobile ? 'sm:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {filtered.map(ref => (
              <Card
                key={ref.id}
                className={`section-enter flex flex-col gap-3 transition-shadow hover:shadow-md dark:border-[#1a2540] dark:bg-[#161c2d]/96 ${
                  isMobile
                    ? 'rounded-[28px] border-[#d8d9d6] bg-white/96 shadow-[0_12px_28px_rgba(15,23,42,0.05)]'
                    : 'rounded-2xl border-[#CBCCC9] bg-white shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold text-[#666666] font-geist uppercase tracking-wide">
                    {ref.company}
                  </span>
                  <Badge variant="orange">{employmentTypes.find(type => type.value === ref.employmentType)?.label ?? ref.employmentType}</Badge>
                </div>

                <h3 className="text-base font-bold text-[#111111] font-geist leading-snug">
                  {ref.title}
                </h3>

                <p className="text-sm text-[#666666] font-geist line-clamp-3">
                  {ref.description}
                </p>

                <div className="flex flex-wrap gap-3 text-xs text-[#666666] font-geist">
                  {ref.experience && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ref.experience}
                    </span>
                  )}
                  {ref.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ref.location}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-[#CBCCC9]/50 pt-3">
                  <span className="text-xs text-[#666666] font-geist">
                    {formatDate(ref.createdAt)}
                  </span>
                  <a
                    href={ref.vacancyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6366F1] bg-[#6366F1]/10 rounded-lg hover:bg-[#6366F1]/20 transition-colors"
                  >
                    {t('common.open')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('vacancies.modalTitle')}
        subtitle={t('vacancies.modalSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={submitting}>
              {t('vacancies.publish')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t('vacancies.positionTitle')}
            placeholder="Senior Frontend Developer"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <Input
            label={t('vacancies.company')}
            placeholder="Google"
            value={form.company}
            onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
          />
          <Input
            label={t('vacancies.jobLink')}
            placeholder="https://..."
            value={form.vacancyUrl}
            onChange={e => setForm(prev => ({ ...prev, vacancyUrl: e.target.value }))}
          />
          <Textarea
            label={t('vacancies.description')}
            placeholder={t('vacancies.descriptionPlaceholder')}
            rows={3}
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('vacancies.experience')}
              placeholder={t('vacancies.experiencePlaceholder')}
              value={form.experience}
              onChange={e => setForm(prev => ({ ...prev, experience: e.target.value }))}
            />
            <Input
              label={t('vacancies.location')}
              placeholder={t('vacancies.locationPlaceholder')}
              value={form.location}
              onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
          <Select
            label={t('vacancies.employmentType')}
            options={employmentTypes}
            value={form.employmentType}
            onChange={v => setForm(prev => ({ ...prev, employmentType: v }))}
            placeholder={t('vacancies.selectType')}
          />
        </div>
      </Modal>
    </div>
  )
}
