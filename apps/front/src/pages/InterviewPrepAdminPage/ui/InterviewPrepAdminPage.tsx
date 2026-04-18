import { useEffect, useMemo, useState } from 'react'
import { Plus, Edit2, Trash2, Upload, Filter, AlertTriangle } from 'lucide-react'
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

// Example prompt shown in the admin editor — calibrated for an algo task.
// Admin should copy/paste and tweak per task.
const AI_PROMPT_EXAMPLE = `Ты senior-инженер, проводящий код-ревью решения задачи.

Оцени решение по шкале 0..100. Критерии (веса):
- корректность (50%): проходят ли очевидные тест-кейсы, есть ли краевые случаи (пустой вход, один элемент, все равные, отрицательные числа)
- сложность (25%): соответствует ли оптимальной (O(n log n) в данной задаче); штраф за O(n^2)
- читаемость (15%): имена, структура, комментарии
- идиоматичность языка (10%): использование стандартной библиотеки

Формат ответа (markdown):
## Оценка: <число>/100
## Что хорошо
<пунктами>
## Что улучшить
<пунктами>
## Лучшее решение
\`\`\`<lang>
<код>
\`\`\``

// Curated list of companies we actually have task tags for. Keep this
// short — unbounded freetext filters get messy fast.
const COMPANIES = ['', 'yandex', 'ozon', 'avito', 'vk', 'tinkoff', 'sber', 'google', 'amazon', 'meta']
const PREP_TYPES = ['', 'algorithm', 'coding', 'sql', 'system_design', 'code_review', 'behavioral']

interface AdminTask {
  id: string
  slug: string
  title: string
  statement: string
  prepType: string
  language: string
  companyTag: string
  supportedLanguages?: string[]
  isExecutable: boolean
  executionProfile?: string
  runnerMode?: string
  durationSeconds: number
  starterCode?: string
  referenceSolution?: string
  codeTaskId?: string
  isActive: boolean
  aiReviewPrompt: string
  isPracticeEnabled: boolean
  isMockEnabled: boolean
  poolCount: number
}

