import { apiClient } from '@/shared/api/base'
import type { ModuleDetail, SkillBranch, SkillEdge, SkillNode, SkillState } from '@/pages/TrainingPage/model/skillTree'

export interface TrainingBranchStat {
  branch: SkillBranch
  name: string
  done: number
  total: number
  color: string
}

export interface SkillTreeData {
  selectedNodeId: string
  branchStats: TrainingBranchStat[]
  nodes: SkillNode[]
  edges: SkillEdge[]
  modules: Record<string, ModuleDetail>
}

export type TrainingTaskDifficulty = 'easy' | 'medium' | 'hard'
export type TrainingTaskLanguage = 'python' | 'go'
export type TrainingEvaluationMode = 'run_visible' | 'submit_all'
export type TrainingTestStatus = 'pass' | 'fail'

export interface TrainingTaskCase {
  id: string
  input: string
  expected: string
  hidden?: boolean
}

export interface TrainingTaskData {
  moduleId: string
  taskId: string
  title: string
  topic: string
  difficulty: TrainingTaskDifficulty
  statement: string
  examples: Array<{ input: string; output: string; note?: string }>
  constraints: string[]
  starterCode: Record<TrainingTaskLanguage, string>
  testCases: TrainingTaskCase[]
  hints: string[]
  rewards: string[]
}

export interface TrainingEvaluationResult {
  testResults: Array<TrainingTaskCase & { status: TrainingTestStatus; runtimeMs?: number; actual?: string }>
  accepted: boolean
  error: string
  passedCount: number
  totalCount: number
  submissionId?: string
  rewardLabels: string[]
}

interface RawSkillTreeResponse {
  selectedNodeId?: string
  branchStats?: Array<{
    branch?: SkillBranch
    name?: string
    done?: number
    total?: number
    colorToken?: string
  }>
  nodes?: Array<{
    id?: string
    x?: number
    y?: number
    label?: string
    state?: SkillState
    branch?: SkillBranch
    keystone?: boolean
  }>
  edges?: Array<{
    fromNodeId?: string
    toNodeId?: string
  }>
  modules?: Array<{
    nodeId?: string
    title?: string
    description?: string
    tasks?: number
    projects?: number
    hours?: string
    rewards?: string[]
    prereq?: string[]
    unlocks?: string[]
    progressPct?: number
    tasksSolved?: number
    projectsDone?: number
    actionUrl?: string
  }>
}

interface RawTaskResponse {
  task?: {
    moduleId?: string
    taskId?: string
    title?: string
    topic?: string
    difficulty?: string
    statement?: string
    examples?: Array<{ input?: string; output?: string; note?: string }>
    constraints?: string[]
    starterCodes?: Array<{ language?: string; code?: string }>
    visibleTestCases?: Array<{ id?: string; input?: string; expected?: string; hidden?: boolean }>
    hints?: string[]
    rewardLabels?: string[]
  }
}

interface RawEvaluationResponse {
  testResults?: Array<{
    id?: string
    input?: string
    expected?: string
    hidden?: boolean
    status?: string
    runtimeMs?: number
    actual?: string
  }>
  accepted?: boolean
  error?: string
  passedCount?: number
  totalCount?: number
  submissionId?: string
  rewardLabels?: string[]
}

function normalizeDifficulty(value?: string): TrainingTaskDifficulty {
  if (value === 'TRAINING_TASK_DIFFICULTY_EASY') return 'easy'
  if (value === 'TRAINING_TASK_DIFFICULTY_HARD') return 'hard'
  return 'medium'
}

function normalizeLanguage(value?: string): TrainingTaskLanguage | null {
  if (value === 'TRAINING_PROGRAMMING_LANGUAGE_GO') return 'go'
  if (value === 'TRAINING_PROGRAMMING_LANGUAGE_PYTHON') return 'python'
  return null
}

function languageToEnum(value: TrainingTaskLanguage): string {
  return value === 'python'
    ? 'TRAINING_PROGRAMMING_LANGUAGE_PYTHON'
    : 'TRAINING_PROGRAMMING_LANGUAGE_GO'
}

function modeToEnum(value: TrainingEvaluationMode): string {
  return value === 'submit_all'
    ? 'TRAINING_EVALUATION_MODE_SUBMIT_ALL'
    : 'TRAINING_EVALUATION_MODE_RUN_VISIBLE'
}

function normalizeTestStatus(value?: string): TrainingTestStatus {
  return value === 'TRAINING_TEST_STATUS_PASS' ? 'pass' : 'fail'
}

