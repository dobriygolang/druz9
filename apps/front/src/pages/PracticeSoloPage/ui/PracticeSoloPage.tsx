import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Loader2, Search, Shuffle, Terminal, Zap } from 'lucide-react';

import { CodeTask } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  easy: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.2)' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  hard: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.2)' },
};

export const PracticeSoloPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    codeRoomApi.listTasks({ includeInactive: false })
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allTopics = useMemo(
    () => Array.from(new Set(tasks.flatMap((t) => t.topics))).sort(),
    [tasks],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (difficulty && t.difficulty !== difficulty) return false;
      if (topic && !t.topics.includes(topic)) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, difficulty, topic]);

  const startSolo = useCallback(async (task: CodeTask) => {
    setStartingTaskId(task.id);
    try {
      const room = await codeRoomApi.createRoom({
        mode: 'all',
        topic: task.topics[0] ?? '',
        difficulty: task.difficulty,
      });
      navigate(`/code-rooms/${room.id}`);
    } catch (e) {
      console.error('Failed to create solo room', e);
    } finally {
      setStartingTaskId(null);
    }
  }, [navigate]);

  const startRandom = useCallback(async () => {
    if (filtered.length === 0) return;
    const task = filtered[Math.floor(Math.random() * filtered.length)];
    await startSolo(task);
  }, [filtered, startSolo]);

  const easyCount = tasks.filter((t) => t.difficulty === 'easy').length;
  const mediumCount = tasks.filter((t) => t.difficulty === 'medium').length;
  const hardCount = tasks.filter((t) => t.difficulty === 'hard').length;

  return (
    <div className="solo-page fade-in">
      {/* Header */}
      <div className="solo-page__header">
        <div className="solo-page__header-copy">
          <div className="solo-page__header-icon">
            <Terminal size={22} />
          </div>
          <div>
            <h2 className="solo-page__title">Solo Practice</h2>
            <p className="solo-page__subtitle">Выбери задачу и начни персональную сессию в своей комнате</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void startRandom()}
          disabled={loading || filtered.length === 0}
        >
          <Shuffle size={15} />
          Случайная задача
        </button>
      </div>

      {/* Difficulty pills */}
      <div className="solo-page__diff-row">
        {[
          { value: '', label: 'Все', count: tasks.length },
          { value: 'easy', label: 'Easy', count: easyCount },
          { value: 'medium', label: 'Medium', count: mediumCount },
          { value: 'hard', label: 'Hard', count: hardCount },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`solo-diff-pill ${difficulty === opt.value ? 'is-active' : ''}`}
            onClick={() => setDifficulty(opt.value)}
          >
            {opt.label}
            <span className="solo-diff-pill__count">{loading ? '—' : opt.count}</span>
          </button>
        ))}
      </div>

      {/* Search + topic filter */}
      <div className="solo-page__filters">
        <div className="solo-page__search-wrap">
          <Search size={15} className="solo-page__search-icon" />
          <input
            type="text"
            className="input solo-page__search"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {allTopics.length > 0 && (
          <select
            className="input solo-page__topic-select"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">Все темы</option>
            {allTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {/* Task grid */}
      {loading ? (
        <div className="solo-page__loading">
          <Loader2 size={24} className="spin" />
          <span>Загружаем задачи...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="solo-page__empty">
          <Code2 size={32} />
          <span>Задачи не найдены</span>
          <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setDifficulty(''); setTopic(''); }}>
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="solo-task-grid">
          {filtered.map((task) => {
            const diffStyle = DIFFICULTY_STYLE[task.difficulty] || DIFFICULTY_STYLE.easy;
            const isStarting = startingTaskId === task.id;
            return (
              <div key={task.id} className="solo-task-card">
                <div className="solo-task-card__header">
                  <span
                    className="solo-task-card__diff"
                    style={{ background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}
                  >
                    {DIFFICULTY_LABELS[task.difficulty] || task.difficulty}
                  </span>
                  {task.taskType && task.taskType !== 'algorithm' && (
                    <span className="solo-task-card__type">{task.taskType}</span>
                  )}
                </div>

                <h3 className="solo-task-card__title">{task.title}</h3>

                {task.topics.length > 0 && (
                  <div className="solo-task-card__topics">
                    {task.topics.slice(0, 4).map((t) => (
                      <span key={t} className="solo-task-card__topic">{t}</span>
                    ))}
                    {task.topics.length > 4 && (
                      <span className="solo-task-card__topic solo-task-card__topic--more">
                        +{task.topics.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary solo-task-card__start"
                  onClick={() => void startSolo(task)}
                  disabled={isStarting || startingTaskId !== null}
                >
                  {isStarting ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Запуск...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Решить
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
