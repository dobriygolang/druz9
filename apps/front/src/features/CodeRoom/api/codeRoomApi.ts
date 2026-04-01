import { apiClient, withGuestArenaHeaders, withGuestCodeRoomHeaders } from '@/shared/api/base';
import { markGuestCodeRoomSession } from '@/features/CodeRoom/lib/guestIdentity';
import { normalizeRoom } from '@/features/CodeRoom/api/codeRoomMappers';
import {
  ArenaPlayerStats,
  ArenaQueueState,
  ArenaLeaderboardEntry,
  ArenaMatch,
  ArenaPlayer,
  CodeLeaderboardEntry,
  CodeRoom,
  CodeRoomMode,
  CodeTask,
  CodeTaskCase,
  RunCodeResponse,
  Submission,
  roomModeToEnum,
} from '@/entities/CodeRoom/model/types';

function normalizeTaskDifficulty(value: any): string {
  if (value === 1 || value === 'TASK_DIFFICULTY_EASY' || value === 'easy') return 'easy';
  if (value === 2 || value === 'TASK_DIFFICULTY_MEDIUM' || value === 'medium') return 'medium';
  if (value === 3 || value === 'TASK_DIFFICULTY_HARD' || value === 'hard') return 'hard';
  return '';
}

function toTaskDifficultyEnum(value?: string): number {
  switch (value) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 0;
  }
}

function normalizeProgrammingLanguage(value: any): string {
  switch (value) {
    case 1:
    case 'PROGRAMMING_LANGUAGE_JAVASCRIPT':
    case 'javascript':
      return 'javascript';
    case 2:
    case 'PROGRAMMING_LANGUAGE_TYPESCRIPT':
    case 'typescript':
      return 'typescript';
    case 3:
    case 'PROGRAMMING_LANGUAGE_PYTHON':
    case 'python':
      return 'python';
    case 4:
    case 'PROGRAMMING_LANGUAGE_GO':
    case 'go':
      return 'go';
    case 5:
    case 'PROGRAMMING_LANGUAGE_RUST':
    case 'rust':
      return 'rust';
    case 6:
    case 'PROGRAMMING_LANGUAGE_CPP':
    case 'cpp':
      return 'cpp';
    case 7:
    case 'PROGRAMMING_LANGUAGE_JAVA':
    case 'java':
      return 'java';
    default:
      return 'go';
  }
}

function toProgrammingLanguageEnum(value?: string): number {
  switch (value) {
    case 'javascript': return 1;
    case 'typescript': return 2;
    case 'python': return 3;
    case 'go': return 4;
    case 'rust': return 5;
    case 'cpp': return 6;
    case 'java': return 7;
    default: return 4;
  }
}

function normalizePolicyTaskType(value: any, executionProfile?: string): string {
  switch (value) {
    case 'arena_duel':
    case 'algorithm_practice':
    case 'file_parsing':
    case 'api_json':
    case 'interview_practice':
    case 'code_editor':
      return value;
    default:
      break;
  }

  switch (executionProfile) {
    case 'file_io':
      return 'file_parsing';
    case 'http_client':
      return 'api_json';
    case 'interview_realistic':
      return 'interview_practice';
    case 'pure':
      return 'algorithm_practice';
    default:
      return 'algorithm_practice';
  }
}

function toTaskTypeEnum(value?: string): number {
  switch (value) {
    case 'debugging':
      return 2;
    case 'refactoring':
      return 3;
    default:
      return 1;
  }
}

function normalizeArenaDifficulty(value: any): string {
  if (value === 1 || value === 'DIFFICULTY_EASY' || value === 'easy') return 'easy';
  if (value === 2 || value === 'DIFFICULTY_MEDIUM' || value === 'medium') return 'medium';
  if (value === 3 || value === 'DIFFICULTY_HARD' || value === 'hard') return 'hard';
  return '';
}

function toArenaDifficultyEnum(value?: string): number {
  switch (value) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 0;
  }
}

