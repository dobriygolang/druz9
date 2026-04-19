import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { Toggle } from '@/shared/ui/Toggle'
import {
  TASK_CATEGORIES,
  getCategoriesFromTopics,
  toggleCategoryInTopics,
  getDisplayTopics,
  type TaskCategory,
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
  expectedOutput: string
  isPublic: boolean
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

  const categories = getCategoriesFromTopics(task.topics)
  const displayTopics = getDisplayTopics(task.topics)

  const set = (key: string, value: any) => onChange({ ...task, [key]: value })

  const toggleCategory = (cat: TaskCategory) => {
    const newTopics = toggleCategoryInTopics(task.topics ?? [], cat)
    onChange({ ...task, topics: newTopics })
  }

  const setDisplayTopics = (str: string) => {
    const userTopics = str.split(',').map(s => s.trim()).filter(Boolean)
    const catTopics = (task.topics ?? []).filter((t: string) => t.startsWith('category:'))
    onChange({ ...task, topics: [...userTopics, ...catTopics] })
  }

  const addTestCase = (isPublic: boolean) => {
    const field = isPublic ? 'publicTestCases' : 'hiddenTestCases'
    const cases = [...(task[field] ?? [])]
    cases.push({ input: '', expectedOutput: '', isPublic: isPublic, weight: 1, order: cases.length })
    set(field, cases)
  }

  const updateTestCase = (isPublic: boolean, idx: number, patch: Partial<TestCase>) => {
    const field = isPublic ? 'publicTestCases' : 'hiddenTestCases'
    const cases = [...(task[field] ?? [])]
    cases[idx] = { ...cases[idx], ...patch }
    set(field, cases)
  }

  const removeTestCase = (isPublic: boolean, idx: number) => {
    const field = isPublic ? 'publicTestCases' : 'hiddenTestCases'
    const cases = [...(task[field] ?? [])]
    cases.splice(idx, 1)
    set(field, cases)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.id ? 'Edit task' : 'New task'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="orange" size="sm" onClick={() => onSave(task)} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: Basic Info */}
        <section>
          <h3 className="text-xs font-semibold text-[#4B6B52] uppercase tracking-wide mb-3">Basics</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title" value={task.title ?? ''} onChange={e => set('title', e.target.value)} />
            <Input label="Slug" value={task.slug ?? ''} onChange={e => set('slug', e.target.value)} />
            <div>
              <p className="text-xs text-[#4B6B52] font-medium mb-1.5">Category</p>
              <div className="flex flex-col gap-1.5">
                {TASK_CATEGORIES.map(c => (
                  <label key={c.value} className="flex items-center gap-2 cursor-pointer text-sm text-[#0B1210]">
                    <input
                      type="checkbox"
                      checked={categories.includes(c.value)}
                      onChange={() => toggleCategory(c.value)}
                      className="accent-[#059669] w-4 h-4"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <Select label="Difficulty" options={DIFFICULTIES} value={task.difficulty ?? 'TASK_DIFFICULTY_MEDIUM'} onChange={v => set('difficulty', v)} />
            <Select label="Language" options={LANGUAGES} value={task.language ?? 'PROGRAMMING_LANGUAGE_PYTHON'} onChange={v => set('language', v)} />
            <Select label="Task type" options={TASK_TYPES} value={task.taskType ?? 'TASK_TYPE_ALGORITHM'} onChange={v => set('taskType', v)} />
            <Input label="Duration (sec)" type="number" value={String(task.durationSeconds ?? 0)} onChange={e => set('durationSeconds', parseInt(e.target.value) || 0)} />
            <div className="flex items-end pb-1">
              <Toggle checked={task.isActive !== false} onChange={v => set('isActive', v)} label="Active" />
            </div>
          </div>
        </section>

        {/* Section 2: Content */}
        <section>
          <h3 className="text-xs font-semibold text-[#4B6B52] uppercase tracking-wide mb-3">Content</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4B6B52] mb-1">Task statement</label>
              <textarea
                value={task.statement ?? ''}
                onChange={e => set('statement', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm font-mono bg-[#F0F5F1] dark:bg-[#0B1210] border border-[#C1CFC4] dark:border-[#1E4035] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669]/30 text-[#111111] dark:text-[#E2F0E8] resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4B6B52] mb-1">Starter code</label>
              <textarea
                value={task.starterCode ?? ''}
                onChange={e => set('starterCode', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm font-mono bg-[#F0F5F1] dark:bg-[#0B1210] border border-[#C1CFC4] dark:border-[#1E4035] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669]/30 text-[#111111] dark:text-[#E2F0E8] resize-y"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Topics */}
        <section>
          <h3 className="text-xs font-semibold text-[#4B6B52] uppercase tracking-wide mb-3">Topics</h3>
          <Input
            label="Comma-separated"
            value={displayTopics.join(', ')}
            onChange={e => setDisplayTopics(e.target.value)}
            placeholder="arrays, strings, dp, graphs..."
          />
        </section>

        {/* Section 4: Test Cases */}
        <section>
          <h3 className="text-xs font-semibold text-[#4B6B52] uppercase tracking-wide mb-3">Test cases</h3>
          {(['public', 'hidden'] as const).map(type => {
            const isPublic = type === 'public'
            const field = isPublic ? 'publicTestCases' : 'hiddenTestCases'
            const cases: TestCase[] = task[field] ?? []
            return (
              <div key={type} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#4B6B52]">{isPublic ? 'Public' : 'Hidden'} ({cases.length})</span>
                  <button
                    onClick={() => addTestCase(isPublic)}
                    className="flex items-center gap-1 text-xs text-[#059669] hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {cases.length === 0 && (
                  <p className="text-xs text-[#94a3b8] italic">No test cases</p>
                )}
                <div className="flex flex-col gap-2">
                  {cases.map((tc, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_60px_60px_32px] gap-2 items-start p-2 bg-[#F0F5F1] dark:bg-[#0B1210] rounded-lg">
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Input</label>
                        <textarea
                          value={tc.input}
                          onChange={e => updateTestCase(isPublic, idx, { input: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-[#132420] border border-[#C1CFC4] dark:border-[#1E4035] rounded text-[#111111] dark:text-[#E2F0E8] resize-y"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Expected</label>
                        <textarea
                          value={tc.expectedOutput}
                          onChange={e => updateTestCase(isPublic, idx, { expectedOutput: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-[#132420] border border-[#C1CFC4] dark:border-[#1E4035] rounded text-[#111111] dark:text-[#E2F0E8] resize-y"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Weight</label>
                        <input
                          type="number"
                          value={tc.weight ?? 1}
                          onChange={e => updateTestCase(isPublic, idx, { weight: parseInt(e.target.value) || 1 })}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-[#132420] border border-[#C1CFC4] dark:border-[#1E4035] rounded text-[#111111] dark:text-[#E2F0E8]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-0.5">Order</label>
                        <input
                          type="number"
                          value={tc.order ?? idx}
                          onChange={e => updateTestCase(isPublic, idx, { order: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-[#132420] border border-[#C1CFC4] dark:border-[#1E4035] rounded text-[#111111] dark:text-[#E2F0E8]"
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
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4B6B52] uppercase tracking-wide hover:text-[#111111] dark:hover:text-[#e2e8f3] transition-colors"
          >
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Sandbox / Advanced
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Select label="Execution Profile" options={EXEC_PROFILES} value={task.executionProfile ?? 'EXECUTION_PROFILE_PURE'} onChange={v => set('executionProfile', v)} />
              <Select label="Runner Mode" options={RUNNER_MODES} value={task.runnerMode ?? 'RUNNER_MODE_PROGRAM'} onChange={v => set('runnerMode', v)} />
              <Input label="Fixture Files" value={(task.fixtureFiles ?? []).join(', ')} onChange={e => set('fixtureFiles', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="file1.txt, data.json" />
              <Input label="Readable Paths" value={(task.readablePaths ?? []).join(', ')} onChange={e => set('readablePaths', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <Input label="Writable Paths" value={(task.writablePaths ?? []).join(', ')} onChange={e => set('writablePaths', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <Input label="Allowed Hosts" value={(task.allowedHosts ?? []).join(', ')} onChange={e => set('allowedHosts', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <Input label="Allowed Ports" value={(task.allowedPorts ?? []).join(', ')} onChange={e => set('allowedPorts', e.target.value.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n)))} />
              <Input label="Mock Endpoints" value={(task.mockEndpoints ?? []).join(', ')} onChange={e => set('mockEndpoints', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              <div className="flex items-end pb-1">
                <Toggle checked={task.writableTempDir ?? false} onChange={v => set('writableTempDir', v)} label="Writable Temp Dir" />
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
