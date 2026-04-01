import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { Vacancy, CreateVacancyPayload } from '@/entities/User/model/types';
import { vacancyApi } from '@/features/Vacancy/api/vacancyApi';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Полный день' },
  { value: 'part_time', label: 'Частичная занятость' },
  { value: 'contract', label: 'Контракт' },
  { value: 'remote', label: 'Удалённо / фриланс' },
  { value: 'internship', label: 'Стажировка' },
] as const;

const EMPTY_FORM: CreateVacancyPayload = {
  title: '',
  company: '',
  vacancy_url: '',
  description: '',
  experience: '',
  location: '',
  employment_type: 'full_time',
};

function employmentTypeLabel(value: string): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Формат не указан';
}

function authorInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || 'V';
}

export const VacanciesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateVacancyPayload>(EMPTY_FORM);

  const loadVacancies = async () => {
    try {
      setIsLoading(true);
      const data = await vacancyApi.list();
      setVacancies(data);
    } catch (err) {
      console.error('Failed to load vacancies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVacancies();
  }, []);

  const locations = useMemo(() => {
    return Array.from(new Set(vacancies.map((item) => item.location.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ru'),
    );
  }, [vacancies]);

  const filteredVacancies = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    return vacancies.filter((vacancy) => {
      const matchesSearch =
        !searchLower ||
        vacancy.title.toLowerCase().includes(searchLower) ||
        vacancy.company.toLowerCase().includes(searchLower) ||
        vacancy.description.toLowerCase().includes(searchLower);

      const matchesEmployment =
        employmentFilter === 'all' || vacancy.employment_type === employmentFilter;

      const matchesLocation =
        locationFilter === 'all' || vacancy.location === locationFilter;

      return matchesSearch && matchesEmployment && matchesLocation;
    });
  }, [employmentFilter, locationFilter, searchQuery, vacancies]);

  const stats = useMemo(() => {
    return {
      total: vacancies.length,
      companies: new Set(vacancies.map((item) => item.company)).size,
      remote: vacancies.filter((item) => item.employment_type === 'remote').length,
      authors: new Set(vacancies.map((item) => item.user_id).filter(Boolean)).size,
    };
  }, [vacancies]);

  const openCreate = () => {
    setEditingVacancy(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy);
    setFormData({
      title: vacancy.title,
      company: vacancy.company,
      vacancy_url: vacancy.vacancy_url,
      description: vacancy.description,
      experience: vacancy.experience,
      location: vacancy.location,
      employment_type: vacancy.employment_type || 'full_time',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVacancy(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingVacancy) {
        await vacancyApi.update(editingVacancy.id, formData);
      } else {
        await vacancyApi.create(formData);
      }
      closeModal();
      void loadVacancies();
    } catch (err) {
      console.error('Failed to save vacancy', err);
      alert('Ошибка при сохранении вакансии');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await vacancyApi.delete(confirmDeleteId);
      setVacancies((current) => current.filter((item) => item.id !== confirmDeleteId));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Ошибка при удалении вакансии');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="vacancies-page fade-in">
      <section className="vacancies-hero">
        <div className="vacancies-hero__intro">
          <div>
            <div className="vacancies-hero__eyebrow">
              <Briefcase size={14} />
              Referral board
            </div>
            <h1 className="vacancies-hero__title">Вакансии</h1>
            <p className="vacancies-hero__description">
              Лента реальных вакансий от сообщества. Быстро фильтруй по формату и локации,
              открывай интересные позиции и публикуй свои реферальные объявления в одном месте.
            </p>
          </div>

          <div className="vacancies-hero__meta">
            <span className="badge">Без лишнего шума</span>
            <span className="badge">Рефералки и прямые контакты</span>
            <span className="badge">Нормальный поиск</span>
          </div>
        </div>

        <aside className="vacancies-hero__panel">
          <div className="vacancies-stat-grid">
            <div className="vacancies-stat">
              <span className="vacancies-stat__label">В ленте</span>
              <strong className="vacancies-stat__value">{stats.total}</strong>
            </div>
            <div className="vacancies-stat">
              <span className="vacancies-stat__label">Компаний</span>
              <strong className="vacancies-stat__value">{stats.companies}</strong>
            </div>
            <div className="vacancies-stat">
              <span className="vacancies-stat__label">Remote</span>
              <strong className="vacancies-stat__value">{stats.remote}</strong>
            </div>
            <div className="vacancies-stat">
              <span className="vacancies-stat__label">Авторов</span>
              <strong className="vacancies-stat__value">{stats.authors}</strong>
            </div>
          </div>

          <div className="vacancies-actions">
            <button className="btn" onClick={openCreate}>
              <Plus size={18} />
              Добавить вакансию
            </button>
          </div>
        </aside>
      </section>

      <section className="vacancies-search">
        <div className="vacancies-search__row">
          <div className="vacancies-search__field">
            <Search size={18} />
            <input
              type="text"
              className="input"
              placeholder="Поиск по названию, компании или описанию"
              aria-label="Поиск вакансий"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="input"
            aria-label="Фильтр по занятости"
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value)}
          >
            <option value="all">Любая занятость</option>
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="input"
            aria-label="Фильтр по локации"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">Любая локация</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </section>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 className="spin" size={32} color="var(--accent-color)" />
        </div>
      ) : (
        <section className="vacancies-list">
          {filteredVacancies.length === 0 ? (
            <div className="vacancies-empty">
              <h3 style={{ margin: 0, fontSize: '22px' }}>Подходящих вакансий пока нет</h3>
              <p style={{ margin: '10px 0 0' }}>
                Попробуй сбросить фильтры или опубликуй новую позицию для сообщества.
              </p>
            </div>
          ) : (
            filteredVacancies.map((vacancy) => (
              <article key={vacancy.id} className="vacancies-card">
                <div className="vacancies-card__top">
                  <div>
                    <div className="vacancies-card__company">
                      <Building2 size={15} />
                      {vacancy.company}
                    </div>
                    <h3 className="vacancies-card__title">{vacancy.title}</h3>
                  </div>

                  {(vacancy.is_owner || currentUser?.isAdmin) && (
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        aria-label="Редактировать вакансию"
                        onClick={() => openEdit(vacancy)}
                        style={{ minHeight: 40, minWidth: 40, padding: 0 }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        aria-label="Удалить вакансию"
                        onClick={() => setConfirmDeleteId(vacancy.id)}
                        style={{ minHeight: 40, minWidth: 40, padding: 0, color: '#f28b82' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="vacancies-card__description">{vacancy.description}</p>

                <div className="vacancies-card__chips">
                  {!!vacancy.experience && (
                    <span className="vacancies-card__chip">{vacancy.experience}</span>
                  )}
                  <span className="vacancies-card__chip">{employmentTypeLabel(vacancy.employment_type)}</span>
                  {!!vacancy.location && (
                    <span className="vacancies-card__chip">
                      <MapPin size={12} />
                      {vacancy.location}
                    </span>
                  )}
                </div>

                <div className="vacancies-card__footer">
                  <Link to={`/profile/${vacancy.user_id}`} className="vacancies-author">
                    <span className="vacancies-author__avatar">{authorInitial(vacancy.author_name)}</span>
                    <span className="vacancies-author__name">{vacancy.author_name}</span>
                  </Link>

                  <a
                    href={vacancy.vacancy_url}
                    target="_blank"
                    rel="noreferrer"
                    className="vacancies-card__cta"
                  >
                    Открыть вакансию
                    <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {isModalOpen && (
        <div className="vacancies-modal fade-in">
          <div className="vacancies-modal__panel">
            <div className="vacancies-modal__header">
              <div>
                <h2 className="vacancies-modal__title">
                  {editingVacancy ? 'Редактирование вакансии' : 'Новая вакансия'}
                </h2>
                <p className="vacancies-modal__subtitle">
                  Пиши кратко и по делу: роль, компания, ссылка, контекст и формат работы.
                </p>
              </div>
            </div>

            <form className="vacancies-form" onSubmit={handleSubmit}>
              <div className="vacancies-form__grid">
                <div className="vacancies-form__section">
                  <label htmlFor="vacancy-title">Роль</label>
                  <input
                    id="vacancy-title"
                    required
                    className="input"
                    placeholder="Senior Backend Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
                  />
                </div>

                <div className="vacancies-form__section">
                  <label htmlFor="vacancy-company">Компания</label>
                  <input
                    id="vacancy-company"
                    required
                    className="input"
                    placeholder="Ozon"
                    value={formData.company}
                    onChange={(e) => setFormData((current) => ({ ...current, company: e.target.value }))}
                  />
                </div>
              </div>

              <div className="vacancies-form__section">
                <label htmlFor="vacancy-url">Ссылка на вакансию</label>
                <input
                  id="vacancy-url"
                  required
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={formData.vacancy_url}
                  onChange={(e) => setFormData((current) => ({ ...current, vacancy_url: e.target.value }))}
                />
              </div>

              <div className="vacancies-form__section">
                <label htmlFor="vacancy-description">Что важно знать</label>
                <textarea
                  id="vacancy-description"
                  required
                  className="input"
                  placeholder="Коротко распиши стек, команду, домен, важные ожидания и почему вакансия worth it."
                  value={formData.description}
                  onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
                />
              </div>

              <div className="vacancies-form__grid">
                <div className="vacancies-form__section">
                  <label htmlFor="vacancy-experience">Опыт</label>
                  <input
                    id="vacancy-experience"
                    className="input"
                    placeholder="3-6 лет"
                    value={formData.experience}
                    onChange={(e) => setFormData((current) => ({ ...current, experience: e.target.value }))}
                  />
                </div>

                <div className="vacancies-form__section">
                  <label htmlFor="vacancy-location">Локация</label>
                  <input
                    id="vacancy-location"
                    className="input"
                    placeholder="Москва / Remote / СПб"
                    value={formData.location}
                    onChange={(e) => setFormData((current) => ({ ...current, location: e.target.value }))}
                  />
                </div>
              </div>

              <div className="vacancies-form__section">
                <label htmlFor="vacancy-employment">Занятость</label>
                <select
                  id="vacancy-employment"
                  className="input"
                  value={formData.employment_type}
                  onChange={(e) => setFormData((current) => ({ ...current, employment_type: e.target.value }))}
                >
                  {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vacancies-form__footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохраняю…' : editingVacancy ? 'Сохранить изменения' : 'Опубликовать вакансию'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Удалить вакансию?"
        message="Это действие нельзя отменить. Запись исчезнет из общей ленты."
        confirmText="Удалить"
        cancelText="Отмена"
        isDangerous
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
