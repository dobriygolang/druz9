export type SkillState = 'unlocked' | 'current' | 'locked'
export type SkillBranch = 'core' | 'tree' | 'graph' | 'dp' | 'meta'

export interface SkillNode {
  id: string
  x: number
  y: number
  label: string
  state: SkillState
  branch: SkillBranch
  keystone?: boolean
}

export type SkillEdge = readonly [string, string]

export interface ModuleDetail {
  title: string
  desc: string
  tasks: number
  projects: number
  hours: string
  rewards: string[]
  prereq: string[]
  unlocks: string[]
  progressPct?: number
  tasksSolved?: number
  projectsDone?: number
  actionUrl?: string
}

export const SKILL_NODES: SkillNode[] = [
  // Core
  { id: 'arrays', x: 540, y: 700, label: 'arrays\n& loops', state: 'unlocked', branch: 'core' },
  { id: 'strings', x: 420, y: 640, label: 'strings', state: 'unlocked', branch: 'core' },
  { id: 'hashmap', x: 660, y: 640, label: 'hash\nmap', state: 'unlocked', branch: 'core' },
  { id: 'sorting', x: 300, y: 580, label: 'sorting', state: 'unlocked', branch: 'core' },
  { id: 'two-ptr', x: 540, y: 580, label: '2-ptr', state: 'unlocked', branch: 'core' },
  { id: 'sliding', x: 780, y: 580, label: 'sliding\nwindow', state: 'unlocked', branch: 'core' },

  // Trees
  { id: 'tree-basics', x: 200, y: 480, label: 'trees\nbasics', state: 'unlocked', branch: 'tree' },
  { id: 'bst', x: 120, y: 400, label: 'BST', state: 'unlocked', branch: 'tree' },
  { id: 'heap', x: 240, y: 380, label: 'heap', state: 'unlocked', branch: 'tree' },
  { id: 'tree-dp', x: 160, y: 290, label: 'tree\nDP', state: 'locked', branch: 'tree' },
  { id: 'segment', x: 60, y: 300, label: 'segment\ntree', state: 'locked', branch: 'tree', keystone: true },
  { id: 'lca', x: 280, y: 260, label: 'LCA', state: 'locked', branch: 'tree' },

  // Graphs
  { id: 'graph-basics', x: 460, y: 480, label: 'graph\nbasics', state: 'unlocked', branch: 'graph' },
  { id: 'graph-bfs', x: 380, y: 400, label: 'BFS', state: 'unlocked', branch: 'graph' },
  { id: 'graph-dfs', x: 540, y: 400, label: 'DFS', state: 'current', branch: 'graph' },
  { id: 'dijkstra', x: 460, y: 300, label: 'dijkstra', state: 'locked', branch: 'graph' },
  { id: 'flow', x: 540, y: 200, label: 'max\nflow', state: 'locked', branch: 'graph', keystone: true },
  { id: 'union-find', x: 620, y: 320, label: 'union\nfind', state: 'locked', branch: 'graph' },

  // DP
  { id: 'dp-basics', x: 740, y: 480, label: 'DP\nbasics', state: 'unlocked', branch: 'dp' },
  { id: 'knapsack', x: 860, y: 420, label: 'knapsack', state: 'locked', branch: 'dp' },
  { id: 'dp-strings', x: 700, y: 400, label: 'DP\nstrings', state: 'locked', branch: 'dp' },
  { id: 'bitmask', x: 960, y: 360, label: 'bitmask\nDP', state: 'locked', branch: 'dp', keystone: true },
  { id: 'digit-dp', x: 840, y: 300, label: 'digit\nDP', state: 'locked', branch: 'dp' },

  // Meta / apex
  { id: 'systems', x: 540, y: 90, label: 'systems\ndesign', state: 'locked', branch: 'meta', keystone: true },
  { id: 'concurrency', x: 400, y: 140, label: 'concurr-\nency', state: 'locked', branch: 'meta' },
  { id: 'distributed', x: 680, y: 140, label: 'distri-\nbuted', state: 'locked', branch: 'meta' },
]

export const SKILL_EDGES: SkillEdge[] = [
  ['arrays', 'strings'], ['arrays', 'hashmap'], ['arrays', 'two-ptr'],
  ['strings', 'sorting'], ['strings', 'two-ptr'],
  ['hashmap', 'sliding'], ['two-ptr', 'sliding'],
  ['sorting', 'tree-basics'], ['tree-basics', 'bst'], ['tree-basics', 'heap'],
  ['bst', 'segment'], ['bst', 'tree-dp'], ['heap', 'lca'],
  ['two-ptr', 'graph-basics'], ['graph-basics', 'graph-bfs'], ['graph-basics', 'graph-dfs'],
  ['graph-bfs', 'dijkstra'], ['graph-dfs', 'dijkstra'], ['graph-dfs', 'union-find'],
  ['dijkstra', 'flow'],
  ['sliding', 'dp-basics'], ['dp-basics', 'knapsack'], ['dp-basics', 'dp-strings'],
  ['knapsack', 'bitmask'], ['dp-strings', 'digit-dp'],
  ['flow', 'systems'], ['flow', 'concurrency'], ['knapsack', 'distributed'],
  ['systems', 'concurrency'], ['systems', 'distributed'],
]

export const MODULE_DETAILS: Record<string, ModuleDetail> = {
  'graph-dfs': {
    title: 'Graphs · Depth-first search',
    desc: 'DFS, topological sort, cycle detection, connected components. 12 tasks, 3 mini-projects.',
    tasks: 12,
    projects: 3,
    hours: '6–8h',
    rewards: ['+320 ✦', '+60 gold', 'Graph Walker badge'],
    prereq: ['graph-basics'],
    unlocks: ['dijkstra', 'union-find'],
    progressPct: 42,
    tasksSolved: 5,
    projectsDone: 2,
  },
}

export const BRANCH_STATS = [
  { name: 'Core', done: 6, total: 6, color: 'var(--moss-1)' },
  { name: 'Trees', done: 3, total: 6, color: 'var(--moss-2)' },
  { name: 'Graphs', done: 3, total: 6, color: 'var(--ember-1)' },
  { name: 'DP', done: 1, total: 5, color: 'var(--parch-3)' },
  { name: 'Systems', done: 0, total: 3, color: 'var(--ink-2)' },
]
