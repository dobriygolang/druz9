import React, { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Briefcase, MapPin } from 'lucide-react';
import { LocationPicker } from '@/features/Geo/ui/LocationPicker';
import { CompleteProfilePayload } from '@/entities/User/model/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

export const CompleteRegistrationPage: React.FC = () => {
  const isMobile = useIsMobile();
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
        <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', alignItems: 'center' }}>
          {!isMobile && (
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
          )}
          <div>
            <h1
              style={{
                fontSize: isMobile ? '22px' : '28px',
                marginBottom: isMobile ? '4px' : '8px',
                fontWeight: 600,
              }}
            >
              {isMobile ? 'Регистрация' : 'Завершение регистрации'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: isMobile ? '14px' : '16px' }}>
              {isMobile ? 'Укажите город и место работы.' : 'Укажите, где вы живете и при желании добавьте текущее место работы.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', alignItems: 'center', marginBottom: isMobile ? '12px' : '16px' }}>
          {!isMobile && (
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
          )}
          <div>
            <h2 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 600, marginBottom: '2px' }}>
              Работа
            </h2>
            {!isMobile && (
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Это поле необязательное, но помогает другим быстрее понять ваш контекст.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${employmentMode === 'working' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEmploymentMode('working')}
            style={{
              background:
                employmentMode === 'working'
                  ? undefined
                  : 'rgba(255,255,255,0.05)',
            }}
          >
            Работаю
          </button>
          <button
            type="button"
            className={`btn ${employmentMode === 'not_working' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEmploymentMode('not_working')}
            style={{
              background:
                employmentMode === 'not_working'
                  ? undefined
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