function normalizeArenaStatus(value: any): ArenaMatch['status'] {
  if (value === 3 || value === 'ARENA_MATCH_STATUS_FINISHED' || value === 'finished') return 'finished';
  if (value === 2 || value === 'ARENA_MATCH_STATUS_ACTIVE' || value === 'active') return 'active';
  return 'waiting';
}

function normalizeArenaWinnerReason(value: any): string {
  switch (value) {
    case 1:
    case 'WINNER_REASON_ACCEPTED_TIME':
    case 'accepted_time':
      return 'accepted_time';
    case 2:
    case 'WINNER_REASON_RUNTIME':
    case 'runtime':
      return 'runtime';
    case 3:
    case 'WINNER_REASON_TIMEOUT':
    case 'timeout':
      return 'timeout';
    case 4:
    case 'WINNER_REASON_SINGLE_AC':
    case 'single_ac':
      return 'single_ac';
    case 6:
    case 'WINNER_REASON_ANTI_CHEAT':
    case 'anti_cheat':
      return 'anti_cheat';
    case 5:
    case 'WINNER_REASON_NONE':
    case 'none':
      return 'none';
    default:
      return '';
  }
}

function normalizeArenaSide(value: any): string {
  if (value === 1 || value === 'ARENA_PLAYER_SIDE_LEFT' || value === 'left') return 'left';
  if (value === 2 || value === 'ARENA_PLAYER_SIDE_RIGHT' || value === 'right') return 'right';
  return 'left';
}

function normalizeArenaLeague(value: any): string {
  switch (value) {
    case 1:
    case 'ARENA_LEAGUE_BRONZE':
    case 'bronze':
      return 'Bronze';
    case 2:
    case 'ARENA_LEAGUE_SILVER':
    case 'silver':
      return 'Silver';
    case 3:
    case 'ARENA_LEAGUE_GOLD':
    case 'gold':
      return 'Gold';
    case 4:
    case 'ARENA_LEAGUE_PLATINUM':
    case 'platinum':
      return 'Platinum';
    case 5:
    case 'ARENA_LEAGUE_DIAMOND':
    case 'diamond':
      return 'Diamond';
    case 6:
    case 'ARENA_LEAGUE_MASTER':
    case 'master':
      return 'Master';
    case 7:
    case 'ARENA_LEAGUE_LEGEND':
    case 'legend':
      return 'Legend';
    default:
      return 'Bronze';
  }
}

function normalizeTaskCase(testCase: any): CodeTaskCase {
  return {
    id: testCase?.id || '',
    input: testCase?.input || '',
    expectedOutput: testCase?.expectedOutput || testCase?.expected_output || '',
    isPublic: Boolean(testCase?.isPublic ?? testCase?.is_public),
    weight: Number(testCase?.weight ?? 1),
    order: Number(testCase?.order ?? 0),
  };
}

function normalizeTask(task: any): CodeTask {
  const executionProfile = task?.executionProfile || task?.execution_profile || 'pure';
  return {
    id: task?.id || '',
    title: task?.title || '',
    slug: task?.slug || '',
    statement: task?.statement || '',
    difficulty: normalizeTaskDifficulty(task?.difficulty),
    topics: Array.isArray(task?.topics) ? task.topics : [],
    starterCode: task?.starterCode || task?.starter_code || '',
    language: normalizeProgrammingLanguage(task?.language),
    taskType: normalizePolicyTaskType(task?.taskType || task?.task_type, executionProfile),
    executionProfile,
    runnerMode: task?.runnerMode || task?.runner_mode || 'program',
    durationSeconds: Number(task?.durationSeconds ?? task?.duration_seconds ?? 900),
    fixtureFiles: Array.isArray(task?.fixtureFiles || task?.fixture_files) ? (task?.fixtureFiles || task?.fixture_files) : [],
    readablePaths: Array.isArray(task?.readablePaths || task?.readable_paths) ? (task?.readablePaths || task?.readable_paths) : [],
    writablePaths: Array.isArray(task?.writablePaths || task?.writable_paths) ? (task?.writablePaths || task?.writable_paths) : [],
    allowedHosts: Array.isArray(task?.allowedHosts || task?.allowed_hosts) ? (task?.allowedHosts || task?.allowed_hosts) : [],
    allowedPorts: Array.isArray(task?.allowedPorts || task?.allowed_ports) ? (task?.allowedPorts || task?.allowed_ports).map(Number) : [],
    mockEndpoints: Array.isArray(task?.mockEndpoints || task?.mock_endpoints) ? (task?.mockEndpoints || task?.mock_endpoints) : [],
    writableTempDir: Boolean(task?.writableTempDir ?? task?.writable_temp_dir),
    isActive: Boolean(task?.isActive ?? task?.is_active),
    publicTestCases: (task?.publicTestCases || task?.public_test_cases || []).map(normalizeTaskCase),
    hiddenTestCases: (task?.hiddenTestCases || task?.hidden_test_cases || []).map(normalizeTaskCase),
    createdAt: task?.createdAt || task?.created_at || new Date().toISOString(),
    updatedAt: task?.updatedAt || task?.updated_at || new Date().toISOString(),
  };
}

