import React from 'react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { CodeTask, CodeTaskCase } from '@/entities/CodeRoom/model/types';
import { FancySelect } from '@/shared/ui/FancySelect';

import {
  DIFFICULTIES,
  DUEL_TOPICS,
  EXECUTION_PROFILE_OPTIONS,
  LANGUAGE_OPTIONS,
  POLICY_HELP,
  POLICY_PRESET_BY_TASK_TYPE,
  POLICY_TEMPLATES,
  RUNNER_MODE_OPTIONS,
  TASK_TYPE_OPTIONS,
  TaskFormState,
  normalizePolicyFields,
  normalizeRunnerMode,
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
                  <span className="badge task-policy-badge">{task.executionProfile}</span>
                  <span className="badge task-policy-badge task-policy-badge--muted">{task.taskType}</span>
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
  showPolicyHelp: boolean;
  policySummary: string;
  policyWarnings: string[];
  showFilesystemPolicy: boolean;
  showNetworkPolicy: boolean;
  selectedPolicyHelp: (typeof POLICY_HELP)[keyof typeof POLICY_HELP];
  onClose: () => void;
  onSave: () => void;
  setShowPolicyHelp: React.Dispatch<React.SetStateAction<boolean>>;
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  updateTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', index: number, field: keyof CodeTaskCase, value: string | number | boolean) => void;
  addTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', isPublic: boolean) => void;
  removeTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', index: number) => void;
};

