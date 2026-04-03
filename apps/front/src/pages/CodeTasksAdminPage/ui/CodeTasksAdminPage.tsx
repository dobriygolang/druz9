import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { CodeTask, CodeTaskCase } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { AxiosError } from '@/shared/api/base';

import {
  CodeTasksAdminHero,
  CodeTasksAdminListSection,
  CodeTasksAdminModal,
} from './components/CodeTasksAdminSections';
import {
  TaskFormState,
  buildTaskPayload,
  createEmptyCase,
  createEmptyTaskForm,
  normalizePolicyFields,
  taskToForm,
} from './lib/codeTasksAdminHelpers';

export const CodeTasksAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(createEmptyTaskForm());
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const isAdmin = Boolean(user?.isAdmin);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await codeRoomApi.listTasks({
        topic: topicFilter,
        difficulty: difficultyFilter,
        includeInactive: true,
      });
      setTasks(data);
    } catch (e) {
      const axiosErr = e as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, [difficultyFilter, topicFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(query)
      || task.slug.toLowerCase().includes(query)
      || task.statement.toLowerCase().includes(query),
    );
  }, [search, tasks]);

  const activeTasksCount = useMemo(() => tasks.filter((task) => task.isActive).length, [tasks]);
  const existingTopics = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => task.topics))).sort(),
    [tasks],
  );

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskForm(createEmptyTaskForm());
  };

  const openCreateTaskModal = (task?: CodeTask) => {
    setTaskForm(task ? taskToForm(task) : createEmptyTaskForm());
    setShowTaskModal(true);
  };

  const updateTaskCase = (
    key: 'publicTestCases' | 'hiddenTestCases',
    index: number,
    field: keyof CodeTaskCase,
    value: string | number | boolean,
  ) => {
    setTaskForm((prev) => {
      const nextCases = [...prev[key]];
      nextCases[index] = { ...nextCases[index], [field]: value };
      return { ...prev, [key]: nextCases };
    });
  };

  const addTaskCase = (key: 'publicTestCases' | 'hiddenTestCases', isPublic: boolean) => {
    setTaskForm((prev) => ({
      ...prev,
      [key]: [...prev[key], createEmptyCase(isPublic, prev[key].length + 1)],
    }));
  };

  const removeTaskCase = (key: 'publicTestCases' | 'hiddenTestCases', index: number) => {
    setTaskForm((prev) => {
      const nextCases = prev[key].filter((_, currentIndex) => currentIndex !== index);
      return {
        ...prev,
        [key]: nextCases.length > 0 ? nextCases : [createEmptyCase(key === 'publicTestCases', 1)],
      };
    });
  };

  const handleSaveTask = async () => {
    const normalizedForm = normalizePolicyFields(taskForm);
    const payload = buildTaskPayload(normalizedForm);
    if (!payload.title || !payload.statement) {
      return;
    }
    if ((payload.executionProfile === 'http_client' || payload.executionProfile === 'interview_realistic')
      && payload.allowedHosts.length === 0
      && payload.mockEndpoints.length === 0) {
      return;
    }

    setSavingTask(true);
    try {
      setTaskForm(normalizedForm);
      if (taskForm.id) {
        await codeRoomApi.adminUpdateTask(taskForm.id, payload);
      } else {
        await codeRoomApi.adminCreateTask(payload);
      }
      closeTaskModal();
      await loadTasks();
    } catch (e) {
      console.error('Failed to save task:', e);
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await codeRoomApi.adminDeleteTask(taskId);
      await loadTasks();
    } catch (e) {
      console.error('Failed to delete task:', e);
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/code-rooms" replace />;
  }

  return (
    <div className="code-rooms-page code-admin-page">
      <CodeTasksAdminHero
        tasksCount={tasks.length}
        activeTasksCount={activeTasksCount}
        filteredTasksCount={filteredTasks.length}
        onCreate={() => openCreateTaskModal()}
      />

      <CodeTasksAdminListSection
        loading={loading}
        error={error}
        search={search}
        topicFilter={topicFilter}
        difficultyFilter={difficultyFilter}
        filteredTasks={filteredTasks}
        deletingTaskId={deletingTaskId}
        setSearch={setSearch}
        setTopicFilter={setTopicFilter}
        setDifficultyFilter={setDifficultyFilter}
        onEdit={openCreateTaskModal}
        onDelete={(taskId) => void handleDeleteTask(taskId)}
      />

      <CodeTasksAdminModal
        isOpen={showTaskModal}
        taskForm={taskForm}
        savingTask={savingTask}
        existingTopics={existingTopics}
        onClose={closeTaskModal}
        onSave={() => void handleSaveTask()}
        setTaskForm={setTaskForm}
        updateTaskCase={updateTaskCase}
        addTaskCase={addTaskCase}
        removeTaskCase={removeTaskCase}
      />
    </div>
  );
};