function normalizeLeaderboardEntry(entry: any): CodeLeaderboardEntry {
  return {
    userId: entry?.userId || entry?.user_id || '',
    displayName: entry?.displayName || entry?.display_name || 'Игрок',
    wins: Number(entry?.wins || 0),
    matches: Number(entry?.matches || 0),
    winRate: Number(entry?.winRate ?? entry?.win_rate ?? 0),
    bestSolveMs: Number(entry?.bestSolveMs ?? entry?.best_solve_ms ?? 0),
  };
}

function normalizeArenaPlayer(player: any): ArenaPlayer {
  return {
    userId: player?.userId || player?.user_id || '',
    displayName: player?.displayName || player?.display_name || 'Игрок',
    side: normalizeArenaSide(player?.side),
    isCreator: Boolean(player?.isCreator ?? player?.is_creator),
    currentCode: player?.currentCode || player?.current_code || '',
    freezeUntil: player?.freezeUntil || player?.freeze_until || '',
    acceptedAt: player?.acceptedAt || player?.accepted_at || '',
    suspicionCount: Number(player?.suspicionCount ?? player?.suspicion_count ?? 0),
    antiCheatPenalized: Boolean(player?.antiCheatPenalized ?? player?.anti_cheat_penalized),
    bestRuntimeMs: Number(player?.bestRuntimeMs ?? player?.best_runtime_ms ?? 0),
    isWinner: Boolean(player?.isWinner ?? player?.is_winner),
    joinedAt: player?.joinedAt || player?.joined_at || '',
  };
}

function normalizeArenaMatch(match: any): ArenaMatch {
  return {
    id: match?.id || '',
    taskId: match?.taskId || match?.task_id || '',
    taskTitle: match?.taskTitle || match?.task_title || '',
    taskStatement: match?.taskStatement || match?.task_statement || '',
    starterCode: match?.starterCode || match?.starter_code || '',
    topic: match?.topic || '',
    difficulty: normalizeArenaDifficulty(match?.difficulty),
    status: normalizeArenaStatus(match?.status),
    durationSeconds: Number(match?.durationSeconds ?? match?.duration_seconds ?? 0),
    obfuscateOpponent: Boolean(match?.obfuscateOpponent ?? match?.obfuscate_opponent),
    isRated: Boolean(match?.isRated ?? match?.is_rated ?? true),
    unratedReason: match?.unratedReason || match?.unrated_reason || '',
    antiCheatEnabled: Boolean(match?.antiCheatEnabled ?? match?.anti_cheat_enabled),
    winnerUserId: match?.winnerUserId || match?.winner_user_id || '',
    winnerReason: normalizeArenaWinnerReason(match?.winnerReason || match?.winner_reason),
    startedAt: match?.startedAt || match?.started_at || '',
    finishedAt: match?.finishedAt || match?.finished_at || '',
    createdAt: match?.createdAt || match?.created_at || '',
    players: (match?.players || []).map(normalizeArenaPlayer),
  };
}

