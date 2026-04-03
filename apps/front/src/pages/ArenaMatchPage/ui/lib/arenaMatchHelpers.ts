import { ArenaMatch, ArenaPlayer } from '@/entities/CodeRoom/model/types';

export const ARENA_RULES = [
  'Матч завершается, когда оба игрока получили accepted, либо когда истёк таймер.',
  'Если только один игрок получил accepted к концу таймера, побеждает он.',
  'После wrong answer или runtime error включается freeze на 30 секунд.',
  'Рейтинг начисляется только авторизованным пользователям.',
  'Изменение ELO не фиксированное: максимум +50 или -50, точное число зависит от разницы рейтингов.',
  'Лиги арены: Bronze, Silver, Gold, Diamond, Master, Legend.',
  'Anti-cheat: переключение вкладки и попытки paste во время матча логируются.',
  'После завершения матча оба игрока видят решения друг друга.',
  'Зритель видит оба редактора, но не может менять код или отправлять решение.',
];

const TASK_HEADER_MARKER = '// Arena Task';

export const WIN_REASON_LABELS: Record<string, string> = {
  single_ac: 'первый accepted',
  accepted_time: 'раньше по времени',
  runtime: 'быстрее по runtime',
  timeout: 'победа к концу таймера',
  anti_cheat: 'нарушение правил',
  none: 'без победителя',
};

export const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getPlayerCode = (
  player: ArenaPlayer | null,
  playerCodes: Record<string, string>,
  fallback = '',
) => {
  if (!player) {
    return fallback;
  }
  return playerCodes[player.userId] ?? player.currentCode ?? fallback;
};

export const buildArenaEditorTemplate = (match: ArenaMatch | null, code: string) => {
  const baseCode = code || match?.starterCode || '';
  if (!match?.taskStatement) {
    return baseCode;
  }
  if (baseCode.startsWith(TASK_HEADER_MARKER)) {
    return baseCode;
  }

  const commentBlock = [
    `${TASK_HEADER_MARKER}: ${match.taskTitle || 'Duel task'}`,
    '//',
    ...match.taskStatement.split('\n').map((line) => `// ${line}`),
    '',
  ].join('\n');

  return `${commentBlock}\n${baseCode}`.trim();
};

export const buildArenaSubmitError = (result: {
  passedCount: number;
  totalCount: number;
  failedTestIndex?: number;
  failureKind?: string;
  freezeUntil?: string;
  error?: string;
}) => {
  const parts: string[] = ['❌ Решение не прошло проверку.'];
  const errorText = (result.error || '').toLowerCase();

  if (result.failureKind === 'timeout' || errorText.includes('timeout') || errorText.includes('timed out')) {
    parts.push('Превышен лимит времени.');
  } else if (result.failureKind === 'compile_error') {
    parts.push('Ошибка компиляции.');
  } else if (result.failureKind === 'runtime_error') {
    parts.push('Runtime error.');
  } else if (result.failureKind === 'wrong_answer') {
    parts.push('Wrong answer.');
  }

  if (result.error && result.failureKind !== 'wrong_answer' && result.failureKind !== 'timeout') {
    const shortError = result.error.length > 200 ? result.error.slice(0, 200) + '...' : result.error;
    parts.push(shortError);
  }

  parts.push(`Тесты: ${result.passedCount}/${result.totalCount}.`);

  if (result.failedTestIndex && result.failureKind !== 'compile_error') {
    parts.push(`Упал на тесте ${result.failedTestIndex}/${result.totalCount}.`);
  }

  if (result.freezeUntil) {
    parts.push('Следующая отправка через 30 сек.');
  }

  return parts.join(' ');
};
