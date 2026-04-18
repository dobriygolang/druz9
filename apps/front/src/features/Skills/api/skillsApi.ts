import { apiClient } from '@/shared/api/base'

export type SkillState = 'allocated' | 'available' | 'locked'
export type SkillBranch = 'hub' | 'artisan' | 'scholar' | 'warrior' | 'merchant' | 'monk'

export interface SkillEffect {
  type: string
  value: number
  label: string
}

export interface SkillNode {
  skillId: string
  label: string
  description: string
  branch: SkillBranch
  keystone: boolean
  x: number
  y: number
  state: SkillState
  effect: SkillEffect
  refundGold: number
}

export interface SkillEdge {
  fromSkillId: string
  toSkillId: string
}

export interface SkillTreeData {
  nodes: SkillNode[]
  edges: SkillEdge[]
  pointsAvailable: number
  pointsEarned: number
  pointsSpent: number
}

interface RawSkillEffect {
  type?: string
  value?: number
  label?: string
}

interface RawSkillNode {
  skillId?: string
  label?: string
  description?: string
  branch?: SkillBranch
  keystone?: boolean
  x?: number
  y?: number
  state?: SkillState
  effect?: RawSkillEffect
  refundGold?: number
}

interface RawSkillTreeResponse {
  nodes?: RawSkillNode[]
  edges?: Array<{ fromSkillId?: string; toSkillId?: string }>
  pointsAvailable?: number
  pointsEarned?: number
  pointsSpent?: number
}

interface RawAllocateResponse {
  success?: boolean
  errorMessage?: string
  pointsRemaining?: number
}

interface RawRefundResponse {
  success?: boolean
  errorMessage?: string
  goldCost?: number
  pointsReturned?: number
}

function normalizeTree(data: RawSkillTreeResponse): SkillTreeData {
  const nodes = (data.nodes ?? [])
    .filter((n): n is RawSkillNode & { skillId: string } => Boolean(n?.skillId))
    .map((n) => ({
      skillId: n.skillId,
      label: n.label ?? n.skillId,
      description: n.description ?? '',
      branch: (n.branch ?? 'hub') as SkillBranch,
      keystone: n.keystone ?? false,
      x: n.x ?? 0,
      y: n.y ?? 0,
      state: (n.state ?? 'locked') as SkillState,
      effect: {
        type: n.effect?.type ?? '',
        value: n.effect?.value ?? 0,
        label: n.effect?.label ?? '',
      },
      refundGold: n.refundGold ?? 0,
    }))

  const edges = (data.edges ?? [])
    .filter((e): e is { fromSkillId: string; toSkillId: string } => Boolean(e?.fromSkillId && e?.toSkillId))
    .map((e) => ({ fromSkillId: e.fromSkillId, toSkillId: e.toSkillId }))

  return {
    nodes,
    edges,
    pointsAvailable: data.pointsAvailable ?? 0,
    pointsEarned: data.pointsEarned ?? 0,
    pointsSpent: data.pointsSpent ?? 0,
  }
}