function normalizeArenaLeaderboardEntry(entry: any): ArenaLeaderboardEntry {
  return {
    userId: entry?.userId || entry?.user_id || '',
    displayName: entry?.displayName || entry?.display_name || 'Игрок',
    rating: Number(entry?.rating ?? 300),
    league: normalizeArenaLeague(entry?.league),
    wins: Number(entry?.wins ?? 0),
    losses: Number(entry?.losses ?? 0),
    matches: Number(entry?.matches ?? 0),
    winRate: Number(entry?.winRate ?? entry?.win_rate ?? 0),
    bestRuntime: Number(entry?.bestRuntime ?? entry?.best_runtime ?? 0),
  };
}

function normalizeArenaQueueState(state: any): ArenaQueueState {
  return {
    status: state?.status || 'idle',
    topic: state?.topic || '',
    difficulty: normalizeArenaDifficulty(state?.difficulty),
    queuedAt: state?.queuedAt || state?.queued_at || '',
    queueSize: Number(state?.queueSize ?? state?.queue_size ?? 0),
    match: state?.match ? normalizeArenaMatch(state.match) : undefined,
  };
}

function normalizeArenaPlayerStats(stats: any): ArenaPlayerStats {
  return {
    userId: stats?.userId || stats?.user_id || '',
    displayName: stats?.displayName || stats?.display_name || 'Игрок',
    rating: Number(stats?.rating ?? 300),
    league: normalizeArenaLeague(stats?.league),
    wins: Number(stats?.wins ?? 0),
    losses: Number(stats?.losses ?? 0),
    matches: Number(stats?.matches ?? 0),
    winRate: Number(stats?.winRate ?? stats?.win_rate ?? 0),
    bestRuntime: Number(stats?.bestRuntime ?? stats?.best_runtime ?? 0),
  };
}

// ===========================================
// Типы запросов
// ===========================================

export interface CreateRoomRequest {
  mode: CodeRoomMode;
  topic?: string;
  difficulty?: string;
  guestName?: string;
}

export interface JoinRoomRequest {
  userId?: string;
  guestName?: string;
}

export interface JoinRoomByInviteCodeRequest {
  inviteCode: string;
  guestName?: string; // Имя гостя (без авторизации)
}

export interface SubmitCodeRequest {
  code: string;
}

export interface SetReadyRequest {
  ready: boolean;
}

export interface CreateTaskRequest {
  title: string;
  slug: string;
  statement: string;
  difficulty: string;
  topics: string[];
  starterCode: string;
  language: string;
  taskType: string;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: number;
  fixtureFiles: string[];
  readablePaths: string[];
  writablePaths: string[];
  allowedHosts: string[];
  allowedPorts: number[];
  mockEndpoints: string[];
  writableTempDir: boolean;
  isActive: boolean;
  publicTestCases: CodeTaskCase[];
  hiddenTestCases: CodeTaskCase[];
}

export interface CreateArenaMatchRequest {
  topic?: string;
  difficulty?: string;
  obfuscateOpponent?: boolean;
  actorId?: string;
  guestName?: string;
}

export interface JoinArenaQueueRequest {
  topic?: string;
  difficulty?: string;
  obfuscateOpponent?: boolean;
  actorId?: string;
  guestName?: string;
}

// ===========================================
// API
// ===========================================

