import {
  ArenaLeaderboardEntry,
  ArenaMatch,
  ArenaPlayer,
  ArenaPlayerStats,
  ArenaQueueState,
  CodeLeaderboardEntry,
  CodeTask,
  CodeTaskCase,
} from '@/entities/CodeRoom/model/types';

export function normalizeTaskDifficulty(value: any): string {
  if (value === 1 || value === 'TASK_DIFFICULTY_EASY' || value === 'easy') return 'easy';
  if (value === 2 || value === 'TASK_DIFFICULTY_MEDIUM' || value === 'medium') return 'medium';
  if (value === 3 || value === 'TASK_DIFFICULTY_HARD' || value === 'hard') return 'hard';
  return '';
}

export function toTaskDifficultyEnum(value?: string): number {
  switch (value) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 0;
  }
}

export function normalizeProgrammingLanguage(value: any): string {
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
    case 8:
    case 'PROGRAMMING_LANGUAGE_SQL':
    case 'sql':
      return 'sql';
    default:
      return 'go';
  }
}

export function toProgrammingLanguageEnum(value?: string): number {
  switch (value) {
    case 'javascript': return 1;
    case 'typescript': return 2;
    case 'python': return 3;
    case 'go': return 4;
    case 'rust': return 5;
    case 'cpp': return 6;
    case 'java': return 7;
    case 'sql': return 8;
    default: return 4;
  }
}

export function normalizePolicyTaskType(value: any, executionProfile?: string): string {
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

export function toTaskTypeEnum(value?: string): number {
  switch (value) {
    case 'debugging':
      return 2;
    case 'refactoring':
      return 3;
    default:
      return 1;
  }
}

export function normalizeArenaDifficulty(value: any): string {
  if (value === 1 || value === 'DIFFICULTY_EASY' || value === 'easy') return 'easy';
  if (value === 2 || value === 'DIFFICULTY_MEDIUM' || value === 'medium') return 'medium';
  if (value === 3 || value === 'DIFFICULTY_HARD' || value === 'hard') return 'hard';
  return '';
}

export function toArenaDifficultyEnum(value?: string): number {
  switch (value) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 0;
  }
}

export function normalizeArenaStatus(value: any): ArenaMatch['status'] {
  if (value === 3 || value === 'ARENA_MATCH_STATUS_FINISHED' || value === 'finished') return 'finished';
  if (value === 2 || value === 'ARENA_MATCH_STATUS_ACTIVE' || value === 'active') return 'active';
  return 'waiting';
}

export function normalizeArenaWinnerReason(value: any): string {
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

export function normalizeArenaSide(value: any): string {
  if (value === 1 || value === 'ARENA_PLAYER_SIDE_LEFT' || value === 'left') return 'left';
  if (value === 2 || value === 'ARENA_PLAYER_SIDE_RIGHT' || value === 'right') return 'right';
  return 'left';
}

export function normalizeArenaLeague(value: any): string {
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

export function normalizeTaskCase(testCase: any): CodeTaskCase {
  return {
    id: testCase?.id || '',
    input: testCase?.input || '',
    expectedOutput: testCase?.expectedOutput || testCase?.expected_output || '',
    isPublic: Boolean(testCase?.isPublic ?? testCase?.is_public),
    weight: Number(testCase?.weight ?? 1),
    order: Number(testCase?.order ?? 0),
  };
}

export function normalizeTask(task: any): CodeTask {
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

export function normalizeLeaderboardEntry(entry: any): CodeLeaderboardEntry {
  return {
    userId: entry?.userId || entry?.user_id || '',
    displayName: entry?.displayName || entry?.display_name || '',
    wins: Number(entry?.wins || 0),
    matches: Number(entry?.matches || 0),
    winRate: Number(entry?.winRate ?? entry?.win_rate ?? 0),
    bestSolveMs: Number(entry?.bestSolveMs ?? entry?.best_solve_ms ?? 0),
  };
}

export function normalizeArenaPlayer(player: any): ArenaPlayer {
  return {
    userId: player?.userId || player?.user_id || '',
    displayName: player?.displayName || player?.display_name || '',
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

export function normalizeArenaMatch(match: any): ArenaMatch {
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

export function normalizeArenaLeaderboardEntry(entry: any): ArenaLeaderboardEntry {
  return {
    userId: entry?.userId || entry?.user_id || '',
    displayName: entry?.displayName || entry?.display_name || '',
    rating: Number(entry?.rating ?? 300),
    league: normalizeArenaLeague(entry?.league),
    wins: Number(entry?.wins ?? 0),
    losses: Number(entry?.losses ?? 0),
    matches: Number(entry?.matches ?? 0),
    winRate: Number(entry?.winRate ?? entry?.win_rate ?? 0),
    bestRuntime: Number(entry?.bestRuntime ?? entry?.best_runtime ?? 0),
  };
}

export function normalizeArenaQueueState(state: any): ArenaQueueState {
  return {
    status: state?.status || 'idle',
    topic: state?.topic || '',
    difficulty: normalizeArenaDifficulty(state?.difficulty),
    queuedAt: state?.queuedAt || state?.queued_at || '',
    queueSize: Number(state?.queueSize ?? state?.queue_size ?? 0),
    match: state?.match ? normalizeArenaMatch(state.match) : undefined,
  };
}

export function normalizeArenaPlayerStats(stats: any): ArenaPlayerStats {
  return {
    userId: stats?.userId || stats?.user_id || '',
    displayName: stats?.displayName || stats?.display_name || '',
    rating: Number(stats?.rating ?? 300),
    league: normalizeArenaLeague(stats?.league),
    wins: Number(stats?.wins ?? 0),
    losses: Number(stats?.losses ?? 0),
    matches: Number(stats?.matches ?? 0),
    winRate: Number(stats?.winRate ?? stats?.win_rate ?? 0),
    bestRuntime: Number(stats?.bestRuntime ?? stats?.best_runtime ?? 0),
  };
}
