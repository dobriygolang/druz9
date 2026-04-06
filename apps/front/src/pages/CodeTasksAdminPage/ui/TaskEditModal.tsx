import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { Toggle } from '@/shared/ui/Toggle'
import {
  TASK_CATEGORIES,
  getCategoryFromTopics,
  setCategoryInTopics,
  getDisplayTopics,
} from '@/features/Admin/model/taskCategories'

const LANGUAGES = [
  { value: 'PROGRAMMING_LANGUAGE_PYTHON', label: 'Python' },
  { value: 'PROGRAMMING_LANGUAGE_JAVASCRIPT', label: 'JavaScript' },
  { value: 'PROGRAMMING_LANGUAGE_TYPESCRIPT', label: 'TypeScript' },
  { value: 'PROGRAMMING_LANGUAGE_GO', label: 'Go' },
  { value: 'PROGRAMMING_LANGUAGE_RUST', label: 'Rust' },
  { value: 'PROGRAMMING_LANGUAGE_CPP', label: 'C++' },
  { value: 'PROGRAMMING_LANGUAGE_JAVA', label: 'Java' },
  { value: 'PROGRAMMING_LANGUAGE_SQL', label: 'SQL' },
]

const DIFFICULTIES = [
  { value: 'TASK_DIFFICULTY_EASY', label: 'Easy' },
  { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' },
  { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' },
]

const TASK_TYPES = [
  { value: 'TASK_TYPE_ALGORITHM', label: 'Algorithm' },
  { value: 'TASK_TYPE_DEBUGGING', label: 'Debugging' },
  { value: 'TASK_TYPE_REFACTORING', label: 'Refactoring' },
]

const EXEC_PROFILES = [
  { value: 'EXECUTION_PROFILE_PURE', label: 'Pure (no I/O)' },
  { value: 'EXECUTION_PROFILE_FILE_IO', label: 'File I/O' },
  { value: 'EXECUTION_PROFILE_HTTP_CLIENT', label: 'HTTP Client' },
  { value: 'EXECUTION_PROFILE_INTERVIEW_REALISTIC', label: 'Interview Realistic' },
]

const RUNNER_MODES = [
  { value: 'RUNNER_MODE_PROGRAM', label: 'Program (stdin/stdout)' },
  { value: 'RUNNER_MODE_FUNCTION_IO', label: 'Function I/O (JSON args)' },
]

interface TestCase {
  id?: string
  input: string
  expected_output: string
  is_public: boolean
  weight: number
  order: number
}

interface TaskEditModalProps {
  open: boolean
  task: any
  saving: boolean
  onClose: () => void
  onSave: (task: any) => void
  onChange: (task: any) => void
}

export function TaskEditModal({ open, task, saving, onClose, onSave, onChange }: TaskEditModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  if (!task) return null

  const category = getCategoryFromTopics(task.topics)
  const displayTopics = getDisplayTopics(task.topics)

  const set = (key: string, value: any) => onChange({ ...task, [key]: value })

  const setCategory = (val: string) => {
    const newTopics = setCategoryInTopics(task.topics ?? [], val || null)
    onChange({ ...task, topics: newTopics })
  }

  const setDisplayTopics = (str: string) => {
    const userTopics = str.split(',').map(s => s.trim()).filter(Boolean)
    const catTopics = (task.topics ?? []).filter((t: string) => t.startsWith('category:'))
    onChange({ ...task, topics: [...userTopics, ...catTopics] })
  }

  const addTestCase = (isPublic: boolean) => {
    const field = isPublic ? 'public_test_cases' : 'hidden_test_cases'
    const cases = [...(task[field] ?? [])]
    cases.push({ input: '', expected_output: '', is_public: isPublic, weight: 1, order: cases.length })
    set(field, cases)
  }

  const updateTestCase = (isPublic: boolean, idx: number, patch: Partial<TestCase>) => {
    const field = isPublic ? 'public_test_cases' : 'hidden_test_cases'
    const cases = [...(task[field] ?? [])]
    cases[idx] = { ...cases[idx], ...patch }
    set(field, cases)
  }

  const removeTestCase = (isPublic: boolean, idx: number) => {
    const field = isPublic ? 'public_test_cases' : 'hidden_test_cases'
    const cases = [...(task[field] ?? [])]
    cases.splice(idx, 1)
    set(field, cases)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.id ? 'Редактировать задачу' : 'Новая задача'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Отмена</Button>
          <Button variant="orange" size="sm" onClick={() => onSave(task)} loading={saving}>Сохранить</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: Basic Info */}
        <section>
          <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wide mb-3">Основное</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Название" value={task.title ?? ''} onChange={e => set('title', e.target.value)} />
            <Input label="Slug" value={task.slug ?? ''} onChange={e => set('slug', e.target.value)} />
            <Select
              label="Категория"
              options={[{ value: '', label: 'Без категории' }, ...TASK_CATEGORIES.map(c => ({ value: c.value, label: c.label }))]}
              value={category ?? ''}
              onChange={setCategory}
            />
            <Select label="Сложность" options={DIFFICULTIES} value={task.difficulty ?? 'TASK_DIFFICULTY_MEDIUM'} onChange={v => set('difficulty', v)} />
            <Select label="Язык" options={LANGUAGES} value={task.language ?? 'PROGRAMMING_LANGUAGE_PYTHON'} onChange={v => set('language', v)} />
            <Select label="Тип задачи" options={TASK_TYPES} value={task.task_type ?? 'TASK_TYPE_ALGORITHM'} onChange={v => set('task_type', v)} />
            <Input label="Длительность (сек)" type="number" value={String(task.duration_seconds ?? 0)} onChange={e => set('duration_seconds', parseInt(e.target.value) || 0)} />
            <div className="flex items-end pb-1">
              <Toggle checked={task.is_active !== false} onChange={v => set('is_active', v)} label="Активна" />
            </div>
          </div>
        </section>

        {/* Section 2: Content */}
        <section>
          <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wide mb-3">Контент</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Условие задачи</label>
              <textarea
                value={task.statement ?? ''}
                onChange={e => set('statement', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm font-mono bg-[#F2F3F0] dark:bg-[#0f1117] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 text-[#111111] dark:text-[#e2e8f3] resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Стартовый код</label>
              <textarea
                value={task.starter_code ?? ''}
                onChange={e => set('starter_code', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm font-mono bg-[#F2F3F0] dark:bg-[#0f1117] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 text-[#111111] dark:text-[#e2e8f3] resize-y"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Topics */}
        <section>
          <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wide mb-3">Темы</h3>
          <Input
            label="Через запятую"
            value={displayTopics.join(', ')}
            onChange={e => setDisplayTopics(e.target.value)}
            placeholder="arrays, strings, dp, graphs..."
          />
        </section>

        {/* Section 4: Test Cases */}
        <section>
          <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wide mb-3">Тест-кейсы</h3>
          {(['public', 'hidden'] as const).map(type => {
            const isPublic = type === 'public'
            const field = isPublic ? 'public_test_cases' : 'hidden_test_cases'
            const cases: TestCase[] = task[field] ?? []
            return (
              <div key={type} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#475569]">{isPublic ? 'Public' : 'Hidden'} ({cases.length})</span>
                  <button
                    onClick={() => addTestCase(isPublic)}
                    className="flex items-center gap-1 text-xs text-[#6366F1] hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Добавить
                  </button>
                </div>
                {cases.length === 0 && (
                  <p className="text-xs text-[#94a3b8] italic">Нет тест-кейсов</p>
                )}
                <div className="flex flex-col gap-2">
                  {cases.map((tc, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_60px_60px_32px] gap-2 items-start p-2 bg-[#F2F3F0] dark:bg-[#0f1117] rounded-lg">
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Input</label>
                        <textarea
                          value={tc.input}
                          onChange={e => updateTestCase(isPublic, idx, { input: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-[#161c2d] border border-[#CBCCC9] dark:border-[#1e3158] rounded text-[#111111] dark:text-[#e2e8f3] resize-y"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Expected</label>
                        <textarea
                          value={tc.expected_output}
                          onChange={e => updateTestCase(isPublic, idx, { expected_output: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-[#161c2d] border border-[#CBCCC9] dark:border-[#1e3158] rounded text-[#111111] dark:text-[#e2e8f3] resize-y"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Weight</label>
                        <input
                          type="number"
                          value={tc.weight ?? 1}
                          onChange={e => updateTestCase(isPublic, idx, { weight: parseInt(e.target.value) || 1 })}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-[#161c2d] border border-[#CBCCC9] dark:border-[#1e3158] rounded text-[#111111] dark:text-[#e2e8f3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Order</label>
                        <input
                          type="number"
                          value={tc.order ?? idx}
                          onChange={e => updateTestCase(isPublic, idx, { order: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-[#161c2d] border border-[#CBCCC9] dark:border-[#1e3158] rounded text-[#111111] dark:text-[#e2e8f3]"
                        />
                      </div>
                      <button
                        onClick={() => removeTestCase(isPublic, idx)}
                        className="mt-4 w-7 h-7 flex items-center justify-center rounded hover:bg-[#fef2f2] dark:hover:bg-[#2a0f0f] text-[#94a3b8] hover:text-[#ef4444]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        {/* Section 5: Advanced (collapsed) */}
        <section>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#666666] uppercase tracking-wide hover:text-[#111111] dark:hover:text-[#e2e8f3] transition-colors"
          >
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Sandbox / Advanced
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Select label="Execution Profile" options={EXEC_PROFILES} value={task.execution_profile ?? 'EXECUTION_PROFILE_PURE'} onChange={v => set('execution_profile', v)} />
              <Select label="Runner Mode" options={RUNNER_MODES} value={task.runner_mode ?? 'RUNNER_MODE_PROGRAM'} onChange={v => set('runner_mode', v)} />
              <Input label="Fixture Files" value={(task.fixture_files ?? []).join(', ')} onChange={e => set('fixture_files', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="file1.txt, data.json" />
              <Input label="Readable Paths" value={(task.readable_paths ?? []).join(', ')} onChange={e => set('readable_paths', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <Input label="Writable Paths" value={(task.writable_paths ?? []).join(', ')} onChange={e => set('writable_paths', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <Input label="Allowed Hosts" value={(task.allowed_hosts ?? []).join(', ')} onChange={e => set('allowed_hosts', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <Input label="Allowed Ports" value={(task.allowed_ports ?? []).join(', ')} onChange={e => set('allowed_ports', e.target.value.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n)))} />
              <Input label="Mock Endpoints" value={(task.mock_endpoints ?? []).join(', ')} onChange={e => set('mock_endpoints', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <div className="flex items-end pb-1">
                <Toggle checked={task.writable_temp_dir ?? false} onChange={v => set('writable_temp_dir', v)} label="Writable Temp Dir" />
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
