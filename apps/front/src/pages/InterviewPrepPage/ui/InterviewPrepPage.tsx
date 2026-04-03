import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

import { interviewPrepApi, InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi';
import {
  InterviewPrepFilters,
  InterviewPrepHero,
  InterviewPrepTaskGroups,
} from './components/InterviewPrepSections';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  TaskCategory,
  TaskModeFilter,
  categoryForTask,
  pickRandomValue,
  shuffledValues,
} from './lib/interviewPrepPageHelpers';

export function InterviewPrepPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [startingCheckpointTaskId, setStartingCheckpointTaskId] = useState<string | null>(null);
  const [startingMock, setStartingMock] = useState(false);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [modeFilter, setModeFilter] = useState<TaskModeFilter>((searchParams.get('mode') as TaskModeFilter) || 'all');
  const [category, setCategory] = useState<TaskCategory>((searchParams.get('category') as TaskCategory) || 'all');
  const [company, setCompany] = useState(searchParams.get('company') ?? 'all');
  const [visibleCounts, setVisibleCounts] = useState<Record<TaskCategory, number>>({
    coding: 2,
    sql: 2,
    system_design: 2,
    all: 2,
  });
  const randomLaunchTriggered = useRef(false);

  useEffect(() => {
    interviewPrepApi.listTasks()
      .then(setTasks)
      .catch((e) => {
        console.error('Failed to load interview prep tasks:', e);
        setError(e.response?.data?.error || 'Не удалось загрузить задачи');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    category === 'all' ? next.delete('category') : next.set('category', category);
    company === 'all' ? next.delete('company') : next.set('company', company);
    modeFilter === 'all' ? next.delete('mode') : next.set('mode', modeFilter);
    search.trim() ? next.set('q', search.trim()) : next.delete('q');
    if (searchParams.get('pick') === 'random') {
      next.set('pick', 'random');
    }
    setSearchParams(next, { replace: true });
  }, [category, company, modeFilter, search, searchParams, setSearchParams]);

  useEffect(() => {
    if (category === 'system_design' && modeFilter === 'executable') {
      setModeFilter('all');
    }
  }, [category, modeFilter]);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      executable: tasks.filter((task) => task.isExecutable).length,
      guidedCount: tasks.filter((task) => !task.isExecutable).length,
    };
  }, [tasks]);

  const tasksForCategoryStats = useMemo(() => {
    return tasks.filter((task) => {
      if (company !== 'all' && task.companyTag !== company) {
        return false;
      }
      if (modeFilter === 'executable' && !task.isExecutable) {
        return false;
      }
      if (modeFilter === 'guided' && task.isExecutable) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const haystack = `${task.title} ${task.statement} ${task.language} ${task.prepType} ${task.companyTag}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [tasks, company, modeFilter, search]);

  const categoryStats = useMemo(() => {
    return CATEGORY_ORDER.map((item) => ({
      key: item,
      label: CATEGORY_LABELS[item],
      count: tasksForCategoryStats.filter((task) => categoryForTask(task) === item).length,
    }));
  }, [tasksForCategoryStats]);

  const companyOptions = useMemo(() => {
    const tags = Array.from(new Set(
      tasks
        .map((task) => task.companyTag?.trim())
        .filter((companyTag): companyTag is string => Boolean(companyTag)),
    )).sort();
    return ['all', ...tags];
  }, [tasks]);

  const availableMockCompanies = useMemo(() => {
    return Array.from(new Set(
      tasks
        .map((task) => task.companyTag?.trim())
        .filter((companyTag): companyTag is string => Boolean(companyTag)),
    )).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskCategory = categoryForTask(task);
      if (category !== 'all' && taskCategory !== category) {
        return false;
      }
      if (company !== 'all' && task.companyTag !== company) {
        return false;
      }
      if (modeFilter === 'executable' && !task.isExecutable) {
        return false;
      }
      if (modeFilter === 'guided' && task.isExecutable) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const haystack = `${task.title} ${task.statement} ${task.language} ${task.prepType} ${task.companyTag}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [tasks, category, company, modeFilter, search]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<TaskCategory, InterviewPrepTask[]>();
    for (const task of filteredTasks) {
      const taskCategory = categoryForTask(task);
      const existing = groups.get(taskCategory) ?? [];
      existing.push(task);
      groups.set(taskCategory, existing);
    }
    return CATEGORY_ORDER
      .map((key) => ({ key, label: CATEGORY_LABELS[key], tasks: groups.get(key) ?? [] }))
      .filter((group) => group.tasks.length > 0);
  }, [filteredTasks]);

  useEffect(() => {
    setVisibleCounts({
      coding: 2,
      sql: 2,
      system_design: 2,
      all: 2,
    });
  }, [category, company, modeFilter, search]);

  const startTask = async (taskId: string) => {
    setError(null);
    setStartingTaskId(taskId);
    try {
      const session = await interviewPrepApi.startSession(taskId);
      navigate(`/growth/interview-prep/${session.id}`);
    } catch (e: any) {
      console.error('Failed to start interview prep session:', e);
      setError(e.response?.data?.error || 'Не удалось начать сессию');
    } finally {
      setStartingTaskId(null);
    }
  };

  const startCheckpoint = async (taskId: string) => {
    setError(null);
    setStartingCheckpointTaskId(taskId);
    try {
      const result = await interviewPrepApi.startCheckpoint(taskId);
      navigate(`/growth/interview-prep/${result.session.id}`);
    } catch (e: any) {
      console.error('Failed to start checkpoint session:', e);
      setError(e.response?.data?.error || 'Не удалось начать checkpoint');
    } finally {
      setStartingCheckpointTaskId(null);
    }
  };

  const startMockInterview = async () => {
    setError(null);
    setStartingMock(true);
    try {
      const effectiveCompany = company === 'all' ? pickRandomValue(availableMockCompanies) : company;
      if (!effectiveCompany) {
        setError('Пока нет доступных компаний для mock interview.');
        return;
      }
      const candidateCompanies = company === 'all'
        ? shuffledValues(availableMockCompanies)
        : [effectiveCompany];
      for (const companyTag of candidateCompanies) {
        try {
          const session = await interviewPrepApi.startMockSession(companyTag);
          navigate(`/growth/interview-prep/mock/${session.id}`);
          return;
        } catch (e: any) {
          const apiError = e.response?.data?.error || '';
          if (!apiError.includes('mock interview task pool is incomplete')) {
            throw e;
          }
        }
      }
      setError(
        company === 'all'
          ? 'Не удалось собрать случайный сценарий. Попробуй выбрать компанию вручную в фильтрах ниже.'
          : 'Для выбранной компании сценарий ещё не полностью собран. Выбери другую компанию или запусти случайную.'
      );
    } catch (e: any) {
      console.error('Failed to start mock interview:', e);
      const apiError = e.response?.data?.error || '';
      if (apiError.includes('mock interview task pool is incomplete')) {
        setError(
          company === 'all'
            ? 'Не удалось собрать случайный сценарий. Попробуй выбрать компанию вручную в фильтрах ниже.'
            : 'Для выбранной компании сценарий ещё не полностью собран. Выбери другую компанию или запусти случайную.'
        );
      } else {
        setError(apiError || 'Не удалось начать mock interview');
      }
    } finally {
      setStartingMock(false);
    }
  };

  const handleRandomStart = async (pool: InterviewPrepTask[]) => {
    const activeTasks = pool.filter((task) => task.isActive);
    if (activeTasks.length === 0) {
      setError('Для выбранного фильтра пока нет активных задач.');
      return;
    }
    const picked = activeTasks[Math.floor(Math.random() * activeTasks.length)];
    await startTask(picked.id);
  };

  const handleRandomCheckpoint = async (pool: InterviewPrepTask[]) => {
    const eligibleTasks = pool.filter((task) => task.isActive && task.isExecutable && task.prepType !== 'system_design' && task.prepType !== 'code_review');
    if (eligibleTasks.length === 0) {
      setError('Для текущего фильтра пока нет задач, подходящих для checkpoint.');
      return;
    }
    const picked = eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)];
    await startCheckpoint(picked.id);
  };

  useEffect(() => {
    if (loading || randomLaunchTriggered.current || searchParams.get('pick') !== 'random') {
      return;
    }
    randomLaunchTriggered.current = true;
    void handleRandomStart(filteredTasks);
  }, [filteredTasks, loading, searchParams]);

  if (loading) {
    return <div className="empty-state compact">Загрузка interview prep...</div>;
  }

  return (
    <div className="code-rooms-page interview-prep-page">
      <InterviewPrepHero
        isMobile={isMobile}
        startingMock={startingMock}
        summary={summary}
        onStartMockInterview={() => void startMockInterview()}
        onStartRandomTask={() => void handleRandomStart(filteredTasks)}
        onStartRandomCheckpoint={() => void handleRandomCheckpoint(filteredTasks)}
        onResetFilters={() => {
          setCategory('all');
          setCompany('all');
          setModeFilter('all');
          setSearch('');
        }}
      />

      <InterviewPrepFilters
        isMobile={isMobile}
        category={category}
        modeFilter={modeFilter}
        company={company}
        companyOptions={companyOptions}
        search={search}
        categoryStats={categoryStats}
        onCategoryChange={(item) => {
          setCategory(item);
          if (item === 'system_design' && modeFilter === 'executable') {
            setModeFilter('all');
          }
        }}
        onModeFilterChange={setModeFilter}
        onCompanyChange={setCompany}
        onSearchChange={setSearch}
      />

      {error && (
        <section className="card dashboard-card">
          <div className="error-text">{error}</div>
        </section>
      )}

      {filteredTasks.length === 0 && !error ? (
        <section className="card dashboard-card">
          <div className="empty-state compact">Под текущий фильтр задач пока нет.</div>
        </section>
      ) : (
        <InterviewPrepTaskGroups
          isMobile={isMobile}
          groupedTasks={groupedTasks}
          visibleCounts={visibleCounts}
          startingTaskId={startingTaskId}
          startingCheckpointTaskId={startingCheckpointTaskId}
          onStartTask={(taskId) => void startTask(taskId)}
          onStartCheckpoint={(taskId) => void startCheckpoint(taskId)}
          onRandomStart={(tasks) => void handleRandomStart(tasks)}
          onShowMore={(groupKey) => setVisibleCounts((current) => ({
            ...current,
            [groupKey]: (current[groupKey] ?? 2) + 2,
          }))}
        />
      )}
    </div>
  );
}
