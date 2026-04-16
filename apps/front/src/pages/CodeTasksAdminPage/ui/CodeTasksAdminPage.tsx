import { useEffect, useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Select'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import { TaskEditModal } from './TaskEditModal'
import {
  TASK_CATEGORIES,
  getCategoryFromTopics,
  getDisplayTopics,
  CATEGORY_LABELS,
} from '@/features/Admin/model/taskCategories'
import { DIFF_LABELS, DIFF_VARIANTS } from '@/shared/lib/taskLabels'

const LANG_LABELS: Record<string, string> = {
  PROGRAMMING_LANGUAGE_PYTHON: 'Python', PROGRAMMING_LANGUAGE_JAVASCRIPT: 'JS',
  PROGRAMMING_LANGUAGE_TYPESCRIPT: 'TS', PROGRAMMING_LANGUAGE_GO: 'Go',
  PROGRAMMING_LANGUAGE_RUST: 'Rust', PROGRAMMING_LANGUAGE_CPP: 'C++',
  PROGRAMMING_LANGUAGE_JAVA: 'Java', PROGRAMMING_LANGUAGE_SQL: 'SQL',
}

const PAGE_SIZE = 20

export function CodeTasksAdminPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showEdit, setShowEdit] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    adminApi.listCodeTasks({ topic: topicFilter || undefined, difficulty: difficultyFilter || undefined })
      .then((ts: any[]) => setTasks(ts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [topicFilter, difficultyFilter])

  // Extract unique topics from data (excluding category: tags)
  const allTopics = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => getDisplayTopics(t.topics).forEach(topic => set.add(topic)))
    return Array.from(set).sort()
  }, [tasks])

  // Client-side filtering
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter) {
        const cat = getCategoryFromTopics(t.topics)
        if (categoryFilter === '__none__') { if (cat) return false }
        else if (cat !== categoryFilter) return false
      }
      return true
    })
  }, [tasks, search, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, categoryFilter, topicFilter, difficultyFilter])

  const handleSave = async (task: any) => {
    setSaving(true)
    try {
      if (task.id) {
        await adminApi.updateCodeTask(task.id, task)
      } else {
        await adminApi.createCodeTask(task)
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
          <h1 className="text-xl font-bold text-[#0B1210]">Code Tasks</h1>
          <p className="text-sm text-[#4B6B52] mt-0.5">{tasks.length} tasks</p>
        </div>
        <Button variant="orange" onClick={() => { setEditTask({}); setShowEdit(true) }}>
          <Plus className="w-4 h-4" /> Add task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F0F5F1] dark:bg-[#0B1210] border border-[#C1CFC4] dark:border-[#1E4035] rounded-lg focus:outline-none text-[#111111] dark:text-[#E2F0E8]"
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All categories' },
            ...TASK_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
            { value: '__none__', label: 'No category' },
          ]}
          value={categoryFilter} onChange={setCategoryFilter} className="w-44"
        />
        <Select
          options={[{ value: '', label: 'All topics' }, ...allTopics.map(t => ({ value: t, label: t }))]}
          value={topicFilter} onChange={setTopicFilter} className="w-40"
        />
        <Select
          options={[{ value: '', label: 'All' }, { value: 'TASK_DIFFICULTY_EASY', label: 'Easy' }, { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' }, { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' }]}
          value={difficultyFilter} onChange={setDifficultyFilter} className="w-32"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#132420] rounded-xl border border-[#C1CFC4] dark:border-[#1E4035] overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_110px_100px_80px_70px_70px_80px] items-center px-5 py-2.5 border-b border-[#C1CFC4] dark:border-[#1E4035] text-[10px] font-semibold text-[#4B6B52] dark:text-[#4A7058] uppercase tracking-wide">
          <span>#</span>
          <span>Title</span>
          <span>Category</span>
          <span>Topics</span>
          <span>Difficulty</span>
          <span>Language</span>
          <span>Status</span>
          <span />
        </div>
        <div className="divide-y divide-[#F0F5F1] dark:divide-[#1E4035]">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 grid grid-cols-[40px_1fr_110px_100px_80px_70px_70px_80px] items-center animate-pulse">
              <div className="w-5 h-3 bg-[#F0F5F1] dark:bg-[#162E24] rounded" />
              <div className="h-3 bg-[#F0F5F1] dark:bg-[#162E24] rounded mr-4" />
              <div className="h-3 bg-[#F0F5F1] dark:bg-[#162E24] rounded" />
              <div className="h-3 bg-[#F0F5F1] dark:bg-[#162E24] rounded" />
              <div className="h-3 bg-[#F0F5F1] dark:bg-[#162E24] rounded" />
            </div>
          )) : paginated.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#94a3b8] dark:text-[#4A7058]">No tasks found</div>
          ) : paginated.map((task, i) => {
            const cat = getCategoryFromTopics(task.topics)
            const topics = getDisplayTopics(task.topics)
            return (
              <div key={task.id} className="grid grid-cols-[40px_1fr_110px_100px_80px_70px_70px_80px] items-center px-5 py-3 hover:bg-[#F0F5F1] transition-colors">
                <span className="text-xs text-[#94a3b8] font-mono">{page * PAGE_SIZE + i + 1}</span>
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-medium text-[#0B1210] truncate">{task.title}</p>
                  {task.slug && <p className="text-[10px] text-[#94a3b8] font-mono truncate">{task.slug}</p>}
                </div>
                <div>
                  {cat ? (
                    <Badge variant={cat === 'mock' ? 'indigo' : 'orange'}>{CATEGORY_LABELS[cat]}</Badge>
                  ) : (
                    <span className="text-[10px] text-[#94a3b8]">-</span>
                  )}
                </div>
                <p className="text-[10px] text-[#4B6B52] truncate">{topics.slice(0, 2).join(', ')}</p>
                <div>
                  {task.difficulty && task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                    <Badge variant={DIFF_VARIANTS[task.difficulty] ?? 'default'}>
                      {DIFF_LABELS[task.difficulty] ?? task.difficulty}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-[#4B6B52]">{LANG_LABELS[task.language] ?? ''}</span>
                <Badge variant={task.isActive !== false ? 'success' : 'default'}>
                  {task.isActive !== false ? 'On' : 'Off'}
                </Badge>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => { setEditTask({ ...task }); setShowEdit(true) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0F5F1] text-[#4B6B52]"
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
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-3 mt-1 text-xs text-[#4B6B52] dark:text-[#4A7058]">
        <span>{filtered.length} tasks</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-[#F0F5F1] disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-[#F0F5F1] disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <TaskEditModal
        open={showEdit}
        task={editTask}
        saving={saving}
        onClose={() => { setShowEdit(false); setEditTask(null) }}
        onSave={handleSave}
        onChange={setEditTask}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete task"
        message="This action cannot be undone. The task will be deleted permanently."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  )
}
