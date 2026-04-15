import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Search, Lock, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { circleApi, type CreateCirclePayload } from '@/features/Circle/api/circleApi'
import type { Circle } from '@/entities/Circle/model/types'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { useToast } from '@/shared/ui/Toast'
import { getCircleGradient } from '@/shared/lib/circleGradient'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { PageMeta } from '@/shared/ui/PageMeta'

export function CirclesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Partial<CreateCirclePayload & { tagsInput: string }>>({ isPublic: true })

  const fetchCircles = useCallback(() => {
    setError(null)
    setLoading(true)
    circleApi.listCircles({ limit: 20 })
      .then(r => setCircles(r.circles))
      .catch(() => setError(t('circles.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    fetchCircles()
  }, [fetchCircles])

  const handleCreate = async () => {
    if (!form.name) return
    setCreating(true)
    try {
      const tags = (form.tagsInput ?? '').split(',').map(t => t.trim()).filter(Boolean)
      const created = await circleApi.createCircle({
        name: form.name,
        description: form.description ?? '',
        tags,
        isPublic: form.isPublic ?? true,
      })
      setCircles(prev => [created, ...prev])
      setShowCreate(false)
      setForm({})
      toast(t('circles.created'), 'success')
    } catch {
      toast(t('circles.createFailed'), 'error')
    } finally { setCreating(false) }
  }

  const filtered = search
    ? circles.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : circles

  const totalMembers = circles.reduce((s, c) => s + c.memberCount, 0)

  if (error) return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <PageMeta title={t('circles.meta.title')} description={t('circles.meta.description')} canonicalPath="/community/circles" />
        <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] dark:bg-[#1a2540] flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#6366F1]" />
        </div>
      <h2 className="text-base font-bold text-[#111111] dark:text-[#e2e8f3] mb-1">{t('circles.soonTitle')}</h2>
      <p className="text-sm text-[#666666] dark:text-[#7e93b0]">{t('circles.soonBody')}</p>
    </div>
  )

  return (
    <div className={isMobile ? 'px-4 pt-5 pb-6' : 'px-6 pt-5 pb-6'}>
      <PageMeta title={t('circles.meta.title')} description={t('circles.meta.description')} canonicalPath="/community/circles" />
      {isMobile ? (
        <section className="section-enter mb-5 rounded-[30px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(239,246,255,0.94)_48%,_rgba(255,247,237,0.94))] p-5 shadow-[0_18px_34px_rgba(15,23,42,0.07)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6366F1]">Interest Circles</p>
              <h1 className="mt-2 text-2xl font-bold text-[#111111]">{t('circles.title')}</h1>
              <p className="mt-2 text-sm leading-6 text-[#475569]">{t('circles.subtitleMobile')}</p>
            </div>
            <Button variant="orange" size="sm" onClick={() => setShowCreate(true)} className="shrink-0 rounded-full px-4">
              <Plus className="w-3.5 h-3.5" /> {t('common.create')}
            </Button>
          </div>

          {!loading && circles.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085]">{t('circles.total')}</p>
                <p className="mt-2 font-mono text-2xl font-bold text-[#111111]">{circles.length}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085]">{t('circles.members')}</p>
                <p className="mt-2 font-mono text-2xl font-bold text-[#111111]">{totalMembers}</p>
              </div>
            </div>
          )}

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('circles.searchPlaceholder')}
              className="pl-10 pr-4 py-3 w-full bg-white/88 border border-white/80 rounded-2xl text-sm text-[#111111] placeholder:text-[#94a3b8] shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
            />
          </div>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#111111] dark:text-[#e2e8f3]">{t('circles.title')}</h1>
              <p className="text-sm text-[#666666] dark:text-[#7e93b0] mt-0.5">{t('circles.subtitle')}</p>
            </div>
            <Button variant="orange" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> {t('circles.create')}
            </Button>
          </div>

          {!loading && circles.length > 0 && (
            <div className="flex items-center gap-5 mb-4">
              <span className="text-sm text-[#666666] dark:text-[#7e93b0]">
                <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{circles.length}</span> {t('circles.totalShort')}
              </span>
              <span className="w-px h-3.5 bg-[#CBCCC9] dark:bg-[#1e3158]" />
              <span className="text-sm text-[#666666] dark:text-[#7e93b0]">
                <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{totalMembers}</span> {t('circles.membersShort')}
              </span>
            </div>
          )}

          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('circles.searchPlaceholder')}
              className="pl-9 pr-4 py-2 w-full max-w-sm bg-white dark:bg-[#0f1117] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg text-sm text-[#111111] dark:text-[#e2e8f3] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
            />
          </div>
        </>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[200px] bg-white dark:bg-[#161c2d] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] animate-pulse" />
          ))
          : filtered.length === 0
            ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f0f0ee] dark:bg-[#1a2540] flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#94a3b8]" />
                </div>
                <p className="text-base font-semibold text-[#111111] dark:text-[#e2e8f3] mb-1">{t('circles.emptyTitle')}</p>
                <p className="text-sm text-[#666666] dark:text-[#7e93b0] mb-4">{t('circles.emptyBody')}</p>
                <Button variant="orange" size="sm" onClick={() => setShowCreate(true)}>
                  {t('circles.create')}
                </Button>
              </div>
            )
            : filtered.map(c => {
              const grad = getCircleGradient(c.name)
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/community/circles/${c.id}`)}
                  className="group bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] hover:border-[#6366F1] dark:hover:border-[#6366F1] hover:shadow-lg dark:hover:shadow-[0_4px_24px_rgba(99,102,241,0.15)] transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Colored top accent */}
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${grad.from}, ${grad.to})` }} />

                  <div className="p-5">
                    {/* Avatar + joined badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
                      >
                        {c.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!c.isPublic && <Lock className="w-3.5 h-3.5 text-[#94a3b8]" />}
                        {c.isJoined && <Badge variant="success">{t('circle.member')}</Badge>}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-bold text-[#111111] dark:text-[#e2e8f3] line-clamp-1 mb-1">
                      {c.name}
                    </h3>

                    {/* Description */}
                    {c.description ? (
                      <p className="text-xs text-[#666666] dark:text-[#7e93b0] leading-relaxed line-clamp-2 mb-3">
                        {c.description}
                      </p>
                    ) : (
                      <div className="mb-3" />
                    )}

                    {/* Tags */}
                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {c.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-[#F2F3F0] dark:bg-[#0f1117] rounded-full text-[10px] text-[#666666] dark:text-[#7e93b0] font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                        {c.tags.length > 3 && (
                          <span className="px-1 text-[10px] text-[#94a3b8]">+{c.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#F2F3F0] dark:border-[#1e3158]">
                      <span className="flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#7e93b0]">
                        <Users className="w-3.5 h-3.5" />
                        {t('circle.membersCount', { count: c.memberCount })}
                      </span>
                      <span
                        className="text-xs font-semibold transition-transform duration-150 group-hover:translate-x-0.5"
                        style={{ color: grad.from }}
                      >
                        {t('circles.open')} →
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
        }

        {/* Create new circle card */}
        {!loading && filtered.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="h-[200px] border-2 border-dashed border-[#CBCCC9] dark:border-[#1e3158] rounded-2xl flex flex-col items-center justify-center gap-3 text-[#94a3b8] hover:border-[#6366F1] hover:text-[#6366F1] dark:hover:border-[#6366F1] dark:hover:text-[#6366F1] transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F2F3F0] dark:bg-[#0f1117] group-hover:bg-[#EEF2FF] dark:group-hover:bg-[#1a2540] flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold">{t('circles.create')}</span>
          </button>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('circles.newTitle')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={creating}>{t('common.create')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label={t('circles.form.name')} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('circles.form.namePlaceholder')} />
          <Input label={t('circles.form.description')} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('circles.form.descriptionPlaceholder')} />
          <Input label={t('circles.form.tags')} value={form.tagsInput ?? ''} onChange={e => setForm(f => ({ ...f, tagsInput: e.target.value }))} placeholder={t('circles.form.tagsPlaceholder')} />
          {/* Privacy toggle */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111111] dark:text-[#e2e8f3]">{t('circles.form.visibility')}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isPublic: true }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  (form.isPublic ?? true)
                    ? 'bg-[#EEF2FF] border-[#6366F1] text-[#6366F1]'
                    : 'bg-white dark:bg-[#161c2d] border-[#CBCCC9] dark:border-[#1e3158] text-[#666666] dark:text-[#7e93b0] hover:border-[#6366F1]/40'
                }`}
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <div>{t('circle.public')}</div>
                  <div className="text-[10px] font-normal opacity-70">{t('circles.form.publicHint')}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isPublic: false }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  !(form.isPublic ?? true)
                    ? 'bg-[#EEF2FF] border-[#6366F1] text-[#6366F1]'
                    : 'bg-white dark:bg-[#161c2d] border-[#CBCCC9] dark:border-[#1e3158] text-[#666666] dark:text-[#7e93b0] hover:border-[#6366F1]/40'
                }`}
              >
                <Lock className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <div>{t('circle.private')}</div>
                  <div className="text-[10px] font-normal opacity-70">{t('circles.form.privateHint')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