export const codeRoomApi = {
  // Создать комнату
  createRoom: async (data: CreateRoomRequest): Promise<CodeRoom> => {
    const response = await apiClient.post<{ room: any }>('/api/v1/code-editor/rooms', {
      ...(data.guestName && { name: data.guestName }),
      mode: roomModeToEnum(data.mode),
      topic: data.topic || '',
      difficulty: data.difficulty || '',
    }, {
      headers: withGuestCodeRoomHeaders(data.guestName),
    });
    if (data.guestName) {
      markGuestCodeRoomSession();
    }
    return normalizeRoom(response.data.room);
  },

  // Получить комнату по ID
  getRoom: async (roomId: string): Promise<CodeRoom> => {
    const response = await apiClient.get<{ room: any }>(`/api/v1/code-editor/rooms/${roomId}`);
    return normalizeRoom(response.data.room);
  },

  // Присоединиться к комнате
  joinRoom: async (roomId: string, data?: JoinRoomRequest): Promise<CodeRoom> => {
    const response = await apiClient.post<{ room: any }>(`/api/v1/code-editor/rooms/${roomId}/join`, {
      ...(data?.userId && { userId: data.userId }),
      ...(data?.guestName && { name: data.guestName }),
    }, {
      headers: withGuestCodeRoomHeaders(data?.guestName),
    });
    return normalizeRoom(response.data.room);
  },

  // Присоединиться по коду приглашения
  joinRoomByInviteCode: async (inviteCode: string, guestName?: string): Promise<CodeRoom> => {
    const response = await apiClient.post<{ room: any }>('/api/v1/code-editor/join', {
      inviteCode,
      ...(guestName && { name: guestName }),
    }, {
      headers: withGuestCodeRoomHeaders(guestName),
    });
    if (guestName) {
      markGuestCodeRoomSession();
    }
    return normalizeRoom(response.data.room);
  },

  // Покинуть комнату
  leaveRoom: async (roomId: string, guestName?: string): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/leave`, {}, {
      headers: withGuestCodeRoomHeaders(guestName),
    });
  },

  // Запустить/отправить код
  submitCode: async (roomId: string, code: string, guestName?: string): Promise<RunCodeResponse> => {
    const response = await apiClient.post<{
      output: string;
      error?: string;
      isCorrect?: boolean;
    }>(`/api/v1/code-editor/rooms/${roomId}/submit`, { code }, {
      headers: withGuestCodeRoomHeaders(guestName),
    });
    return {
      output: response.data.output || '',
      error: response.data.error || undefined,
      exitCode: response.data.error ? 1 : 0,
      executionTimeMs: 0,
    };
  },

  // Установить готовность (для дуэли)
  setReady: async (roomId: string, ready: boolean, guestName?: string): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/ready`, { ready }, {
      headers: withGuestCodeRoomHeaders(guestName),
    });
  },

  // Получить историю submission-ов
  getSubmissions: async (roomId: string): Promise<Submission[]> => {
    const response = await apiClient.get<{ submissions: Submission[] }>(`/api/v1/code-editor/rooms/${roomId}/submissions`);
    return response.data.submissions;
  },

  listTasks: async (params?: { topic?: string; difficulty?: string; includeInactive?: boolean }): Promise<CodeTask[]> => {
    const response = await apiClient.get<{ tasks: any[] }>('/api/v1/code-editor/tasks', {
      params: {
        topic: params?.topic || '',
        difficulty: toTaskDifficultyEnum(params?.difficulty),
        includeInactive: params?.includeInactive || false,
      },
    });
    return (response.data.tasks || []).map(normalizeTask);
  },

  getLeaderboard: async (limit = 20): Promise<CodeLeaderboardEntry[]> => {
    const response = await apiClient.get<{ entries: any[] }>('/api/v1/code-editor/leaderboard', {
      params: { limit },
    });
    return (response.data.entries || []).map(normalizeLeaderboardEntry);
  },

  adminCreateTask: async (payload: CreateTaskRequest): Promise<CodeTask> => {
    const response = await apiClient.post<{ task: any }>('/api/admin/code-editor/tasks', {
      title: payload.title,
      slug: payload.slug,
      statement: payload.statement,
      difficulty: toTaskDifficultyEnum(payload.difficulty),
      topics: payload.topics,
      starterCode: payload.starterCode,
      language: toProgrammingLanguageEnum(payload.language),
      taskType: toTaskTypeEnum(payload.taskType),
      executionProfile: payload.executionProfile,
      runnerMode: payload.runnerMode,
      durationSeconds: payload.durationSeconds,
      fixtureFiles: payload.fixtureFiles,
      readablePaths: payload.readablePaths,
      writablePaths: payload.writablePaths,
      allowedHosts: payload.allowedHosts,
      allowedPorts: payload.allowedPorts,
      mockEndpoints: payload.mockEndpoints,
      writableTempDir: payload.writableTempDir,
      isActive: payload.isActive,
      publicTestCases: payload.publicTestCases,
      hiddenTestCases: payload.hiddenTestCases,
    });
    return normalizeTask(response.data.task);
  },

  adminUpdateTask: async (taskId: string, payload: CreateTaskRequest): Promise<CodeTask> => {
    const response = await apiClient.put<{ task: any }>(`/api/admin/code-editor/tasks/${taskId}`, {
      taskId,
      title: payload.title,
      slug: payload.slug,
      statement: payload.statement,
      difficulty: toTaskDifficultyEnum(payload.difficulty),
      topics: payload.topics,
      starterCode: payload.starterCode,
      language: toProgrammingLanguageEnum(payload.language),
      taskType: toTaskTypeEnum(payload.taskType),
      executionProfile: payload.executionProfile,
      runnerMode: payload.runnerMode,
      durationSeconds: payload.durationSeconds,
      fixtureFiles: payload.fixtureFiles,
      readablePaths: payload.readablePaths,
      writablePaths: payload.writablePaths,
      allowedHosts: payload.allowedHosts,
      allowedPorts: payload.allowedPorts,
      mockEndpoints: payload.mockEndpoints,
      writableTempDir: payload.writableTempDir,
      isActive: payload.isActive,
      publicTestCases: payload.publicTestCases,
      hiddenTestCases: payload.hiddenTestCases,
    });
    return normalizeTask(response.data.task);
  },

  adminDeleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/code-editor/tasks/${taskId}`);
  },

  createArenaMatch: async (payload: CreateArenaMatchRequest): Promise<ArenaMatch> => {
    const response = await apiClient.post<{ match: any }>('/api/v1/arena/matches', {
      topic: payload.topic || '',
      difficulty: toArenaDifficultyEnum(payload.difficulty),
      obfuscateOpponent: payload.obfuscateOpponent ?? true,
    }, {
      headers: withGuestArenaHeaders(payload.actorId, payload.guestName),
    });
    if (payload.guestName) {
      markGuestCodeRoomSession();
    }
    return normalizeArenaMatch(response.data.match);
  },

  getArenaMatch: async (matchId: string, actorId?: string, guestName?: string): Promise<ArenaMatch> => {
    const response = await apiClient.get<{ match: any }>(`/api/v1/arena/matches/${matchId}`, {
      headers: withGuestArenaHeaders(actorId, guestName),
    });
    return normalizeArenaMatch(response.data.match);
  },

  joinArenaMatch: async (matchId: string, actorId?: string, guestName?: string): Promise<ArenaMatch> => {
    const response = await apiClient.post<{ match: any }>(`/api/v1/arena/matches/${matchId}/join`, {}, {
      headers: withGuestArenaHeaders(actorId, guestName),
    });
    if (guestName) {
      markGuestCodeRoomSession();
    }
    return normalizeArenaMatch(response.data.match);
  },

  submitArenaCode: async (matchId: string, code: string, actorId?: string, guestName?: string) => {
    const response = await apiClient.post<{
      match?: any;
      output: string;
      error?: string;
      isCorrect: boolean;
      passedCount: number;
      totalCount: number;
      runtimeMs: number;
      freezeUntil?: string;
      failedTestIndex?: number;
      failed_test_index?: number;
      failureKind?: number | string;
      failure_kind?: number | string;
    }>(`/api/v1/arena/matches/${matchId}/submit`, { code }, {
      headers: withGuestArenaHeaders(actorId, guestName),
    });

    const rawFailureKind = response.data.failureKind ?? response.data.failure_kind;

    let failureKind = '';
    if (
      rawFailureKind === 1 ||
      rawFailureKind === 'SUBMIT_FAILURE_KIND_COMPILE_ERROR' ||
      rawFailureKind === 'compile_error'
    ) {
      failureKind = 'compile_error';
    } else if (
      rawFailureKind === 2 ||
      rawFailureKind === 'SUBMIT_FAILURE_KIND_RUNTIME_ERROR' ||
      rawFailureKind === 'runtime_error'
    ) {
      failureKind = 'runtime_error';
    } else if (
      rawFailureKind === 3 ||
      rawFailureKind === 'SUBMIT_FAILURE_KIND_WRONG_ANSWER' ||
      rawFailureKind === 'wrong_answer'
    ) {
      failureKind = 'wrong_answer';
    } else if (
      rawFailureKind === 4 ||
      rawFailureKind === 'SUBMIT_FAILURE_KIND_TIMEOUT' ||
      rawFailureKind === 'timeout'
    ) {
      failureKind = 'timeout';
    }

    return {
      ...response.data,
      match: response.data.match ? normalizeArenaMatch(response.data.match) : undefined,
      failedTestIndex: Number(response.data.failedTestIndex ?? response.data.failed_test_index ?? 0),
      failureKind,
    };
  },

  getOpenArenaMatches: async (limit = 8): Promise<ArenaMatch[]> => {
    const response = await apiClient.get<{ matches: any[] }>('/api/v1/arena/open-matches', {
      params: { limit },
    });
    return (response.data.matches || []).map(normalizeArenaMatch);
  },

  joinArenaQueue: async (payload: JoinArenaQueueRequest): Promise<ArenaQueueState> => {
    const response = await apiClient.post('/api/v1/arena/queue/join', {
      topic: payload.topic || '',
      difficulty: toArenaDifficultyEnum(payload.difficulty),
      obfuscateOpponent: payload.obfuscateOpponent ?? true,
    }, {
      headers: withGuestArenaHeaders(payload.actorId, payload.guestName),
    });
    if (payload.guestName) {
      markGuestCodeRoomSession();
    }
    return normalizeArenaQueueState(response.data);
  },

  leaveArenaQueue: async (actorId?: string, guestName?: string): Promise<void> => {
    await apiClient.post('/api/v1/arena/queue/leave', {}, {
      headers: withGuestArenaHeaders(actorId, guestName),
    });
  },

  leaveArenaMatch: async (matchId: string, actorId?: string, guestName?: string): Promise<ArenaMatch> => {
    const response = await apiClient.post<{ match: any }>(`/api/v1/arena/matches/${matchId}/leave`, {}, {
      headers: withGuestArenaHeaders(actorId, guestName),
    });
    return normalizeArenaMatch(response.data.match);
  },

  getArenaQueueStatus: async (actorId?: string, guestName?: string): Promise<ArenaQueueState> => {
    const response = await apiClient.get('/api/v1/arena/queue/status', {
      headers: withGuestArenaHeaders(actorId, guestName),
    });
    return normalizeArenaQueueState(response.data);
  },

  getArenaLeaderboard: async (limit = 20): Promise<ArenaLeaderboardEntry[]> => {
    const response = await apiClient.get<{ entries: any[] }>('/api/v1/arena/leaderboard', {
      params: { limit },
    });
    return (response.data.entries || []).map(normalizeArenaLeaderboardEntry);
  },

  getArenaStats: async (userId: string): Promise<ArenaPlayerStats> => {
    const response = await apiClient.get<{ stats: any }>(`/api/v1/arena/stats/${userId}`);
    return normalizeArenaPlayerStats(response.data.stats);
  },

  getArenaStatsBatch: async (userIds: string[]): Promise<Record<string, ArenaPlayerStats>> => {
    const response = await apiClient.post<{ stats: Record<string, any> }>('/api/v1/arena/stats/batch', {
      userIds,
    });
    const statsMap: Record<string, ArenaPlayerStats> = {};
    for (const [userId, stats] of Object.entries(response.data.stats || {})) {
      statsMap[userId] = normalizeArenaPlayerStats(stats);
    }
    return statsMap;
  },

  reportArenaSuspicion: async (matchId: string, reason: string, actorId?: string, guestName?: string): Promise<void> => {
    await apiClient.post('/api/v1/arena/anti-cheat/event', {
      matchId,
      reason,
    }, {
      headers: withGuestArenaHeaders(actorId, guestName),
    });
  },
};
