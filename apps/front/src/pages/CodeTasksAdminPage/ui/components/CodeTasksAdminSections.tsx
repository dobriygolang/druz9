import React from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

import { CodeTask, CodeTaskCase } from '@/entities/CodeRoom/model/types';
import { FancySelect } from '@/shared/ui/FancySelect';

import {
  applyTaskTemplate,
  CODE_TASK_TEMPLATES,
  DIFFICULTIES,
  DUEL_TOPICS,
  TaskFormState,
} from '../lib/codeTasksAdminHelpers';

type HeroProps = {
  tasksCount: number;
  activeTasksCount: number;
  filteredTasksCount: number;
  onCreate: () => void;
};

export const CodeTasksAdminHero: React.FC<HeroProps> = ({
  tasksCount,
  activeTasksCount,
  filteredTasksCount,
  onCreate,
}) => (
  <div className="page-header code-rooms-hero">
    <div className="code-rooms-hero__copy">
      <span className="code-rooms-kicker">Admin</span>
      <h1>Задачи для дуэлей</h1>
      <p className="code-rooms-subtitle">
        Каталог задач, hidden/public тесты, включение в random duel и быстрые фильтры для ручного управления judge.
      </p>
      <p className="code-rooms-subtitle">
        Всего задач: {tasksCount}. Активных: {activeTasksCount}. Под текущими фильтрами: {filteredTasksCount}.
      </p>
    </div>
    <div className="code-rooms-hero__actions">
      <button className="btn btn-primary code-rooms-create-btn" onClick={onCreate}>
        <Plus size={16} />
        <span>Новая задача</span>
      </button>
    </div>
  </div>
);

type ListProps = {
  loading: boolean;
  error: string;
  search: string;
  topicFilter: string;
  difficultyFilter: string;
  filteredTasks: CodeTask[];
  deletingTaskId: string | null;
  setSearch: (value: string) => void;
  setTopicFilter: (value: string) => void;
  setDifficultyFilter: (value: string) => void;
  onEdit: (task: CodeTask) => void;
  onDelete: (taskId: string) => void;
};

