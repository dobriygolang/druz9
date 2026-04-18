import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { Textarea } from '@/shared/ui/Textarea'
import { Toggle } from '@/shared/ui/Toggle'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import { PREP_TYPE_LABELS } from '@/shared/lib/taskLabels'
import { useTranslation } from 'react-i18next'
import { PageMeta } from '@/shared/ui/PageMeta'

export function InterviewPrepAdminPage() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'pools' | 'presets'>('tasks')
  const [showEdit, setShowEdit] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // Mock-question pools + company presets are loaded lazily when their tab
  // opens; both endpoints already exist in adminApi.
  const [pools, setPools] = useState<Array<{ id?: string; title?: string; slug?: string; roundType?: string; [k: string]: unknown }>>([])
  const [presets, setPresets] = useState<Array<{ id?: string; title?: string; slug?: string; trackSlug?: string; [k: string]: unknown }>>([])
  const [poolsLoading, setPoolsLoading] = useState(false)
  const [presetsLoading, setPresetsLoading] = useState(false)

  const loadTasks = () => {
    adminApi.listInterviewPrepTasks()
      .then((ts: any[]) => setTasks(ts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [])

  useEffect(() => {
    if (activeTab === 'pools' && pools.length === 0 && !poolsLoading) {
      setPoolsLoading(true)
      adminApi.listMockQuestionPools()
        .then((items: any[]) => setPools(items))
        .catch(() => {})
        .finally(() => setPoolsLoading(false))
    }
    if (activeTab === 'presets' && presets.length === 0 && !presetsLoading) {
      setPresetsLoading(true)
      adminApi.listCompanyPresets()
        .then((items: any[]) => setPresets(items))
        .catch(() => {})
        .finally(() => setPresetsLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleSave = async () => {
    if (!editTask) return
    setSaving(true)
    try {
      if (editTask.id) await adminApi.updateInterviewPrepTask(editTask.id, editTask)
      else await adminApi.createInterviewPrepTask(editTask)
      loadTasks()
      setShowEdit(false)
      setEditTask(null)
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.deleteInterviewPrepTask(deleteId)
      setTasks(prev => prev.filter(t => t.id !== deleteId))
      setDeleteId(null)
    } catch {}
  }

  const tabs = [
    { id: 'tasks', label: t('interviewPrepAdmin.tabs.tasks'), count: tasks.length },
    { id: 'pools', label: t('interviewPrepAdmin.tabs.pools') },
    { id: 'presets', label: t('interviewPrepAdmin.tabs.presets') },
  ]

  return (
    <div className="p-6">
      <PageMeta title={t('interviewPrepAdmin.meta.title')} description={t('interviewPrepAdmin.meta.description')} />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0B1210]">{t('interviewPrepAdmin.title')}</h1>
          <p className="text-sm text-[#4B6B52] mt-0.5">{t('interviewPrepAdmin.subtitle')}</p>
        </div>
        <Button variant="orange" onClick={() => { setEditTask({}); setShowEdit(true) }}>
          <Plus className="w-4 h-4" /> {t('interviewPrepAdmin.addTask')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#C1CFC4] mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-[#059669] text-[#0B1210]' : 'border-transparent text-[#4B6B52] hover:text-[#0B1210]'}`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-[#F0F5F1] text-[#4B6B52] rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-[#C1CFC4] overflow-hidden">
          <div className="divide-y divide-[#F0F5F1]">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-[#F0F5F1]" />
                <div className="flex-1 h-4 bg-[#F0F5F1] rounded" />
                <div className="w-20 h-4 bg-[#F0F5F1] rounded" />
              </div>
            )) : tasks.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#94a3b8]">{t('interviewPrepAdmin.noTasks')}</div>
            ) : tasks.map((task, i) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F0F5F1]">
                <div className="w-8 h-8 rounded-lg bg-[#F0F5F1] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-mono text-[#4B6B52]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0B1210] truncate">{task.title}</p>
                  <p className="text-xs text-[#4B6B52]">{task.companyTag ?? t('interviewPrepAdmin.general')} · {Math.round((task.durationSeconds ?? 0) / 60)} {t('interviewPrepAdmin.minutes')}</p>
                </div>
                <Badge variant={task.prepType === 'coding' ? 'indigo' : task.prepType === 'system_design' ? 'orange' : 'success'}>
                  {PREP_TYPE_LABELS[task.prepType] ?? task.prepType}
                </Badge>
                <Badge variant={task.isActive !== false ? 'success' : 'default'}>
                  {task.isActive !== false ? t('interviewPrepAdmin.active') : t('interviewPrepAdmin.inactive')}
                </Badge>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTask(task); setShowEdit(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0F5F1] text-[#4B6B52]">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#fef2f2] text-[#94a3b8] hover:text-[#ef4444]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pools' && (
        <div className="bg-white rounded-xl border border-[#C1CFC4] p-4">
          {poolsLoading && <div className="text-sm text-[#94a3b8]">Загрузка пулов…</div>}
          {!poolsLoading && pools.length === 0 && (
            <div className="text-sm text-[#94a3b8]">Пулов вопросов пока нет.</div>
          )}
          <div className="flex flex-col gap-2">
            {pools.map((p, i) => (
              <div key={p.id ?? i} className="flex items-center justify-between border-b border-[#C1CFC4] pb-2">
                <div>
                  <div className="text-sm font-medium">{p.title ?? p.slug ?? 'Unnamed pool'}</div>
                  <div className="text-xs text-[#94a3b8]">{p.roundType ? String(p.roundType) : 'mixed'}</div>
                </div>
                {p.id && (
                  <button
                    className="text-xs text-red-500"
                    onClick={async () => {
                      await adminApi.deleteMockQuestionPool(String(p.id))
                      setPools((prev) => prev.filter((x) => x.id !== p.id))
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'presets' && (
        <div className="bg-white rounded-xl border border-[#C1CFC4] p-4">
          {presetsLoading && <div className="text-sm text-[#94a3b8]">Загрузка пресетов…</div>}
          {!presetsLoading && presets.length === 0 && (
            <div className="text-sm text-[#94a3b8]">Пресетов компаний пока нет.</div>
          )}
          <div className="flex flex-col gap-2">
            {presets.map((p, i) => (
              <div key={p.id ?? i} className="flex items-center justify-between border-b border-[#C1CFC4] pb-2">
                <div>
                  <div className="text-sm font-medium">{p.title ?? p.slug ?? 'Unnamed preset'}</div>
                  <div className="text-xs text-[#94a3b8]">{p.trackSlug ? String(p.trackSlug) : ''}</div>
                </div>
                {p.id && (
                  <button
                    className="text-xs text-red-500"
                    onClick={async () => {
                      await adminApi.deleteCompanyPreset(String(p.id))
                      setPresets((prev) => prev.filter((x) => x.id !== p.id))
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTask(null) }}
        title={editTask?.id ? t('interviewPrepAdmin.editTask') : t('interviewPrepAdmin.newTask')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowEdit(false); setEditTask(null) }}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleSave} loading={saving}>{t('common.save')}</Button>
          </>
        }
      >
        {editTask && (
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('interviewPrepAdmin.form.title')} value={editTask.title ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, title: e.target.value }))} />
            <Input label={t('interviewPrepAdmin.form.slug')} value={editTask.slug ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, slug: e.target.value }))} />
            <Select
              label={t('interviewPrepAdmin.form.type')}
              options={[
                { value: 'coding', label: t('interviewPrepAdmin.type.coding') },
                { value: 'algorithm', label: t('interviewPrepAdmin.type.algorithm') },
                { value: 'sql', label: 'SQL' },
                { value: 'system_design', label: t('interviewPrepAdmin.type.systemDesign') },
                { value: 'code_review', label: t('interviewPrepAdmin.type.codeReview') },
                { value: 'behavioral', label: t('interviewPrepAdmin.type.behavioral') },
              ]}
              value={editTask.prepType ?? 'coding'}
              onChange={v => setEditTask((t: any) => ({ ...t, prepType: v }))}
            />
            <Select
              label={t('interviewPrepAdmin.form.language')}
              options={[
                { value: 'python3', label: 'Python 3' },
                { value: 'go', label: 'Go' },
                { value: 'javascript', label: 'JavaScript' },
                { value: 'typescript', label: 'TypeScript' },
                { value: 'sql', label: 'SQL' },
              ]}
              value={editTask.language ?? 'python3'}
              onChange={v => setEditTask((t: any) => ({ ...t, language: v }))}
            />
            <Input label={t('interviewPrepAdmin.form.company')} value={editTask.companyTag ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, companyTag: e.target.value }))} placeholder={t('interviewPrepAdmin.form.companyPlaceholder')} />
            <Input label={t('interviewPrepAdmin.form.duration')} type="number" value={editTask.durationSeconds ?? 2700} onChange={e => setEditTask((t: any) => ({ ...t, durationSeconds: parseInt(e.target.value) }))} />
            <div className="col-span-2">
              <Textarea label={t('interviewPrepAdmin.form.description')} value={editTask.statement ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, statement: e.target.value }))} rows={5} />
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={editTask.isActive ?? true} onChange={v => setEditTask((t: any) => ({ ...t, isActive: v }))} label={t('interviewPrepAdmin.active')} />
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={editTask.isExecutable ?? false} onChange={v => setEditTask((t: any) => ({ ...t, isExecutable: v }))} label={t('interviewPrepAdmin.executable')} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('interviewPrepAdmin.deleteTitle')}
        message={t('interviewPrepAdmin.deleteMessage')}
        confirmLabel={t('interviewPrepAdmin.delete')}
        danger
      />
    </div>
  )
}