function normalizeSkillTree(data: RawSkillTreeResponse): SkillTreeData {
  const nodes = (data.nodes ?? [])
    .filter((node): node is NonNullable<typeof node> & { id: string; branch: SkillBranch; state: SkillState; label: string } =>
      Boolean(node?.id && node?.branch && node?.state && node?.label),
    )
    .map((node) => ({
      id: node.id,
      x: node.x ?? 0,
      y: node.y ?? 0,
      label: node.label,
      state: node.state,
      branch: node.branch,
      keystone: node.keystone ?? false,
    }))

  const modules = Object.fromEntries(
    (data.modules ?? [])
      .filter((module): module is NonNullable<typeof module> & { nodeId: string; title: string; description: string } =>
        Boolean(module?.nodeId && module?.title && module?.description),
      )
      .map((module) => [
        module.nodeId,
        {
          title: module.title,
          desc: module.description,
          tasks: module.tasks ?? 0,
          projects: module.projects ?? 0,
          hours: module.hours ?? '4–6h',
          rewards: module.rewards ?? [],
          prereq: module.prereq ?? [],
          unlocks: module.unlocks ?? [],
          progressPct: module.progressPct,
          tasksSolved: module.tasksSolved,
          projectsDone: module.projectsDone,
          actionUrl: module.actionUrl,
        } satisfies ModuleDetail,
      ]),
  )

  return {
    selectedNodeId: data.selectedNodeId ?? nodes[0]?.id ?? '',
    branchStats: (data.branchStats ?? []).map((stat) => ({
      branch: stat.branch ?? 'core',
      name: stat.name ?? 'Core',
      done: stat.done ?? 0,
      total: stat.total ?? 0,
      color: stat.colorToken ?? 'var(--moss-1)',
    })),
    nodes,
    edges: (data.edges ?? [])
      .filter((edge): edge is NonNullable<typeof edge> & { fromNodeId: string; toNodeId: string } =>
        Boolean(edge?.fromNodeId && edge?.toNodeId),
      )
      .map((edge) => [edge.fromNodeId, edge.toNodeId] as const),
    modules,
  }
}

export const trainingApi = {
  getSkillTree: async (): Promise<SkillTreeData> => {
    const { data } = await apiClient.get<RawSkillTreeResponse>('/api/v1/training/skill-tree')
    return normalizeSkillTree(data)
  },
  getTask: async (moduleId: string): Promise<TrainingTaskData> => {
    const { data } = await apiClient.get<RawTaskResponse>(`/api/v1/training/tasks/${moduleId}`)
    const task = data.task ?? {}
    const starterCode: Record<TrainingTaskLanguage, string> = {
      python: '',
      go: '',
    }
    for (const item of task.starterCodes ?? []) {
      const language = normalizeLanguage(item.language)
      if (language && item.code) starterCode[language] = item.code
    }

    return {
      moduleId: task.moduleId ?? moduleId,
      taskId: task.taskId ?? '',
      title: task.title ?? 'Training task',
      topic: task.topic ?? moduleId,
      difficulty: normalizeDifficulty(task.difficulty),
      statement: task.statement ?? '',
      examples: (task.examples ?? []).map((example) => ({
        input: example.input ?? '',
        output: example.output ?? '',
        note: example.note,
      })),
      constraints: task.constraints ?? [],
      starterCode,
      testCases: (task.visibleTestCases ?? []).map((testCase) => ({
        id: testCase.id ?? '',
        input: testCase.input ?? '',
        expected: testCase.expected ?? '',
        hidden: testCase.hidden ?? false,
      })),
      hints: task.hints ?? [],
      rewards: task.rewardLabels ?? [],
    }
  },
  evaluateTaskSolution: async (
    moduleId: string,
    payload: { language: TrainingTaskLanguage; code: string; mode: TrainingEvaluationMode },
  ): Promise<TrainingEvaluationResult> => {
    const { data } = await apiClient.post<RawEvaluationResponse>(`/api/v1/training/tasks/${moduleId}/evaluate`, {
      moduleId,
      language: languageToEnum(payload.language),
      code: payload.code,
      mode: modeToEnum(payload.mode),
    })
    return {
      testResults: (data.testResults ?? []).map((result) => ({
        id: result.id ?? '',
        input: result.input ?? '',
        expected: result.expected ?? '',
        hidden: result.hidden ?? false,
        status: normalizeTestStatus(result.status),
        runtimeMs: result.runtimeMs,
        actual: result.actual,
      })),
      accepted: data.accepted ?? false,
      error: data.error ?? '',
      passedCount: data.passedCount ?? 0,
      totalCount: data.totalCount ?? 0,
      submissionId: data.submissionId,
      rewardLabels: data.rewardLabels ?? [],
    }
  },
}