export const CodeTasksAdminListSection: React.FC<ListProps> = ({
  loading,
  error,
  search,
  topicFilter,
  difficultyFilter,
  filteredTasks,
  deletingTaskId,
  setSearch,
  setTopicFilter,
  setDifficultyFilter,
  onEdit,
  onDelete,
}) => (
  <section className="card dashboard-card">
    <div className="task-filters code-admin-filters">
      <input
        className="input"
        placeholder="Поиск по title / slug / statement"
        aria-label="Поиск задач"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <FancySelect
        value={topicFilter}
        options={[...DUEL_TOPICS]}
        placeholder="Любая тема"
        onChange={setTopicFilter}
      />
      <FancySelect
        value={difficultyFilter}
        options={[
          { value: '', label: 'Любая сложность' },
          ...DIFFICULTIES.filter(Boolean).map((difficulty) => ({ value: difficulty, label: difficulty })),
        ]}
        placeholder="Любая сложность"
        onChange={setDifficultyFilter}
      />
    </div>

    {loading ? (
      <div className="empty-state compact">Загрузка задач...</div>
    ) : error ? (
      <div className="error-text">{error}</div>
    ) : filteredTasks.length === 0 ? (
      <div className="empty-state compact">Под эти фильтры задач пока нет.</div>
    ) : (
      <div className="task-list">
        {filteredTasks.map((task) => (
          <div key={task.id} className="task-item">
            <div className="task-item__header">
              <div>
                <div className="task-item__title">{task.title}</div>
                <div className="task-item__meta">
                  <span className={`badge task-difficulty task-difficulty-${task.difficulty}`}>{task.difficulty}</span>
                  {task.topics.map((topic) => (
                    <span key={topic} className="topic-chip">{topic}</span>
                  ))}
                  {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                </div>
              </div>
              <div className="task-item__actions">
                <button className="btn-icon" onClick={() => onEdit(task)}>
                  <Pencil size={16} />
                </button>
                <button
                  className="btn-icon danger"
                  onClick={() => onDelete(task.id)}
                  disabled={deletingTaskId === task.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="task-item__statement">{task.statement}</p>
            <div className="task-item__footer">
              <span>{task.publicTestCases.length} public</span>
              <span>{task.hiddenTestCases.length} hidden</span>
              <span>{task.language}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

type ModalProps = {
  isOpen: boolean;
  taskForm: TaskFormState;
  savingTask: boolean;
  existingTopics: string[];
  onClose: () => void;
  onSave: () => void;
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  updateTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', index: number, field: keyof CodeTaskCase, value: string | number | boolean) => void;
  addTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', isPublic: boolean) => void;
  removeTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', index: number) => void;
};

const TopicPicker: React.FC<{
  value: string;
  existingTopics: string[];
  onChange: (value: string) => void;
}> = ({ value, existingTopics, onChange }) => {
  const selected = value.split(',').map((item) => item.trim()).filter(Boolean);
  const [draft, setDraft] = React.useState('');

  const addTopic = (topic: string) => {
    const normalized = topic.trim().toLowerCase();
    if (!normalized || selected.includes(normalized)) return;
    onChange([...selected, normalized].join(', '));
    setDraft('');
  };

  const removeTopic = (topic: string) => {
    onChange(selected.filter((item) => item !== topic).join(', '));
  };

  return (
    <div className="topic-picker">
      <div className="topic-picker__selected">
        {selected.length === 0 ? (
          <span className="interview-prep-muted">Выбери существующий топик или добавь новый.</span>
        ) : selected.map((topic) => (
          <button key={topic} type="button" className="topic-chip topic-chip--interactive" onClick={() => removeTopic(topic)}>
            {topic} <X size={12} />
          </button>
        ))}
      </div>
      <div className="topic-picker__catalog">
        {existingTopics.map((topic) => (
          <button key={topic} type="button" className={`pill-selector__pill ${selected.includes(topic) ? 'active' : ''}`} onClick={() => addTopic(topic)}>
            {topic}
          </button>
        ))}
      </div>
      <div className="topic-picker__create">
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Новый топик"
        />
        <button type="button" className="btn btn-secondary" onClick={() => addTopic(draft)}>Добавить</button>
      </div>
    </div>
  );
};

export const CodeTasksAdminModal: React.FC<ModalProps> = ({
  isOpen,
  taskForm,
  savingTask,
  existingTopics,
  onClose,
  onSave,
  setTaskForm,
  updateTaskCase,
  addTaskCase,
  removeTaskCase,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl code-admin-modal admin-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-card__header admin-modal__header">
          <div>
            <h2>{taskForm.id ? 'Редактировать задачу' : 'Новая задача'}</h2>
            <p className="dashboard-card__subtitle">Statement, starter code, public/hidden tests и включение задачи в random duel.</p>
          </div>
          <div className="admin-modal__header-actions">
            <ShieldCheck size={18} />
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Закрыть">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-scroll-content">
          {!taskForm.id && (
            <div className="admin-template-strip">
              {CODE_TASK_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTaskForm((prev) => applyTaskTemplate(prev, template.key))}
                >
                  {template.label}
                </button>
              ))}
            </div>
          )}

          <div className="task-policy-panel">
            <div className="task-policy-empty">
              Жесткий runtime contract: все задачи в этой админке алгоритмические, `Go`, `pure`, `function_io`, без файлов и без сети. Если в решении кто-то попробует сеть, sandbox ее не даст.
            </div>
          </div>

          <div className="task-editor-grid">
            <div className="form-group">
              <label>Название</label>
              <input className="input" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Сложность</label>
              <FancySelect
                value={taskForm.difficulty}
                options={DIFFICULTIES.filter(Boolean).map((difficulty) => ({ value: difficulty, label: difficulty }))}
                onChange={(difficulty) => setTaskForm((prev) => ({ ...prev, difficulty }))}
              />
            </div>
            <div className="form-group form-group--full">
              <label>Топики</label>
              <TopicPicker value={taskForm.topics} existingTopics={existingTopics} onChange={(topics) => setTaskForm((prev) => ({ ...prev, topics }))} />
            </div>
            <div className="form-group">
              <label>Язык</label>
              <div className="task-policy-empty">Go</div>
            </div>
            <div className="form-group">
              <label>Длительность, сек</label>
              <input
                className="input"
                type="number"
                min="60"
                max="3600"
                value={taskForm.durationSeconds}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, durationSeconds: e.target.value }))}
                placeholder="900"
              />
            </div>
            <div className="form-group form-group--full">
              <label>Формат запуска</label>
              <div className="task-policy-empty">
                Всегда используется шаблон `func solve(input string) string`, stdin передается как строка, ответ сравнивается по stdout.
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Условие</label>
            <textarea className="input textarea" value={taskForm.statement} onChange={(e) => setTaskForm((prev) => ({ ...prev, statement: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Starter code</label>
            <textarea className="input textarea code-textarea" value={taskForm.starterCode} onChange={(e) => setTaskForm((prev) => ({ ...prev, starterCode: e.target.value }))} />
          </div>

          <div className="task-cases-grid">
            {(['publicTestCases', 'hiddenTestCases'] as const).map((key) => {
              const title = key === 'publicTestCases' ? 'Публичные тесты' : 'Скрытые тесты';
              const isPublic = key === 'publicTestCases';
              return (
                <div key={key} className="task-cases-card">
                  <div className="dashboard-card__header">
                    <h3>{title}</h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => addTaskCase(key, isPublic)}>
                      <Plus size={14} />
                      Тест
                    </button>
                  </div>
                  <div className="task-case-list">
                    {taskForm[key].map((testCase, index) => (
                      <div key={`${key}-${index}`} className="task-case-item">
                        <div className="task-case-item__header">
                          <span>Тест #{index + 1}</span>
                          <button className="btn-icon danger" onClick={() => removeTaskCase(key, index)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <textarea
                          className="input textarea"
                          placeholder="stdin"
                          value={testCase.input}
                          onChange={(e) => updateTaskCase(key, index, 'input', e.target.value)}
                        />
                        <textarea
                          className="input textarea"
                          placeholder="expected stdout"
                          value={testCase.expectedOutput}
                          onChange={(e) => updateTaskCase(key, index, 'expectedOutput', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <label className="toggle-field">
            <input
              type="checkbox"
              checked={taskForm.isActive}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Активна и может попадать в random duel
          </label>
        </div>

        <div className="modal-actions admin-modal__actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={onSave} disabled={savingTask}>
            {savingTask ? 'Сохранение...' : taskForm.id ? 'Сохранить' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </div>
  );
};