export function InterviewPrepAdminPage() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'pools' | 'presets'>('tasks')
  const [showEdit, setShowEdit] = useState(false)
  const [editTask, setEditTask] = useState<Partial<AdminTask> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showBulk, setShowBulk] = useState(false)

  // Filters
  const [fCompany, setFCompany] = useState('')
  const [fPrep, setFPrep] = useState('')
  const [fSearch, setFSearch] = useState('')
  const [fIncludeInactive, setFIncludeInactive] = useState(true)

  const [pools, setPools] = useState<Array<{ id?: string; title?: string; slug?: string; roundType?: string; [k: string]: unknown }>>([])
  const [presets, setPresets] = useState<Array<{ id?: string; title?: string; slug?: string; trackSlug?: string; [k: string]: unknown }>>([])
  const [poolsLoading, setPoolsLoading] = useState(false)
  const [presetsLoading, setPresetsLoading] = useState(false)

  const loadTasks = () => {
    setLoading(true)
    adminApi.listInterviewPrepTasks({
      companyTag: fCompany,
      prepType: fPrep,
      search: fSearch,
      includeInactive: fIncludeInactive,
    })
      .then((ts) => setTasks(ts as AdminTask[]))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [fCompany, fPrep, fIncludeInactive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'pools' && pools.length === 0 && !poolsLoading) {
      setPoolsLoading(true)
      adminApi.listMockQuestionPools().then((items) => setPools(items as typeof pools)).catch(() => {}).finally(() => setPoolsLoading(false))
    }
    if (activeTab === 'presets' && presets.length === 0 && !presetsLoading) {
      setPresetsLoading(true)
      adminApi.listCompanyPresets().then((items) => setPresets(items as typeof presets)).catch(() => {}).finally(() => setPresetsLoading(false))
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

  // Count tasks per company tag for the filter chips so admin sees at a
  // glance how many Ozon/Yandex/etc tasks exist — even before filtering.
  const tasksByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      const k = (t.companyTag ?? '').trim() || 'general'
      map[k] = (map[k] ?? 0) + 1
    }
    return map
  }, [tasks])

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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBulk(true)}>
            <Upload className="w-4 h-4" /> Bulk paste
          </Button>
          <Button variant="orange" onClick={() => { setEditTask({ isActive: true, isPracticeEnabled: true, isMockEnabled: true, aiReviewPrompt: AI_PROMPT_EXAMPLE, durationSeconds: 2700, prepType: 'algorithm', language: 'python3' }); setShowEdit(true) }}>
            <Plus className="w-4 h-4" /> {t('interviewPrepAdmin.addTask')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#C1CFC4] mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'tasks' | 'pools' | 'presets')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-[#059669] text-[#0B1210]' : 'border-transparent text-[#4B6B52] hover:text-[#0B1210]'}`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-[#F0F5F1] text-[#4B6B52] rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Filter className="w-4 h-4 text-[#4B6B52]" />
            <select value={fCompany} onChange={(e) => setFCompany(e.target.value)} className="border border-[#C1CFC4] rounded px-2 py-1 text-sm">
              {COMPANIES.map((c) => <option key={c || 'all'} value={c}>{c ? `${c} (${tasksByCompany[c] ?? '?'})` : 'All companies'}</option>)}
            </select>
            <select value={fPrep} onChange={(e) => setFPrep(e.target.value)} className="border border-[#C1CFC4] rounded px-2 py-1 text-sm">
              {PREP_TYPES.map((p) => <option key={p || 'any'} value={p}>{p || 'Any type'}</option>)}
            </select>
            <input
              value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadTasks() }}
              placeholder="search title / slug / statement"
              className="border border-[#C1CFC4] rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
            />
            <Button variant="secondary" size="sm" onClick={loadTasks}>Search</Button>
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={fIncludeInactive} onChange={(e) => setFIncludeInactive(e.target.checked)} />
              include inactive
            </label>
          </div>

          <div className="bg-white rounded-xl border border-[#C1CFC4] overflow-hidden">
            <div className="divide-y divide-[#F0F5F1]">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F5F1]" />
                  <div className="flex-1 h-4 bg-[#F0F5F1] rounded" />
                  <div className="w-20 h-4 bg-[#F0F5F1] rounded" />
                </div>
              )) : tasks.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-[#94a3b8]">
                  No tasks match these filters. Clear filters or create a new task.
                </div>
              ) : tasks.map((task, i) => (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F0F5F1]">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F5F1] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono text-[#4B6B52]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0B1210] truncate">{task.title}</p>
                    <p className="text-xs text-[#4B6B52] truncate">
                      <span className="font-mono">{task.slug}</span> · {task.companyTag || 'general'} · {Math.round((task.durationSeconds ?? 0) / 60)}m
                    </p>
                  </div>
                  <Badge variant={task.prepType === 'coding' ? 'indigo' : task.prepType === 'system_design' ? 'orange' : 'success'}>
                    {PREP_TYPE_LABELS[task.prepType] ?? task.prepType}
                  </Badge>
                  {/* Debug badges — surface why a task might be invisible */}
                  {!task.isActive && <Badge variant="default">inactive</Badge>}
                  {!task.isPracticeEnabled && <span title="Hidden from /interview practice list"><Badge variant="default">no practice</Badge></span>}
                  {!task.isMockEnabled && <span title="Won't be picked for mock sessions"><Badge variant="default">no mock</Badge></span>}
                  {task.poolCount === 0 && (
                    <span title="Not in any pool — mock sessions can't pick it!">
                      <Badge variant="default">
                        <AlertTriangle className="w-3 h-3 inline" /> 0 pools
                      </Badge>
                    </span>
                  )}
                  {task.aiReviewPrompt ? (
                    <span title="Task has a custom AI-review prompt"><Badge variant="success">AI✓</Badge></span>
                  ) : (
                    <span title="Using platform-default AI-review prompt"><Badge variant="default">AI default</Badge></span>
                  )}
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
        </>
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
            <Input label={t('interviewPrepAdmin.form.title')} value={editTask.title ?? ''} onChange={e => setEditTask((s) => ({ ...s, title: e.target.value }))} />
            <Input label={t('interviewPrepAdmin.form.slug')} value={editTask.slug ?? ''} onChange={e => setEditTask((s) => ({ ...s, slug: e.target.value }))} />
            <Select
              label={t('interviewPrepAdmin.form.type')}
              options={[
                { value: 'algorithm', label: 'Algorithm' },
                { value: 'coding', label: t('interviewPrepAdmin.type.coding') },
                { value: 'sql', label: 'SQL' },
                { value: 'system_design', label: t('interviewPrepAdmin.type.systemDesign') },
                { value: 'code_review', label: t('interviewPrepAdmin.type.codeReview') },
                { value: 'behavioral', label: t('interviewPrepAdmin.type.behavioral') },
              ]}
              value={editTask.prepType ?? 'algorithm'}
              onChange={v => setEditTask((s) => ({ ...s, prepType: v }))}
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
              onChange={v => setEditTask((s) => ({ ...s, language: v }))}
            />
            <Select
              label="Company"
              options={COMPANIES.map((c) => ({ value: c, label: c || 'general' }))}
              value={editTask.companyTag ?? ''}
              onChange={v => setEditTask((s) => ({ ...s, companyTag: v }))}
            />
            <Input label={t('interviewPrepAdmin.form.duration')} type="number" value={editTask.durationSeconds ?? 2700} onChange={e => setEditTask((s) => ({ ...s, durationSeconds: parseInt(e.target.value) }))} />
            <div className="col-span-2">
              <Textarea label={t('interviewPrepAdmin.form.description')} value={editTask.statement ?? ''} onChange={e => setEditTask((s) => ({ ...s, statement: e.target.value }))} rows={5} />
            </div>
            <div className="col-span-2">
              <Textarea
                label="AI review prompt (sent to the model alongside the candidate's solution)"
                value={editTask.aiReviewPrompt ?? ''}
                onChange={e => setEditTask((s) => ({ ...s, aiReviewPrompt: e.target.value }))}
                rows={10}
                placeholder={AI_PROMPT_EXAMPLE}
              />
              <div className="text-[11px] text-[#4B6B52] mt-1">
                Leave empty to use the platform-default prompt. Fill in a task-specific rubric (complexity target, edge cases, grading axes) for better AI grading.{' '}
                <button
                  type="button"
                  className="text-[#059669] underline"
                  onClick={() => setEditTask((s) => ({ ...s, aiReviewPrompt: AI_PROMPT_EXAMPLE }))}
                >
                  insert example
                </button>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-6 flex-wrap">
              <Toggle checked={editTask.isActive ?? true} onChange={v => setEditTask((s) => ({ ...s, isActive: v }))} label="Active" />
              <Toggle checked={editTask.isPracticeEnabled ?? true} onChange={v => setEditTask((s) => ({ ...s, isPracticeEnabled: v }))} label="Practice enabled" />
              <Toggle checked={editTask.isMockEnabled ?? true} onChange={v => setEditTask((s) => ({ ...s, isMockEnabled: v }))} label="Mock enabled" />
              <Toggle checked={editTask.isExecutable ?? false} onChange={v => setEditTask((s) => ({ ...s, isExecutable: v }))} label="Executable" />
            </div>
          </div>
        )}
      </Modal>

      {showBulk && <BulkImportModal onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); loadTasks() }} />}

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

