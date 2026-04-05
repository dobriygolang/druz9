import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'

const DIFF_LABELS: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'Easy', TASK_DIFFICULTY_MEDIUM: 'Medium', TASK_DIFFICULTY_HARD: 'Hard',
}
const DIFF_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  TASK_DIFFICULTY_EASY: 'success', TASK_DIFFICULTY_MEDIUM: 'warning', TASK_DIFFICULTY_HARD: 'danger',
}

export function CodeTasksAdminPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    adminApi.listCodeTasks({ topic: topic || undefined, difficulty: difficulty || undefined })
      .then((ts: any[]) => setTasks(ts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [topic, difficulty])

  const filtered = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()))

  const handleSave = async () => {
    if (!editTask) return
    setSaving(true)
    try {
      if (editTask.id) {
        await adminApi.updateCodeTask(editTask.id, editTask)
      } else {
        await adminApi.createCodeTask(editTask)
      }
      const updated = await adminApi.listCodeTasks({})
      setTasks(updated as any[])
      setShowEdit(false)
      setEditTask(null)
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await adminApi.deleteCodeTask(deleteId)
      setTasks(prev => prev.filter(t => t.id !== deleteId))
      setDeleteId(null)
    } catch {} finally { setDeleting(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Code Tasks</h1>
          <p className="text-sm text-[#64748b] mt-0.5">{tasks.length} задач</p>
        </div>
        <Button variant="orange" onClick={() => { setEditTask({}); setShowEdit(true) }}>
          <Plus className="w-4 h-4" /> Добавить задачу
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg focus:outline-none"
          />
        </div>
        <Select
          options={[{ value: '', label: 'Все темы' }, { value: 'arrays', label: 'Arrays' }, { value: 'graphs', label: 'Graphs' }, { value: 'dp', label: 'Dynamic Programming' }]}
          value={topic} onChange={setTopic} className="w-40"
        />
        <Select
          options={[{ value: '', label: 'Все' }, { value: 'TASK_DIFFICULTY_EASY', label: 'Easy' }, { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' }, { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' }]}
          value={difficulty} onChange={setDifficulty} className="w-32"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_120px_100px_80px_80px] items-center px-6 py-3 border-b border-[#e2e8f0] text-xs font-semibold text-[#64748b] uppercase tracking-wide">
          <span className="w-8 text-right">#</span>
          <span className="ml-4">Название</span>
          <span>Тема</span>
          <span>Сложность</span>
          <span className="text-center">Статус</span>
          <span />
        </div>
        <div className="divide-y divide-[#f8fafc]">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-3.5 grid grid-cols-[auto_1fr_120px_100px_80px_80px] items-center gap-4 animate-pulse">
              <div className="w-8 h-3 bg-[#f1f5f9] rounded" />
              <div className="h-3 bg-[#f1f5f9] rounded ml-4" />
              <div className="h-3 bg-[#f1f5f9] rounded" />
              <div className="h-3 bg-[#f1f5f9] rounded" />
              <div className="h-3 bg-[#f1f5f9] rounded" />
            </div>
          )) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#94a3b8]">Задачи не найдены</div>
          ) : filtered.map((task, i) => (
            <div key={task.id} className="grid grid-cols-[auto_1fr_120px_100px_80px_80px] items-center px-6 py-3.5 hover:bg-[#fafafa]">
              <span className="w-8 text-right text-sm text-[#94a3b8] font-mono">{i + 1}</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#0f172a]">{task.title}</p>
                {task.slug && <p className="text-xs text-[#94a3b8] font-mono">{task.slug}</p>}
              </div>
              <p className="text-xs text-[#64748b]">{task.topics?.slice(0,2).join(', ') ?? ''}</p>
              <div>
                {task.difficulty && task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                  <Badge variant={DIFF_VARIANTS[task.difficulty] ?? 'default'}>
                    {DIFF_LABELS[task.difficulty] ?? task.difficulty}
                  </Badge>
                )}
              </div>
              <div className="flex justify-center">
                <Badge variant={task.is_active !== false ? 'success' : 'default'}>
                  {task.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => { setEditTask(task); setShowEdit(true) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] text-[#64748b]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(task.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#fef2f2] text-[#94a3b8] hover:text-[#ef4444]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 mt-2 text-xs text-[#64748b]">
        <span>{filtered.length} задач</span>
      </div>

      {/* Edit modal */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTask(null) }}
        title={editTask?.id ? 'Редактировать задачу' : 'Новая задача'}
        subtitle={editTask?.slug ? `${editTask.title ?? ''} · ${editTask.topics?.join(', ') ?? ''}` : undefined}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowEdit(false); setEditTask(null) }}>Отмена</Button>
            <Button variant="orange" size="sm" onClick={handleSave} loading={saving}>Сохранить</Button>
          </>
        }
      >
        {editTask && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Название" value={editTask.title ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, title: e.target.value }))} />
            <Input label="Slug" value={editTask.slug ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, slug: e.target.value }))} />
            <Select
              label="Сложность"
              options={[{ value: 'TASK_DIFFICULTY_EASY', label: 'Easy' }, { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' }, { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' }]}
              value={editTask.difficulty ?? 'TASK_DIFFICULTY_MEDIUM'}
              onChange={v => setEditTask((t: any) => ({ ...t, difficulty: v }))}
            />
            <Select
              label="Язык"
              options={[{ value: 'PROGRAMMING_LANGUAGE_PYTHON', label: 'Python' }, { value: 'PROGRAMMING_LANGUAGE_GO', label: 'Go' }, { value: 'PROGRAMMING_LANGUAGE_JAVASCRIPT', label: 'JavaScript' }]}
              value={editTask.language ?? 'PROGRAMMING_LANGUAGE_PYTHON'}
              onChange={v => setEditTask((t: any) => ({ ...t, language: v }))}
            />
            <div className="col-span-2">
              <Input label="Темы (через запятую)" value={editTask.topics?.join(', ') ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, topics: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить задачу"
        message="Это действие нельзя отменить. Задача будет удалена безвозвратно."
        confirmLabel="Удалить"
        danger
        loading={deleting}
      />
    </div>
  )
}
