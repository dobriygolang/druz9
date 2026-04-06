import { useState, useEffect, useCallback } from 'react'
import { Search, Briefcase, ExternalLink, Plus, MapPin, Clock } from 'lucide-react'
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

const EMPLOYMENT_TYPES = [
  { value: 'EMPLOYMENT_TYPE_FULL_TIME',  label: 'Full-time' },
  { value: 'EMPLOYMENT_TYPE_PART_TIME',  label: 'Part-time' },
  { value: 'EMPLOYMENT_TYPE_REMOTE',     label: 'Remote' },
  { value: 'EMPLOYMENT_TYPE_CONTRACT',   label: 'Contract' },
  { value: 'EMPLOYMENT_TYPE_INTERNSHIP', label: 'Internship' },
]

const FILTER_PILLS = ['Все', 'Full-time', 'Part-time', 'Remote', 'Contract'] as const

const EMPTY_FORM: CreateReferralData = {
  title: '',
  company: '',
  vacancyUrl: '',
  description: '',
  experience: '',
  location: '',
  employmentType: '',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
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
  const { toast } = useToast()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('Все')
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
      setError('Не удалось загрузить данные')
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
      toast('Рефералка опубликована', 'success')
    } catch {
      toast('Не удалось опубликовать', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = referrals.filter(r => {
    if (filter !== 'Все' && r.employmentType.toLowerCase() !== filter.toLowerCase()) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    }
    return true
  })

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchReferrals() }} />

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#111111] font-geist">
            Вакансии и рефералки
          </h1>
          <Button variant="orange" size="md" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Добавить рефералку
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <input
            type="text"
            placeholder="Поиск по названию, компании..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBCCC9] rounded-xl text-[#111111] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] transition-colors font-geist"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6">
          {FILTER_PILLS.map(pill => (
            <button
              key={pill}
              onClick={() => setFilter(pill)}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors font-geist ${
                filter === pill
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-white border border-[#CBCCC9] text-[#666666] hover:bg-[#F2F3F0]'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ReferralCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-[#6366F1]" />
            </div>
            <p className="text-lg font-semibold text-[#111111] font-geist mb-1">
              Пока нет вакансий
            </p>
            <p className="text-sm text-[#666666] font-geist">
              Будьте первым!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ref => (
              <Card key={ref.id} className="flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#666666] font-geist uppercase tracking-wide">
                    {ref.company}
                  </span>
                  <Badge variant="orange">{ref.employmentType}</Badge>
                </div>

                <h3 className="text-base font-bold text-[#111111] font-geist leading-snug">
                  {ref.title}
                </h3>

                <p className="text-sm text-[#666666] font-geist line-clamp-2">
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

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#CBCCC9]/50">
                  <span className="text-xs text-[#666666] font-geist">
                    {formatDate(ref.createdAt)}
                  </span>
                  <a
                    href={ref.vacancyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6366F1] bg-[#6366F1]/10 rounded-lg hover:bg-[#6366F1]/20 transition-colors"
                  >
                    Открыть
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
        title="Добавить рефералку"
        subtitle="Поделитесь вакансией с сообществом"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={submitting}>
              Опубликовать
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Название позиции"
            placeholder="Senior Frontend Developer"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <Input
            label="Компания"
            placeholder="Google"
            value={form.company}
            onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
          />
          <Input
            label="Ссылка на вакансию"
            placeholder="https://..."
            value={form.vacancyUrl}
            onChange={e => setForm(prev => ({ ...prev, vacancyUrl: e.target.value }))}
          />
          <Textarea
            label="Описание"
            placeholder="Краткое описание позиции..."
            rows={3}
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Опыт"
              placeholder="3-5 лет"
              value={form.experience}
              onChange={e => setForm(prev => ({ ...prev, experience: e.target.value }))}
            />
            <Input
              label="Локация"
              placeholder="Remote / Berlin"
              value={form.location}
              onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
          <Select
            label="Тип занятости"
            options={EMPLOYMENT_TYPES}
            value={form.employmentType}
            onChange={v => setForm(prev => ({ ...prev, employmentType: v }))}
            placeholder="Выберите тип"
          />
        </div>
      </Modal>
    </div>
  )
}
