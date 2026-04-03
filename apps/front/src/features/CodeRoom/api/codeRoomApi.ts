import { apiClient, withGuestArenaHeaders, withGuestCodeRoomHeaders } from '@/shared/api/base';
import { markGuestCodeRoomSession } from '@/features/CodeRoom/lib/guestIdentity';
import { normalizeRoom } from '@/features/CodeRoom/api/codeRoomMappers';
import {
  ArenaPlayerStats,
  ArenaQueueState,
  ArenaLeaderboardEntry,
  ArenaMatch,
  CodeLeaderboardEntry,
  CodeRoom,
  CodeRoomMode,
  CodeTask,
  CodeTaskCase,
  RunCodeResponse,
  Submission,
  roomModeToEnum,
} from '@/entities/CodeRoom/model/types';
import {
  normalizeArenaLeaderboardEntry,
  normalizeArenaMatch,
  normalizeArenaPlayerStats,
  normalizeArenaQueueState,
  normalizeLeaderboardEntry,
  normalizeTask,
  toArenaDifficultyEnum,
  toProgrammingLanguageEnum,
  toTaskDifficultyEnum,
  toTaskTypeEnum,
} from '@/features/CodeRoom/api/codeRoomApiNormalizers';

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