export const CodeTasksAdminModal: React.FC<ModalProps> = ({
  isOpen,
  taskForm,
  savingTask,
  showPolicyHelp,
  policySummary,
  policyWarnings,
  showFilesystemPolicy,
  showNetworkPolicy,
  selectedPolicyHelp,
  onClose,
  onSave,
  setShowPolicyHelp,
  setTaskForm,
  updateTaskCase,
  addTaskCase,
  removeTaskCase,
}) => {
  if (!isOpen) {
    return null;
  }

  const networkDisabled = (taskForm.executionProfile === 'http_client' || taskForm.executionProfile === 'interview_realistic')
    && !taskForm.allowedHosts.trim()
    && !taskForm.mockEndpoints.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl code-admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-card__header">
          <div>
            <h2>{taskForm.id ? 'Редактировать задачу' : 'Новая задача'}</h2>
            <p className="dashboard-card__subtitle">Statement, starter code, public/hidden tests и включение задачи в random duel.</p>
          </div>
          <ShieldCheck size={18} />
        </div>

        <div className="task-editor-grid">
          <div className="form-group">
            <label>Название</label>
            <input className="input" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Slug</label>
            <input className="input" value={taskForm.slug} onChange={(e) => setTaskForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="Если пусто, соберется из title" />
          </div>
          <div className="form-group">
            <label>Сложность</label>
            <FancySelect
              value={taskForm.difficulty}
              options={DIFFICULTIES.filter(Boolean).map((difficulty) => ({ value: difficulty, label: difficulty }))}
              onChange={(difficulty) => setTaskForm((prev) => ({ ...prev, difficulty }))}
            />
          </div>
          <div className="form-group">
            <label>Topics через запятую</label>
            <input className="input" value={taskForm.topics} onChange={(e) => setTaskForm((prev) => ({ ...prev, topics: e.target.value }))} placeholder="two-pointers, linked-list" />
          </div>
          <div className="form-group">
            <label>Language</label>
            <FancySelect
              value={taskForm.language}
              options={[...LANGUAGE_OPTIONS]}
              onChange={(language) => setTaskForm((prev) => ({ ...prev, language }))}
            />
          </div>
          <div className="form-group">
            <label>Task type</label>
            <FancySelect
              value={taskForm.taskType}
              options={[...TASK_TYPE_OPTIONS]}
              onChange={(taskType) => setTaskForm((prev) => ({
                ...normalizeRunnerMode(normalizePolicyFields({
                  ...prev,
                  taskType,
                  executionProfile: POLICY_PRESET_BY_TASK_TYPE[taskType] || prev.executionProfile,
                })),
              }))}
            />
          </div>
          <div className="form-group">
            <label>Execution profile</label>
            <FancySelect
              value={taskForm.executionProfile}
              options={[...EXECUTION_PROFILE_OPTIONS]}
              onChange={(executionProfile) => setTaskForm((prev) => normalizeRunnerMode(normalizePolicyFields({ ...prev, executionProfile })))}
            />
          </div>
          <div className="form-group">
            <label>Runner mode</label>
            <FancySelect
              value={taskForm.runnerMode}
              options={[...RUNNER_MODE_OPTIONS]}
              onChange={(runnerMode) => setTaskForm((prev) => normalizeRunnerMode({ ...prev, runnerMode }))}
            />
          </div>
          <div className="form-group">
            <label>Duration (seconds) for arena</label>
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
          <div className="form-group">
            <label>Runtime contract</label>
            <div className="task-policy-empty">
              {taskForm.runnerMode === 'function_io'
                ? 'Пользователь пишет `func solve(input string) string`. Sandbox сам подставляет hidden main и передает stdin как строку.'
                : 'Пользователь пишет обычный `func main()` и сам работает со stdin/stdout.'}
            </div>
          </div>
        </div>

        <div className="task-policy-panel">
          <div className="task-policy-panel__header">
            <div>
              <strong>Policy layer</strong>
              <div className="dashboard-card__subtitle">Явные capabilities задачи. Без скрытых эвристик по title или topics.</div>
            </div>
            <div className="task-policy-panel__header-actions">
              <span className="badge task-policy-badge">{policySummary}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPolicyHelp((current) => !current)}>
                {showPolicyHelp ? 'Скрыть help' : 'Показать help'}
              </button>
            </div>
          </div>
          <div className="task-policy-templates">
            {POLICY_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTaskForm((prev) => normalizePolicyFields(template.apply(prev)))}
              >
                {template.label}
              </button>
            ))}
          </div>
          {showPolicyHelp && (
            <div className="task-policy-help">
              <div className="task-policy-help__summary">
                <strong>{selectedPolicyHelp.title}</strong>
                <span>{selectedPolicyHelp.summary}</span>
              </div>
              <div className="task-policy-help__grid">
                <div className="task-policy-help__card">
                  <div className="task-policy-help__label">Разрешено</div>
                  {selectedPolicyHelp.allows.map((item) => (
                    <div key={item} className="task-policy-help__item">{item}</div>
                  ))}
                </div>
                <div className="task-policy-help__card">
                  <div className="task-policy-help__label">Запрещено</div>
                  {selectedPolicyHelp.forbids.map((item) => (
                    <div key={item} className="task-policy-help__item">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {policyWarnings.length > 0 && (
            <div className="task-policy-warning-list">
              {policyWarnings.map((warning) => (
                <div key={warning} className="task-policy-warning">{warning}</div>
              ))}
            </div>
          )}
          {(showFilesystemPolicy || showNetworkPolicy) ? (
            <>
              <div className="task-policy-grid">
                {showFilesystemPolicy && (
                  <>
                    <div className="form-group">
                      <label>Fixture files</label>
                      <input className="input" value={taskForm.fixtureFiles} onChange={(e) => setTaskForm((prev) => ({ ...prev, fixtureFiles: e.target.value }))} placeholder="fixtures/input.txt, fixtures/cases.json" />
                    </div>
                    <div className="form-group">
                      <label>Readable paths</label>
                      <input className="input" value={taskForm.readablePaths} onChange={(e) => setTaskForm((prev) => ({ ...prev, readablePaths: e.target.value }))} placeholder="fixtures, data/sample.txt" />
                    </div>
                    <div className="form-group">
                      <label>Writable paths</label>
                      <input className="input" value={taskForm.writablePaths} onChange={(e) => setTaskForm((prev) => ({ ...prev, writablePaths: e.target.value }))} placeholder="tmp/output.txt" />
                    </div>
                  </>
                )}
                {showNetworkPolicy && (
                  <>
                    <div className="form-group">
                      <label>Allowed hosts</label>
                      <input className="input" value={taskForm.allowedHosts} onChange={(e) => setTaskForm((prev) => ({ ...prev, allowedHosts: e.target.value }))} placeholder="mock.local, api.internal" />
                    </div>
                    <div className="form-group">
                      <label>Allowed ports</label>
                      <input className="input" value={taskForm.allowedPorts} onChange={(e) => setTaskForm((prev) => ({ ...prev, allowedPorts: e.target.value }))} placeholder="80, 443, 8080" />
                    </div>
                    <div className="form-group">
                      <label>Mock endpoints</label>
                      <input className="input" value={taskForm.mockEndpoints} onChange={(e) => setTaskForm((prev) => ({ ...prev, mockEndpoints: e.target.value }))} placeholder="http://mock.local/users, http://mock.local/ping" />
                    </div>
                  </>
                )}
              </div>
              {showFilesystemPolicy && (
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={taskForm.writableTempDir}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, writableTempDir: e.target.checked }))}
                  />
                  Разрешить запись во временную директорию
                </label>
              )}
            </>
          ) : (
            <div className="task-policy-empty">
              Для профиля <strong>{taskForm.executionProfile}</strong> дополнительные filesystem/network поля не нужны.
            </div>
          )}
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

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={onSave} disabled={savingTask || networkDisabled}>
            {savingTask ? 'Сохранение...' : taskForm.id ? 'Сохранить' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </div>
  );
};
