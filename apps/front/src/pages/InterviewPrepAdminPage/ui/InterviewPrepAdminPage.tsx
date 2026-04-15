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

export function InterviewPrepAdminPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'pools' | 'presets'>('tasks')
  const [showEdit, setShowEdit] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadTasks = () => {
    adminApi.listInterviewPrepTasks()
      .then((ts: any[]) => setTasks(ts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [])

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
    { id: 'tasks', label: 'Tasks', count: tasks.length },
    { id: 'pools', label: 'Question Pools' },
    { id: 'presets', label: 'Company Presets' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Interview Prep</h1>
          <p className="text-sm text-[#666666] mt-0.5">Управление задачами и шаблонами</p>
        </div>
        <Button variant="orange" onClick={() => { setEditTask({}); setShowEdit(true) }}>
          <Plus className="w-4 h-4" /> Добавить задачу
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#CBCCC9] mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-[#6366F1] text-[#0f172a]' : 'border-transparent text-[#666666] hover:text-[#0f172a]'}`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-[#F2F3F0] text-[#666666] rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-[#CBCCC9] overflow-hidden">
          <div className="divide-y divide-[#F2F3F0]">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-[#F2F3F0]" />
                <div className="flex-1 h-4 bg-[#F2F3F0] rounded" />
                <div className="w-20 h-4 bg-[#F2F3F0] rounded" />
              </div>
            )) : tasks.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#94a3b8]">Задач не найдено</div>
            ) : tasks.map((task, i) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F2F3F0]">
                <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-mono text-[#666666]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0f172a] truncate">{task.title}</p>
                  <p className="text-xs text-[#666666]">{task.companyTag ?? 'General'} · {Math.round((task.durationSeconds ?? 0) / 60)} мин</p>
                </div>
                <Badge variant={task.prepType === 'coding' ? 'indigo' : task.prepType === 'system_design' ? 'orange' : 'success'}>
                  {PREP_TYPE_LABELS[task.prepType] ?? task.prepType}
                </Badge>
                <Badge variant={task.isActive !== false ? 'success' : 'default'}>
                  {task.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTask(task); setShowEdit(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
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
        <div className="bg-white rounded-xl border border-[#CBCCC9] p-8 text-center text-[#94a3b8] text-sm">
          Управление пулами вопросов — скоро
        </div>
      )}

      {activeTab === 'presets' && (
        <div className="bg-white rounded-xl border border-[#CBCCC9] p-8 text-center text-[#94a3b8] text-sm">
          Управление пресетами компаний — скоро
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTask(null) }}
        title={editTask?.id ? 'Редактировать задачу' : 'Новая задача'}
        size="lg"
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
              label="Тип"
              options={[
                { value: 'coding', label: 'Coding' },
                { value: 'algorithm', label: 'Algorithm' },
                { value: 'sql', label: 'SQL' },
                { value: 'system_design', label: 'System Design' },
                { value: 'code_review', label: 'Code Review' },
                { value: 'behavioral', label: 'Behavioral' },
              ]}
              value={editTask.prepType ?? 'coding'}
              onChange={v => setEditTask((t: any) => ({ ...t, prepType: v }))}
            />
            <Select
              label="Язык"
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
            <Input label="Компания" value={editTask.companyTag ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, companyTag: e.target.value }))} placeholder="google, yandex, ..." />
            <Input label="Длительность (сек)" type="number" value={editTask.durationSeconds ?? 2700} onChange={e => setEditTask((t: any) => ({ ...t, durationSeconds: parseInt(e.target.value) }))} />
            <div className="col-span-2">
              <Textarea label="Описание задачи" value={editTask.statement ?? ''} onChange={e => setEditTask((t: any) => ({ ...t, statement: e.target.value }))} rows={5} />
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={editTask.isActive ?? true} onChange={v => setEditTask((t: any) => ({ ...t, isActive: v }))} label="Активна" />
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={editTask.isExecutable ?? false} onChange={v => setEditTask((t: any) => ({ ...t, isExecutable: v }))} label="Исполняемая" />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить задачу"
        message="Это действие нельзя отменить."
        confirmLabel="Удалить"
        danger
      />
    </div>
  )
}
