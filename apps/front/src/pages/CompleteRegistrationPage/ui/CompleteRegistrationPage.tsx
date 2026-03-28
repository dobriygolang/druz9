import React, { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Briefcase, MapPin } from 'lucide-react';
import { LocationPicker } from '@/features/Geo/ui/LocationPicker';
import { CompleteProfilePayload } from '@/entities/User/model/types';

export const CompleteRegistrationPage: React.FC = () => {
  const { completeProfile } = useAuth();
  const [employmentMode, setEmploymentMode] = useState<'working' | 'not_working'>(
    'working',
  );
  const [currentWorkplace, setCurrentWorkplace] = useState('');

  const handleCompleteProfile = async (payload: CompleteProfilePayload) => {
    await completeProfile({
      ...payload,
      currentWorkplace:
        employmentMode === 'working' ? currentWorkplace.trim() : '',
    });
  };

  return (
    <div className="fade-in" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '16px',
              backgroundColor: 'rgba(79, 70, 229, 0.12)',
              borderRadius: '18px',
              color: 'var(--accent-color)',
            }}
          >
            <MapPin size={30} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '28px',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              Завершение регистрации
            </h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Укажите, где вы живете и при желании добавьте текущее место
              работы.
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '14px',
              backgroundColor: 'rgba(79, 70, 229, 0.12)',
              borderRadius: '16px',
              color: 'var(--accent-color)',
            }}
          >
            <Briefcase size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>
              Работа
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Это поле необязательное, но помогает другим быстрее понять ваш
              контекст.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setEmploymentMode('working')}
            style={{
              background:
                employmentMode === 'working'
                  ? 'var(--accent-color)'
                  : 'rgba(255,255,255,0.05)',
            }}
          >
            Работаю
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setEmploymentMode('not_working')}
            style={{
              background:
                employmentMode === 'not_working'
                  ? 'var(--accent-color)'
                  : 'rgba(255,255,255,0.05)',
            }}
          >
            Сейчас не работаю
          </button>
        </div>

        <input
          className="input"
          placeholder="Например: Yandex, VK, freelance"
          aria-label="Название компании"
          value={currentWorkplace}
          onChange={(event) => setCurrentWorkplace(event.target.value)}
          disabled={employmentMode !== 'working'}
        />
      </div>

      <LocationPicker
        showPreviewMap={false}
        submitLabel="Подтвердить и завершить"
        submitLoadingLabel="Завершаем..."
        onSubmit={handleCompleteProfile}
      />
    </div>
  );
};
