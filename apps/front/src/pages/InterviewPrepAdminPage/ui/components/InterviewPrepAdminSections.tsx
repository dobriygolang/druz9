import React from 'react';
import { ListChecks, Pencil, Plus, Settings2, ShieldCheck, Trash2, X } from 'lucide-react';

import { CodeTaskCase } from '@/entities/CodeRoom/model/types';
import {
  InterviewPrepMockCompanyPreset,
  InterviewPrepMockQuestionPoolItem,
  InterviewPrepMockStageKind,
  InterviewPrepQuestion,
  InterviewPrepTask,
  InterviewPrepType,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { FancySelect } from '@/shared/ui/FancySelect';

import {
  applyTaskTemplate,
  createEmptyQuestionForm,
  createEmptyCase,
  INTERVIEW_PREP_TEMPLATES,
  languageOptionsForPrepType,
  mockCompanyPresetToForm,
  MockCompanyPresetFormState,
  mockQuestionPoolToForm,
  MockQuestionPoolFormState,
  MOCK_STAGE_OPTIONS,
  PREP_TYPES,
  QuestionFormState,
  questionToForm,
  TaskFormState,
  toSlug,
} from '../lib/interviewPrepAdminPageHelpers';

export function InterviewPrepAdminHero({ onCreateTask }: { onCreateTask: () => void }) {
  return (
    <div className="page-header code-rooms-hero">
      <div className="code-rooms-hero__copy">
        <span className="code-rooms-kicker">Admin</span>
        <h1>Interview Prep задачи</h1>
        <p className="code-rooms-subtitle">
          Управление сценариями подготовки: задача, attached questions, порядок и доступность для trusted-пользователей.
        </p>
      </div>
      <div className="code-rooms-hero__actions">
        <button className="btn btn-primary code-rooms-create-btn" onClick={onCreateTask}>
          <Plus size={16} />
          <span>Новая задача</span>
        </button>
      </div>
    </div>
  );
}

export function InterviewPrepAdminTaskSection({
  loading,
  filteredTasks,
  search,
  prepTypeFilter,
  companyFilter,
  companyOptions,
  deletingId,
  onSearchChange,
  onPrepTypeFilterChange,
  onCompanyFilterChange,
  onOpenQuestions,
  onEditTask,
  onDeleteTask,
}: {
  loading: boolean;
  filteredTasks: InterviewPrepTask[];
  search: string;
  prepTypeFilter: 'all' | InterviewPrepType;
  companyFilter: string;
  companyOptions: string[];
  deletingId: string | null;
  onSearchChange: (value: string) => void;
  onPrepTypeFilterChange: (value: 'all' | InterviewPrepType) => void;
  onCompanyFilterChange: (value: string) => void;
  onOpenQuestions: (task: InterviewPrepTask) => void;
  onEditTask: (task: InterviewPrepTask) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  return (
    <section className="card dashboard-card">
      <div className="task-filters code-admin-filters">
        <input
          className="input"
          placeholder="Поиск по title / slug / type"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <FancySelect
          value={prepTypeFilter}
          options={[
            { value: 'all', label: 'Все типы' },
            ...PREP_TYPES,
          ]}
          onChange={(value) => onPrepTypeFilterChange(value as 'all' | InterviewPrepType)}
        />
        <FancySelect
          value={companyFilter}
          options={companyOptions.map((value) => ({ value, label: value === 'all' ? 'Все группы' : value }))}
          onChange={onCompanyFilterChange}
        />
      </div>

      {loading ? (
        <div className="empty-state compact">Загрузка...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state compact">Задач пока нет.</div>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-item interview-prep-admin-task">
              <div className="task-item__header">
                <div>
                  <div className="task-item__title">{task.title || task.slug || 'Без названия'}</div>
                  <div className="task-item__meta">
                    {task.prepType && <span className="badge">{task.prepType}</span>}
                    {task.language && <span className="badge">{task.language}</span>}
                    <span className="badge">{task.companyTag || 'general'}</span>
                    <span className="badge">{Math.round(task.durationSeconds / 60)} мин</span>
                    {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                  </div>
                </div>
                <div className="task-item__actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => onOpenQuestions(task)}>
                    <ListChecks size={16} />
                    <span>Вопросы</span>
                  </button>
                  <button className="btn-icon" onClick={() => onEditTask(task)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={() => onDeleteTask(task.id)}
                    disabled={deletingId === task.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="interview-prep-admin-task__meta">
                <span><strong>Slug:</strong> {task.slug || 'n/a'}</span>
                <span><strong>Solve:</strong> {(task.supportedLanguages || []).join(', ') || task.language || 'n/a'}</span>
                <span><strong>Profile:</strong> {task.executionProfile || 'n/a'}</span>
                <span><strong>Runner:</strong> {task.runnerMode || 'n/a'}</span>
              </div>
              <p className="task-item__statement">{task.statement || 'Описание ещё не заполнено.'}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function MockQuestionPoolsSection({
  form,
  items,
  saving,
  deletingId,
  onFormChange,
  onSave,
  onReset,
  onDelete,
}: {
  form: MockQuestionPoolFormState;
  items: InterviewPrepMockQuestionPoolItem[];
  saving: boolean;
  deletingId: string | null;
  onFormChange: React.Dispatch<React.SetStateAction<MockQuestionPoolFormState>>;
  onSave: () => void;
  onReset: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="card dashboard-card">
      <div className="dashboard-card__header">
        <div>
          <h2>Mock Question Pools</h2>
          <p className="interview-prep-muted">Вопросы по темам и компаниям, без привязки к конкретной задаче.</p>
        </div>
      </div>
      <div className="task-editor-grid">
        <div className="form-group">
          <label>Topic</label>
          <FancySelect
            value={form.topic}
            options={MOCK_STAGE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(value) => onFormChange((prev) => ({ ...prev, topic: value }))}
          />
        </div>
        <div className="form-group">
          <label>Company</label>
          <input
            className="input"
            value={form.companyTag}
            onChange={(event) => onFormChange((prev) => ({ ...prev, companyTag: event.target.value }))}
            placeholder="ozon / avito / empty for shared"
          />
        </div>
        <div className="form-group">
          <label>Question Key</label>
          <input
            className="input"
            value={form.questionKey}
            onChange={(event) => onFormChange((prev) => ({ ...prev, questionKey: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Position</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.position}
            onChange={(event) => onFormChange((prev) => ({ ...prev, position: Number(event.target.value) || 1 }))}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Prompt</label>
        <textarea
          className="input textarea"
          value={form.prompt}
          onChange={(event) => onFormChange((prev) => ({ ...prev, prompt: event.target.value }))}
        />
      </div>
      <div className="form-group">
        <label>Reference Answer</label>
        <textarea
          className="input textarea"
          value={form.referenceAnswer}
          onChange={(event) => onFormChange((prev) => ({ ...prev, referenceAnswer: event.target.value }))}
        />
      </div>
      <div className="interview-prep-toggle-row">
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={form.alwaysAsk}
            onChange={(event) => onFormChange((prev) => ({ ...prev, alwaysAsk: event.target.checked }))}
          />
          Always ask
        </label>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onFormChange((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          Активен
        </label>
      </div>
      <div className="interview-prep-question-toolbar">
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {form.id ? 'Сохранить pool' : 'Добавить pool'}
        </button>
        <button className="btn btn-secondary" onClick={onReset}>Очистить форму</button>
      </div>
      <div className="task-list">
        {items.map((item) => (
          <div key={item.id} className="task-item">
            <div className="task-item__header">
              <div>
                <div className="task-item__title">{item.topic} / {item.companyTag || 'shared'} / {item.questionKey}</div>
                <div className="task-item__meta">
                  <span className="badge">#{item.position}</span>
                  {item.alwaysAsk && <span className="badge">always</span>}
                  {!item.isActive && <span className="badge task-inactive">inactive</span>}
                </div>
              </div>
              <div className="task-item__actions">
                <button className="btn-icon" onClick={() => onFormChange(mockQuestionPoolToForm(item))}>
                  <Pencil size={16} />
                </button>
                <button className="btn-icon danger" onClick={() => onDelete(item.id)} disabled={deletingId === item.id}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="task-item__statement">{item.prompt}</p>
            <div className="interview-prep-answer-preview">{item.referenceAnswer}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MockCompanyPresetsSection({
  form,
  items,
  saving,
  deletingId,
  onFormChange,
  onSave,
  onReset,
  onDelete,
}: {
  form: MockCompanyPresetFormState;
  items: InterviewPrepMockCompanyPreset[];
  saving: boolean;
  deletingId: string | null;
  onFormChange: React.Dispatch<React.SetStateAction<MockCompanyPresetFormState>>;
  onSave: () => void;
  onReset: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="card dashboard-card">
      <div className="dashboard-card__header">
        <div>
          <h2>Mock Company Presets</h2>
          <p className="interview-prep-muted">Порядок этапов, task pattern и model override для конкретной компании.</p>
        </div>
      </div>
      <div className="task-editor-grid">
        <div className="form-group">
          <label>Company</label>
          <input
            className="input"
            value={form.companyTag}
            onChange={(event) => onFormChange((prev) => ({ ...prev, companyTag: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Stage</label>
          <FancySelect
            value={form.stageKind}
            options={MOCK_STAGE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(value) => onFormChange((prev) => ({ ...prev, stageKind: value as InterviewPrepMockStageKind }))}
          />
        </div>
        <div className="form-group">
          <label>Position</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.position}
            onChange={(event) => onFormChange((prev) => ({ ...prev, position: Number(event.target.value) || 1 }))}
          />
        </div>
        <div className="form-group">
          <label>Task Slug Pattern</label>
          <input
            className="input"
            value={form.taskSlugPattern}
            onChange={(event) => onFormChange((prev) => ({ ...prev, taskSlugPattern: event.target.value }))}
            placeholder="slice / worker / url-shortener"
          />
        </div>
        <div className="form-group">
          <label>AI Model Override</label>
          <input
            className="input"
            value={form.aiModelOverride}
            onChange={(event) => onFormChange((prev) => ({ ...prev, aiModelOverride: event.target.value }))}
            placeholder="openrouter model id"
          />
        </div>
      </div>
      <div className="interview-prep-toggle-row">
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onFormChange((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          Активен
        </label>
      </div>
      <div className="interview-prep-question-toolbar">
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {form.id ? 'Сохранить preset' : 'Добавить preset'}
        </button>
        <button className="btn btn-secondary" onClick={onReset}>Очистить форму</button>
      </div>
      <div className="task-list">
        {items.map((item) => (
          <div key={item.id} className="task-item">
            <div className="task-item__header">
              <div>
                <div className="task-item__title">{item.companyTag} / {item.stageKind}</div>
                <div className="task-item__meta">
                  <span className="badge">#{item.position}</span>
                  {item.taskSlugPattern && <span className="badge">{item.taskSlugPattern}</span>}
                  {item.aiModelOverride && <span className="badge">model override</span>}
                  {!item.isActive && <span className="badge task-inactive">inactive</span>}
                </div>
              </div>
              <div className="task-item__actions">
                <button className="btn-icon" onClick={() => onFormChange(mockCompanyPresetToForm(item))}>
                  <Pencil size={16} />
                </button>
                <button className="btn-icon danger" onClick={() => onDelete(item.id)} disabled={deletingId === item.id}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="interview-prep-answer-preview">{item.aiModelOverride || 'default model by stage'}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InterviewPrepTaskModal({
  open,
  saving,
  form,
  onClose,
  onSave,
  onTitleChange,
  onFormChange,
  updateTaskCase,
  addTaskCase,
  removeTaskCase,
}: {
  open: boolean;
  saving: boolean;
  form: TaskFormState;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  onFormChange: React.Dispatch<React.SetStateAction<TaskFormState>>;
  updateTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', index: number, field: 'input' | 'expectedOutput', value: string) => void;
  addTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', isPublic: boolean) => void;
  removeTaskCase: (key: 'publicTestCases' | 'hiddenTestCases', index: number) => void;
}) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl interview-prep-modal admin-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="dashboard-card__header admin-modal__header">
          <div>
            <h2>{form.id ? 'Редактировать задачу' : 'Новая задача'}</h2>
            <p className="interview-prep-muted">
              Один сценарий = задача + прикрепленная серия follow-up вопросов.
            </p>
          </div>
          <div className="admin-modal__header-actions">
            <ShieldCheck size={18} />
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Закрыть">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-scroll-content">
          {!form.id && (
            <div className="admin-template-strip">
              {INTERVIEW_PREP_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onFormChange((prev) => applyTaskTemplate(prev, template.key))}
                >
                  {template.label}
                </button>
              ))}
            </div>
          )}

          <div className="task-editor-grid">
            <div className="form-group">
              <label>Название</label>
              <input className="input" value={form.title} onChange={(event) => onTitleChange(event.target.value)} />
            </div>
            <div className="form-group">
              <label>Тип</label>
              <select
                className="input"
                value={form.prepType}
                onChange={(event) => {
                  const prepType = event.target.value as InterviewPrepType;
                  const language = languageOptionsForPrepType(prepType)[0]?.value || form.language;
                  onFormChange((prev) => ({
                    ...prev,
                    prepType,
                    language,
                    supportedLanguages: language === 'system_design' ? [] : [language],
                    isExecutable: prepType === 'system_design' ? false : prev.isExecutable,
                  }));
                }}
              >
                {PREP_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Язык</label>
              <FancySelect
                value={form.language}
                options={languageOptionsForPrepType(form.prepType)}
                onChange={(language) => onFormChange((prev) => ({
                  ...prev,
                  language,
                  supportedLanguages: language === 'system_design' ? [] : [language],
                }))}
              />
            </div>
            <div className="form-group">
              <label>Группа / компания</label>
              <input
                className="input"
                value={form.companyTag}
                onChange={(event) => onFormChange((prev) => ({ ...prev, companyTag: event.target.value.trim().toLowerCase() }))}
                placeholder="ozon / avito / general"
              />
            </div>
            <div className="form-group">
              <label>Формат</label>
              <div className="task-policy-empty">
                {form.prepType === 'system_design'
                  ? 'Обсуждение архитектуры и системы.'
                  : form.prepType === 'sql'
                    ? 'SQL-задача или вопрос по базам данных.'
                    : 'Кодинг-задача с follow-up вопросами.'}
              </div>
            </div>
          </div>

          <div className="interview-prep-toggle-row">
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.isExecutable}
                disabled={form.prepType === 'system_design'}
                onChange={(event) => onFormChange((prev) => ({
                  ...prev,
                  isExecutable: event.target.checked,
                  starterCode: event.target.checked
                    ? (prev.starterCode || (prev.language === 'sql'
                      ? '-- Write SQL solution here\nSELECT 1;\n'
                      : 'package main\n\nfunc solve(input string) string {\n\t_ = input\n\t// TODO: parse input and return the answer as a string.\n\treturn "implement me"\n}\n'))
                    : prev.starterCode,
                  publicTestCases: event.target.checked ? prev.publicTestCases : [createEmptyCase(true, 1)],
                  hiddenTestCases: event.target.checked ? prev.hiddenTestCases : [createEmptyCase(false, 1)],
                }))}
              />
              <span>Нужно запускать код</span>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => onFormChange((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span>Активна</span>
            </label>
          </div>

          <div className="form-group">
            <label>Условие</label>
            <textarea
              className="input textarea"
              value={form.statement}
              onChange={(event) => onFormChange((prev) => ({ ...prev, statement: event.target.value }))}
            />
          </div>

          {form.isExecutable && (
            <>
              <div className="form-group">
                <label>Starter Code</label>
                <textarea
                  className="input textarea code-textarea"
                  value={form.starterCode}
                  onChange={(event) => onFormChange((prev) => ({ ...prev, starterCode: event.target.value }))}
                />
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
                        {form[key].map((testCase: CodeTaskCase, index: number) => (
                          <div key={`${key}-${index}`} className="task-case-item">
                            <div className="task-case-item__header">
                              <span>Тест #{index + 1}</span>
                              <button className="btn-icon danger" onClick={() => removeTaskCase(key, index)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <textarea
                              className="input textarea"
                              placeholder="input"
                              value={testCase.input}
                              onChange={(event) => updateTaskCase(key, index, 'input', event.target.value)}
                            />
                            <textarea
                              className="input textarea"
                              placeholder="expected output"
                              value={testCase.expectedOutput}
                              onChange={(event) => updateTaskCase(key, index, 'expectedOutput', event.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="form-group">
            <label>Эталонный ответ / разбор</label>
            <div className="interview-prep-muted">
              Сюда пиши правильное решение, разбор, SQL-запрос или ключевые тезисы. Это бывший `Reference Solution`.
            </div>
            <textarea
              className="input textarea code-textarea"
              value={form.referenceSolution}
              onChange={(event) => onFormChange((prev) => ({ ...prev, referenceSolution: event.target.value }))}
            />
          </div>

          <div className="interview-prep-question-toolbar">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAdvanced((value) => !value)}>
              <Settings2 size={16} />
              <span>{showAdvanced ? 'Скрыть advanced' : 'Показать advanced'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="task-policy-panel">
              <div className="task-editor-grid">
                <div className="form-group">
                  <label>Slug</label>
                  <input
                    className="input"
                    value={form.slug}
                    onChange={(event) => onFormChange((prev) => ({ ...prev, slug: toSlug(event.target.value) }))}
                    placeholder="go-two-sum-hash-map"
                  />
                </div>
                <div className="form-group">
                  <label>Длительность, сек</label>
                  <input
                    className="input"
                    type="number"
                    min={300}
                    step={60}
                    value={form.durationSeconds}
                    onChange={(event) => onFormChange((prev) => ({ ...prev, durationSeconds: Number(event.target.value) || 0 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Языки решения</label>
                  <div className="pill-selector">
                    {languageOptionsForPrepType(form.prepType).map((option) => {
                      const active = form.supportedLanguages.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`pill-selector__pill ${active ? 'active' : ''}`}
                          onClick={() => onFormChange((prev) => ({
                            ...prev,
                            supportedLanguages: active
                              ? prev.supportedLanguages.filter((value) => value !== option.value)
                              : [...prev.supportedLanguages, option.value],
                          }))}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {form.isExecutable && form.codeTaskId && (
                  <div className="form-group">
                    <label>Автопроверка</label>
                    <div className="task-policy-empty">
                      Связанный `code task` уже существует и обновится автоматически при сохранении.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions admin-modal__actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Сохранение...' : form.id ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InterviewPrepQuestionModal({
  open,
  saving,
  deletingId,
  selectedTask,
  sortedQuestions,
  form,
  onClose,
  onSave,
  onDelete,
  onFormChange,
}: {
  open: boolean;
  saving: boolean;
  deletingId: string | null;
  selectedTask: InterviewPrepTask | null;
  sortedQuestions: InterviewPrepQuestion[];
  form: QuestionFormState;
  onClose: () => void;
  onSave: () => void;
  onDelete: (questionId: string) => void;
  onFormChange: React.Dispatch<React.SetStateAction<QuestionFormState>>;
}) {
  if (!open || !selectedTask) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl interview-prep-modal admin-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="dashboard-card__header admin-modal__header">
          <div>
            <h2>Вопросы: {selectedTask.title}</h2>
            <p className="interview-prep-muted">
              Порядок важен: вопросы идут последовательно, а не рандомно.
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div className="modal-scroll-content">
          <div className="task-editor-grid">
            <div className="form-group">
              <label>Позиция</label>
              <input
                className="input"
                type="number"
                min={1}
                value={form.position}
                onChange={(event) => onFormChange((prev) => ({ ...prev, position: Number(event.target.value) || 1 }))}
              />
            </div>
            <div className="form-group">
              <label>Режим</label>
              <input
                className="input"
                value={form.id ? 'Редактирование вопроса' : 'Добавление нового вопроса'}
                readOnly
              />
            </div>
          </div>

          <div className="form-group">
            <label>Prompt</label>
            <textarea
              className="input textarea"
              value={form.prompt}
              onChange={(event) => onFormChange((prev) => ({ ...prev, prompt: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Answer</label>
            <textarea
              className="input textarea"
              value={form.answer}
              onChange={(event) => onFormChange((prev) => ({ ...prev, answer: event.target.value }))}
            />
          </div>

          <div className="interview-prep-question-toolbar">
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Сохранение...' : form.id ? 'Сохранить вопрос' : 'Добавить вопрос'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onFormChange(createEmptyQuestionForm(sortedQuestions.length + 1))}
            >
              Очистить форму
            </button>
          </div>

          <div className="interview-prep-question-list">
            {sortedQuestions.length === 0 ? (
              <div className="empty-state compact">У этой задачи пока нет вопросов.</div>
            ) : (
              sortedQuestions.map((question) => (
                <div key={question.id} className="task-item">
                  <div className="task-item__header">
                    <div>
                      <div className="task-item__title">#{question.position}</div>
                      <div className="interview-prep-muted">Следующий вопрос откроется только после ответа на этот.</div>
                    </div>
                    <div className="task-item__actions">
                      <button className="btn-icon" onClick={() => onFormChange(questionToForm(question))}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => onDelete(question.id)}
                        disabled={deletingId === question.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="task-item__statement">{question.prompt}</p>
                  <div className="interview-prep-answer-preview">{question.answer}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-actions admin-modal__actions">
          <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