const DEV_MOCK: RawSkillTreeResponse | null = import.meta.env.DEV ? {
  nodes: [
    {skillId:'artisan_core',label:'Artisan\nCore',description:'The origin of the Artisan\'s path.',branch:'hub' as const,keystone:false,x:540,y:400,state:'available' as const,effect:{type:'xp_multiplier',value:0.05,label:'+5% all XP'},refundGold:0},
    {skillId:'sharp_focus',label:'Sharp\nFocus',description:'Training XP boost.',branch:'artisan' as const,keystone:false,x:420,y:320,state:'allocated' as const,effect:{type:'training_xp_multiplier',value:0.10,label:'+10% training XP'},refundGold:50},
    {skillId:'deep_learner',label:'Deep\nLearner',description:'Extra hint free.',branch:'artisan' as const,keystone:false,x:310,y:255,state:'available' as const,effect:{type:'hint_count',value:1,label:'+1 free hint'},refundGold:0},
    {skillId:'quick_study',label:'Quick\nStudy',description:'Hint timer -5s.',branch:'artisan' as const,keystone:false,x:215,y:195,state:'locked' as const,effect:{type:'hint_timer_reduction_s',value:5,label:'hint timer -5 s'},refundGold:0},
    {skillId:'knowledge_hoard',label:'Knowledge\nHoard',description:'+25% all XP.',branch:'artisan' as const,keystone:true,x:100,y:120,state:'locked' as const,effect:{type:'xp_multiplier',value:0.25,label:'+25% all XP'},refundGold:0},
    {skillId:'arena_veteran',label:'Arena\nVeteran',description:'Arena time +5%.',branch:'warrior' as const,keystone:false,x:650,y:315,state:'available' as const,effect:{type:'arena_time_bonus_pct',value:5,label:'+5% arena time'},refundGold:0},
    {skillId:'iron_will',label:'Iron Will',description:'1st WA no penalty.',branch:'warrior' as const,keystone:false,x:740,y:245,state:'locked' as const,effect:{type:'arena_first_wa_no_penalty',value:1,label:'1st WA no penalty'},refundGold:0},
    {skillId:'perfect_strike',label:'Perfect\nStrike',description:'First-try XP +20%.',branch:'warrior' as const,keystone:false,x:830,y:185,state:'locked' as const,effect:{type:'first_try_xp_bonus_pct',value:20,label:'+20% XP on first try'},refundGold:0},
    {skillId:'gladiator',label:'Gladiator',description:'Arena gold +50%.',branch:'warrior' as const,keystone:true,x:960,y:110,state:'locked' as const,effect:{type:'arena_gold_multiplier',value:0.5,label:'+50% arena gold'},refundGold:0},
    {skillId:'studious',label:'Studious',description:'Interview XP +20%.',branch:'scholar' as const,keystone:false,x:540,y:295,state:'available' as const,effect:{type:'interview_xp_multiplier',value:0.20,label:'+20% interview XP'},refundGold:0},
    {skillId:'mnemonics',label:'Mnemonics',description:'Remember editor language.',branch:'scholar' as const,keystone:false,x:540,y:210,state:'locked' as const,effect:{type:'remember_language',value:1,label:'persist editor language'},refundGold:0},
    {skillId:'reviewer',label:'Reviewer',description:'1 free AI review / day.',branch:'scholar' as const,keystone:false,x:540,y:140,state:'locked' as const,effect:{type:'free_ai_review_daily',value:1,label:'1 free AI review / day'},refundGold:0},
    {skillId:'sage',label:'Sage',description:'Perfect = XP × difficulty.',branch:'scholar' as const,keystone:true,x:540,y:55,state:'locked' as const,effect:{type:'perfect_submit_xp_bonus',value:1,label:'XP × difficulty'},refundGold:0},
    {skillId:'treasure_hunter',label:'Treasure\nHunter',description:'+15% gold.',branch:'merchant' as const,keystone:false,x:650,y:490,state:'available' as const,effect:{type:'gold_multiplier',value:0.15,label:'+15% gold'},refundGold:0},
    {skillId:'hoarder',label:'Hoarder',description:'Gold cap +500.',branch:'merchant' as const,keystone:false,x:745,y:565,state:'locked' as const,effect:{type:'gold_cap_bonus',value:500,label:'gold cap +500'},refundGold:0},
    {skillId:'appraiser',label:'Appraiser',description:'-10% shop prices.',branch:'merchant' as const,keystone:false,x:835,y:620,state:'locked' as const,effect:{type:'shop_discount_pct',value:10,label:'-10% shop prices'},refundGold:0},
    {skillId:'midas_touch',label:'Midas\nTouch',description:'Overflow XP → gold.',branch:'merchant' as const,keystone:true,x:960,y:690,state:'locked' as const,effect:{type:'overflow_xp_to_gold',value:1,label:'overflow XP → gold'},refundGold:0},
    {skillId:'disciplined',label:'Disciplined',description:'Streak grace +12h.',branch:'monk' as const,keystone:false,x:420,y:490,state:'available' as const,effect:{type:'streak_grace_hours',value:12,label:'streak grace +12h'},refundGold:0},
    {skillId:'iron_streak',label:'Iron\nStreak',description:'Streak -1 not 0.',branch:'monk' as const,keystone:false,x:330,y:560,state:'locked' as const,effect:{type:'streak_floor',value:1,label:'streak -1 not 0'},refundGold:0},
    {skillId:'meditation',label:'Meditation',description:'Daily XP +25%.',branch:'monk' as const,keystone:false,x:230,y:615,state:'locked' as const,effect:{type:'daily_xp_multiplier',value:0.25,label:'+25% daily XP'},refundGold:0},
    {skillId:'ascetic',label:'Ascetic',description:'3× XP on 7-day streak.',branch:'monk' as const,keystone:true,x:100,y:695,state:'locked' as const,effect:{type:'streak7_xp_multiplier',value:2,label:'3× XP 7-day streak'},refundGold:0},
  ],
  edges:[
    {fromSkillId:'artisan_core',toSkillId:'sharp_focus'},{fromSkillId:'sharp_focus',toSkillId:'deep_learner'},{fromSkillId:'deep_learner',toSkillId:'quick_study'},{fromSkillId:'quick_study',toSkillId:'knowledge_hoard'},
    {fromSkillId:'artisan_core',toSkillId:'arena_veteran'},{fromSkillId:'arena_veteran',toSkillId:'iron_will'},{fromSkillId:'iron_will',toSkillId:'perfect_strike'},{fromSkillId:'perfect_strike',toSkillId:'gladiator'},
    {fromSkillId:'artisan_core',toSkillId:'studious'},{fromSkillId:'studious',toSkillId:'mnemonics'},{fromSkillId:'mnemonics',toSkillId:'reviewer'},{fromSkillId:'reviewer',toSkillId:'sage'},
    {fromSkillId:'artisan_core',toSkillId:'treasure_hunter'},{fromSkillId:'treasure_hunter',toSkillId:'hoarder'},{fromSkillId:'hoarder',toSkillId:'appraiser'},{fromSkillId:'appraiser',toSkillId:'midas_touch'},
    {fromSkillId:'artisan_core',toSkillId:'disciplined'},{fromSkillId:'disciplined',toSkillId:'iron_streak'},{fromSkillId:'iron_streak',toSkillId:'meditation'},{fromSkillId:'meditation',toSkillId:'ascetic'},
  ],
  pointsAvailable:2, pointsEarned:3, pointsSpent:1,
} : null

export const skillsApi = {
  getSkillTree: async (): Promise<SkillTreeData> => {
    try {
      const { data } = await apiClient.get<RawSkillTreeResponse>('/api/v1/skills/tree')
      return normalizeTree(data)
    } catch (err) {
      if (DEV_MOCK) return normalizeTree(DEV_MOCK)
      throw err
    }
  },

  allocate: async (skillId: string): Promise<{ success: boolean; errorMessage: string; pointsRemaining: number }> => {
    const { data } = await apiClient.post<RawAllocateResponse>(`/api/v1/skills/${skillId}/allocate`, {})
    return {
      success: data.success ?? false,
      errorMessage: data.errorMessage ?? '',
      pointsRemaining: data.pointsRemaining ?? 0,
    }
  },

  refund: async (skillId: string): Promise<{ success: boolean; errorMessage: string; goldCost: number }> => {
    const { data } = await apiClient.post<RawRefundResponse>(`/api/v1/skills/${skillId}/refund`, {})
    return {
      success: data.success ?? false,
      errorMessage: data.errorMessage ?? '',
      goldCost: data.goldCost ?? 0,
    }
  },
}