// ── Bulk import modal ─────────────────────────────────────────────────

const BULK_EXAMPLE = JSON.stringify([
  {
    slug: 'two-sum-ozon',
    title: 'Two Sum (Ozon screen)',
    statement: 'Given an array and a target, return indices of two numbers that add up to target.',
    prepType: 'algorithm',
    language: 'python3',
    companyTag: 'ozon',
    durationSeconds: 1800,
    isExecutable: true,
    isActive: true,
    isPracticeEnabled: true,
    isMockEnabled: true,
    aiReviewPrompt: 'Проверь корректность, сложность должна быть O(n). Штраф за O(n^2).',
  },
  {
    slug: 'lru-ozon',
    title: 'LRU cache (Ozon onsite)',
    statement: 'Implement LRU cache with get/put in O(1).',
    prepType: 'algorithm',
    language: 'python3',
    companyTag: 'ozon',
    durationSeconds: 2700,
    isExecutable: true,
    isActive: true,
    isPracticeEnabled: true,
    isMockEnabled: true,
    aiReviewPrompt: '',
  },
], null, 2)

function BulkImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [raw, setRaw] = useState(BULK_EXAMPLE)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; failed: number; rows: Array<{ slug: string; taskId: string; errorCode: string; errorMsg: string }> } | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of task payloads')
      const r = await adminApi.bulkCreateInterviewPrepTasks(parsed)
      setResult({ created: r.created, failed: r.failed, rows: r.results })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse / request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Bulk paste tasks" size="lg" footer={
      <>
        <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        {!result && <Button variant="orange" size="sm" onClick={submit} loading={busy}>Import</Button>}
        {result && <Button variant="orange" size="sm" onClick={onDone}>Done</Button>}
      </>
    }>
      <div className="text-xs text-[#4B6B52] mb-2">
        Paste a JSON array of task payloads. Each row has the same fields as the Add form.
        Missing optional fields use server defaults. Per-row errors won't abort the batch.
      </div>
      {!result && (
        <>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="w-full font-mono text-xs border border-[#C1CFC4] rounded p-2"
            rows={18}
            spellCheck={false}
          />
          {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
        </>
      )}
      {result && (
        <div className="text-sm">
          <div className="mb-2">
            Created <b className="text-green-600">{result.created}</b>, failed <b className="text-red-500">{result.failed}</b>.
          </div>
          <div className="max-h-80 overflow-auto border border-[#C1CFC4] rounded divide-y divide-[#F0F5F1]">
            {result.rows.map((r, idx) => (
              <div key={idx} className="px-3 py-2 text-xs flex items-center gap-2">
                {r.errorCode ? (
                  <Badge variant="default">✗</Badge>
                ) : (
                  <Badge variant="success">✓</Badge>
                )}
                <span className="font-mono">{r.slug || '(no slug)'}</span>
                {r.errorMsg && <span className="text-red-500">{r.errorMsg}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
