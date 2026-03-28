import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Building2, ExternalLink, Plus, Trash2, Pencil, Search, Loader2 } from 'lucide-react';
import { vacancyApi } from '@/features/Vacancy/api/vacancyApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { Vacancy, CreateVacancyPayload } from '@/entities/User/model/types';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Полный день' },
  { value: 'part_time', label: 'Частичная занятость' },
  { value: 'contract', label: 'Контракт' },
  { value: 'remote', label: 'Удаленно / фриланс' },
  { value: 'internship', label: 'Стажировка' },
] as const;

function employmentTypeLabel(value: string): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Не указано';
}

export const VacanciesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateVacancyPayload>({
    title: '',
    company: '',
    vacancy_url: '',
    description: '',
    experience: '',
    location: '',
    employment_type: 'full_time',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingVacancy) {
        await vacancyApi.update(editingVacancy.id, formData);
      } else {
        await vacancyApi.create(formData);
      }
      setIsModalOpen(false);
      setEditingVacancy(null);
      setFormData({
        title: '',
        company: '',
        vacancy_url: '',
        description: '',
        experience: '',
        location: '',
        employment_type: 'full_time',
      });
      void loadVacancies();
    } catch (err) {
      console.error('Failed to save vacancy', err);
      alert('Ошибка при сохранении вакансии');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await vacancyApi.delete(confirmDeleteId);
      void loadVacancies();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Ошибка при удалении');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const openEdit = (v: Vacancy) => {
    setEditingVacancy(v);
    setFormData({
      title: v.title,
      company: v.company,
      vacancy_url: v.vacancy_url,
      description: v.description,
      experience: v.experience,
      location: v.location,
      employment_type: v.employment_type || 'full_time',
    });
    setIsModalOpen(true);
  };

  const filteredVacancies = vacancies.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Вакансии</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Помогайте своим найти достойную работу</p>
        </div>
        <button
          className="btn hover-scale"
          onClick={() => {
            setEditingVacancy(null);
            setFormData({
              title: '',
              company: '',
              vacancy_url: '',
              description: '',
              experience: '',
              location: '',
              employment_type: 'full_time',
            });
            setIsModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '16px',
            background: 'var(--accent-color)',
            boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Plus size={20} /> Добавить вакансию
        </button>
      </div>

      <div className="card" style={{
        marginBottom: '32px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Search size={20} color="var(--text-secondary)" />
        <input
          placeholder="Поиск по названию, компании или описанию..."
          aria-label="Поиск вакансий"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            padding: '12px 0',
            fontSize: '15px'
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="spin" size={32} color="var(--accent-color)" />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {filteredVacancies.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', opacity: 0.5 }}>
              Ничего не найдено
            </div>
          ) : (
            filteredVacancies.map(v => (
              <div
                key={v.id}
                className="card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '24px',
                  transition: 'transform 0.2s, background-color 0.2s, border-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', lineHeight: '1.2' }}>{v.title}</h3>
                  {(v.is_owner || currentUser?.isAdmin) && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '-4px', marginRight: '-8px' }}>
                      <button 
                        onClick={() => openEdit(v)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                        className="hover-opacity"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                        className="hover-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  <Building2 size={14} /> {v.company}
                </div>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'rgba(255,255,255,0.5)', 
                  lineHeight: '1.5',
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {v.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 500 }}>
                    {v.experience}
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 500 }}>
                    {employmentTypeLabel(v.employment_type)}
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={10} /> {v.location}
                  </span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <Link 
                    to={`/profile/${v.user_id}`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '6px', 
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'white'
                    }}>
                      {v.author_name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {v.author_name}
                    </span>
                  </Link>
                  
                  <a 
                    href={v.vacancy_url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      color: 'var(--accent-color)', 
                      fontSize: '13px',
                      fontWeight: '700',
                      textDecoration: 'none'
                    }}
                  >
                    Подробнее <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fade-in" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>
              {editingVacancy ? 'Редактировать вакансию' : 'Новая вакансия'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Должность</label>
                  <input
                    required
                    className="input"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Компания</label>
                  <input
                    required
                    className="input"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ссылка на вакансию (HH.ru, LinkedIn и т.д.)</label>
                <input
                  required
                  type="url"
                  className="input"
                  value={formData.vacancy_url}
                  onChange={e => setFormData({ ...formData, vacancy_url: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Описание</label>
                <textarea
                  required
                  className="input"
                  style={{ minHeight: '120px', padding: '12px' }}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Опыт</label>
                  <input
                    placeholder="Напр. 3-6 лет"
                    className="input"
                    value={formData.experience}
                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Локация</label>
                  <input
                    placeholder="Город или Удаленка"
                    className="input"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Тип занятости</label>
                <select
                  className="input"
                  value={formData.employment_type}
                  onChange={e => setFormData({ ...formData, employment_type: e.target.value })}
                >
                  {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', flex: 1 }}
                >
                  Отмена
                </button>
                <button
                  disabled={isSubmitting}
                  className="btn"
                  style={{ background: 'var(--accent-color)', flex: 2 }}
                >
                  {isSubmitting ? 'Сохранение...' : 'Опубликовать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Удалить вакансию?"
        message="Вы уверены, что хотите удалить эту вакансию? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
