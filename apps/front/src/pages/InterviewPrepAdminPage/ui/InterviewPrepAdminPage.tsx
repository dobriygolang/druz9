import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  interviewPrepApi,
  InterviewPrepMockCompanyPreset,
  InterviewPrepMockQuestionPoolItem,
  InterviewPrepQuestion,
  InterviewPrepTask,
  InterviewPrepType,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { CodeTask } from '@/entities/CodeRoom/model/types';
import {
  InterviewPrepAdminHero,
  InterviewPrepAdminTaskSection,
  InterviewPrepQuestionModal,
  InterviewPrepTaskModal,
  MockCompanyPresetsSection,
  MockQuestionPoolsSection,
} from './components/InterviewPrepAdminSections';
import {
  createEmptyMockCompanyPresetForm,
  createEmptyMockQuestionPoolForm,
  createEmptyQuestionForm,
  createEmptyTaskForm,
  MockCompanyPresetFormState,
  MockQuestionPoolFormState,
  QuestionFormState,
  TaskFormState,
  taskToForm,
  toSlug,
} from './lib/interviewPrepAdminPageHelpers';

export const InterviewPrepAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [codeTasks, setCodeTasks] = useState<CodeTask[]>([]);
  const [questions, setQuestions] = useState<InterviewPrepQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mockQuestionPools, setMockQuestionPools] = useState<InterviewPrepMockQuestionPoolItem[]>([]);
  const [mockCompanyPresets, setMockCompanyPresets] = useState<InterviewPrepMockCompanyPreset[]>([]);
  const [search, setSearch] = useState('');
  const [prepTypeFilter, setPrepTypeFilter] = useState<'all' | InterviewPrepType>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [taskForm, setTaskForm] = useState<TaskFormState>(createEmptyTaskForm());
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(createEmptyQuestionForm());
  const [mockQuestionPoolForm, setMockQuestionPoolForm] = useState<MockQuestionPoolFormState>(createEmptyMockQuestionPoolForm());
  const [mockCompanyPresetForm, setMockCompanyPresetForm] = useState<MockCompanyPresetFormState>(createEmptyMockCompanyPresetForm());

  const isAdmin = Boolean(user?.isAdmin);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (prepTypeFilter !== 'all' && task.prepType !== prepTypeFilter) {
        return false;
      }
      if (companyFilter !== 'all' && (task.companyTag || 'general') !== companyFilter) {
        return false;
      }
      if (!query) return true;
      return [task.title, task.slug, task.statement, task.prepType, task.companyTag, ...(task.supportedLanguages || [])]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [companyFilter, prepTypeFilter, search, tasks]);

  const companyOptions = useMemo(() => ['all', ...Array.from(new Set(tasks.map((task) => task.companyTag || 'general'))).sort()], [tasks]);

  const sortedQuestions = useMemo(
    () => [...questions].sort((left, right) => left.position - right.position),
    [questions],
  );

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await interviewPrepApi.adminListTasks();
      setTasks(data);
      const availableCodeTasks = await codeRoomApi.listTasks({ includeInactive: true });
      setCodeTasks(availableCodeTasks);
      const [questionPoolsData, companyPresetsData] = await Promise.all([
        interviewPrepApi.adminListMockQuestionPools(),
        interviewPrepApi.adminListMockCompanyPresets(),
      ]);
      setMockQuestionPools(questionPoolsData);
      setMockCompanyPresets(companyPresetsData);
    } catch (e: any) {
      console.error('Failed to load interview prep tasks:', e);
      setError(e.response?.data?.error || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (taskId: string) => {
    try {
      const data = await interviewPrepApi.adminListQuestions(taskId);
      setQuestions(data);
      return data;
    } catch (e: any) {
      console.error('Failed to load interview prep questions:', e);
      setError(e.response?.data?.error || 'Не удалось загрузить вопросы');
      return [];
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  const openCreateTaskModal = (task?: InterviewPrepTask) => {
    setStatus('');
    setError('');
    setTaskForm(task ? taskToForm(task) : createEmptyTaskForm());
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskForm(createEmptyTaskForm());
  };

  const openQuestionModal = async (task: InterviewPrepTask) => {
    setStatus('');
    setError('');
    setSelectedTaskId(task.id);
    const items = await loadQuestions(task.id);
    setQuestionForm(createEmptyQuestionForm(items.length + 1));
    setQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setSelectedTaskId(null);
    setQuestions([]);
    setQuestionForm(createEmptyQuestionForm());
  };

  const handleTaskTitleChange = (title: string) => {
    setTaskForm((prev) => ({
      ...prev,
      title,
      slug: prev.id || prev.slug ? prev.slug : toSlug(title),
    }));
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !taskForm.statement.trim()) {
      setError('Заполни название и условие задачи.');
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        ...taskForm,
        slug: toSlug(taskForm.slug || taskForm.title),
        companyTag: taskForm.companyTag || 'general',
        supportedLanguages: taskForm.language === 'system_design'
          ? []
          : (taskForm.supportedLanguages.length ? taskForm.supportedLanguages : [taskForm.language]),
        executionProfile: taskForm.executionProfile || 'pure',
        runnerMode: taskForm.runnerMode || 'function_io',
        codeTaskId: taskForm.codeTaskId || undefined,
      };
      if (taskForm.id) {
        await interviewPrepApi.adminUpdateTask(taskForm.id, payload);
        setStatus('Задача обновлена.');
      } else {
        await interviewPrepApi.adminCreateTask(payload);
        setStatus('Задача создана.');
      }
      closeTaskModal();
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save interview prep task:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить задачу');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingId(taskId);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteTask(taskId);
      setStatus('Задача удалена.');
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to delete interview prep task:', e);
      setError(e.response?.data?.error || 'Не удалось удалить задачу');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedTaskId) return;
    if (!questionForm.prompt.trim() || !questionForm.answer.trim()) {
      setError('Для вопроса нужны и prompt, и answer.');
      return;
    }
    if (questionForm.position < 1) {
      setError('Позиция вопроса должна быть больше нуля.');
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      if (questionForm.id) {
        await interviewPrepApi.adminUpdateQuestion(selectedTaskId, questionForm.id, questionForm);
        setStatus('Вопрос обновлен.');
      } else {
        await interviewPrepApi.adminCreateQuestion(selectedTaskId, questionForm);
        setStatus('Вопрос добавлен.');
      }
      const data = await loadQuestions(selectedTaskId);
      setQuestionForm(createEmptyQuestionForm(data.length + 1));
    } catch (e: any) {
      console.error('Failed to save interview prep question:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить вопрос');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTaskId) return;
    setDeletingId(questionId);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteQuestion(selectedTaskId, questionId);
      setStatus('Вопрос удален.');
      const data = await loadQuestions(selectedTaskId);
      setQuestionForm(createEmptyQuestionForm(data.length + 1));
    } catch (e: any) {
      console.error('Failed to delete interview prep question:', e);
      setError(e.response?.data?.error || 'Не удалось удалить вопрос');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveMockQuestionPool = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        topic: mockQuestionPoolForm.topic.trim(),
        companyTag: mockQuestionPoolForm.companyTag.trim().toLowerCase(),
        questionKey: mockQuestionPoolForm.questionKey.trim(),
        prompt: mockQuestionPoolForm.prompt.trim(),
        referenceAnswer: mockQuestionPoolForm.referenceAnswer.trim(),
        position: mockQuestionPoolForm.position,
        alwaysAsk: mockQuestionPoolForm.alwaysAsk,
        isActive: mockQuestionPoolForm.isActive,
      };
      if (mockQuestionPoolForm.id) {
        await interviewPrepApi.adminUpdateMockQuestionPool(mockQuestionPoolForm.id, payload);
        setStatus('Question pool обновлён.');
      } else {
        await interviewPrepApi.adminCreateMockQuestionPool(payload);
        setStatus('Question pool создан.');
      }
      setMockQuestionPoolForm(createEmptyMockQuestionPoolForm());
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save mock question pool:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить question pool');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMockQuestionPool = async (id: string) => {
    setDeletingId(id);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteMockQuestionPool(id);
      setStatus('Question pool удалён.');
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to delete mock question pool:', e);
      setError(e.response?.data?.error || 'Не удалось удалить question pool');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveMockCompanyPreset = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        companyTag: mockCompanyPresetForm.companyTag.trim().toLowerCase(),
        stageKind: mockCompanyPresetForm.stageKind,
        position: mockCompanyPresetForm.position,
        taskSlugPattern: mockCompanyPresetForm.taskSlugPattern.trim(),
        aiModelOverride: mockCompanyPresetForm.aiModelOverride.trim(),
        isActive: mockCompanyPresetForm.isActive,
      };
      if (mockCompanyPresetForm.id) {
        await interviewPrepApi.adminUpdateMockCompanyPreset(mockCompanyPresetForm.id, payload);
        setStatus('Company preset обновлён.');
      } else {
        await interviewPrepApi.adminCreateMockCompanyPreset(payload);
        setStatus('Company preset создан.');
      }
      setMockCompanyPresetForm(createEmptyMockCompanyPresetForm());
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save mock company preset:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить company preset');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMockCompanyPreset = async (id: string) => {
    setDeletingId(id);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteMockCompanyPreset(id);
      setStatus('Company preset удалён.');
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to delete mock company preset:', e);
      setError(e.response?.data?.error || 'Не удалось удалить company preset');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="code-rooms-page code-admin-page">
        <InterviewPrepAdminHero onCreateTask={() => openCreateTaskModal()} />

        {(error || status) && (
          <section className="card dashboard-card">
            {error && <div className="error-text">{error}</div>}
            {!error && status && <div className="success-text">{status}</div>}
          </section>
        )}

        <InterviewPrepAdminTaskSection
          loading={loading}
          filteredTasks={filteredTasks}
          search={search}
          prepTypeFilter={prepTypeFilter}
          companyFilter={companyFilter}
          companyOptions={companyOptions}
          deletingId={deletingId}
          onSearchChange={setSearch}
          onPrepTypeFilterChange={setPrepTypeFilter}
          onCompanyFilterChange={setCompanyFilter}
          onOpenQuestions={(task) => void openQuestionModal(task)}
          onEditTask={openCreateTaskModal}
          onDeleteTask={(taskId) => void handleDeleteTask(taskId)}
        />

        <MockQuestionPoolsSection
          form={mockQuestionPoolForm}
          items={mockQuestionPools}
          saving={saving}
          deletingId={deletingId}
          onFormChange={setMockQuestionPoolForm}
          onSave={() => void handleSaveMockQuestionPool()}
          onReset={() => setMockQuestionPoolForm(createEmptyMockQuestionPoolForm())}
          onDelete={(id) => void handleDeleteMockQuestionPool(id)}
        />

        <MockCompanyPresetsSection
          form={mockCompanyPresetForm}
          items={mockCompanyPresets}
          saving={saving}
          deletingId={deletingId}
          onFormChange={setMockCompanyPresetForm}
          onSave={() => void handleSaveMockCompanyPreset()}
          onReset={() => setMockCompanyPresetForm(createEmptyMockCompanyPresetForm())}
          onDelete={(id) => void handleDeleteMockCompanyPreset(id)}
        />
      </div>

      <InterviewPrepTaskModal
        open={taskModalOpen}
        saving={saving}
        form={taskForm}
        codeTasks={codeTasks}
        onClose={closeTaskModal}
        onSave={() => void handleSaveTask()}
        onTitleChange={handleTaskTitleChange}
        onFormChange={setTaskForm}
      />

      <InterviewPrepQuestionModal
        open={questionModalOpen}
        saving={saving}
        deletingId={deletingId}
        selectedTask={selectedTask}
        sortedQuestions={sortedQuestions}
        form={questionForm}
        onClose={closeQuestionModal}
        onSave={() => void handleSaveQuestion()}
        onDelete={(questionId) => void handleDeleteQuestion(questionId)}
        onFormChange={setQuestionForm}
      />
    </>
  );
};
