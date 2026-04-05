import React, { useState } from 'react';
import { ShieldCheck, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { TelegramAuthWidget } from '@/features/Auth/ui/TelegramAuthWidget';

export const LoginPage: React.FC = () => {
  const { login, startYandexAuth } = useAuth();
  const [error, setError] = useState('');
  const [isYandexLoading, setIsYandexLoading] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);

  const handleTelegramAuth = async (token: string, code: string) => {
    try {
      setError('');
      await login(token, code);
    } catch (err) {
      setError('Ошибка авторизации через Telegram');
      console.error(err);
    }
  };

  const handleYandexAuth = async () => {
    try {
      setIsYandexLoading(true);
      setError('');
      const authUrl = await startYandexAuth();
      window.location.assign(authUrl);
    } catch (err) {
      setError('Не удалось начать авторизацию через Яндекс');
      setIsYandexLoading(false);
      console.error(err);
    }
  };

  return (
    <div className="auth-screen">
      {/* Abstract background */}
      <div className="auth-bg" aria-hidden="true" />

      {/* Feature highlights */}
      <aside className="auth-features auth-features--left" aria-hidden="true">
        <div className="auth-feature-card">
          <span className="auth-feature-card__icon">⚡</span>
          <strong>500+ задач</strong>
          <span>от Easy до Hard</span>
        </div>
        <div className="auth-feature-card">
          <span className="auth-feature-card__icon">🤖</span>
          <strong>AI-ревью</strong>
          <span>разбор решений</span>
        </div>
        <div className="auth-feature-card">
          <span className="auth-feature-card__icon">🏆</span>
          <strong>Дуэли</strong>
          <span>live PvP арена</span>
        </div>
      </aside>

      {/* Central login card */}
      <div className="auth-card fade-in">
        <div className="auth-card__logo">
          <span className="auth-card__wordmark">Druz9</span>
          <p className="auth-card__tagline">Прокачай алгоритмическое мышление</p>
        </div>

        <div className="auth-card__divider" />

        {error && (
          <div className="auth-card__error">
            {error}
          </div>
        )}

        <div className="auth-card__actions">
          <button
            type="button"
            className="btn auth-card__btn auth-card__btn--yandex"
            disabled={isYandexLoading}
            onClick={handleYandexAuth}
          >
            <svg className="auth-card__btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13.4 12L19 2H14.6L12 7.2L9.4 2H5L10.6 12L5 22H9.4L12 16.8L14.6 22H19L13.4 12Z" fill="currentColor"/>
            </svg>
            {isYandexLoading ? 'Переходим...' : 'Войти через Яндекс'}
          </button>

          <button
            type="button"
            className="btn auth-card__btn auth-card__btn--telegram"
            onClick={() => setShowTelegram(v => !v)}
          >
            <MessageCircle size={18} />
            Войти через Telegram
            {showTelegram ? <ChevronUp size={16} className="auth-card__btn-chevron" /> : <ChevronDown size={16} className="auth-card__btn-chevron" />}
          </button>

          {showTelegram && (
            <div className="auth-card__telegram">
              <TelegramAuthWidget onAuth={handleTelegramAuth} />
            </div>
          )}
        </div>

        <div className="auth-card__footer">
          <ShieldCheck size={14} />
          <span>Сессия хранится в защищённой cookie</span>
        </div>
      </div>

      {/* Feature highlights right */}
      <aside className="auth-features auth-features--right" aria-hidden="true">
        <div className="auth-feature-card">
          <span className="auth-feature-card__icon">📊</span>
          <strong>Аналитика</strong>
          <span>прогресс в деталях</span>
        </div>
        <div className="auth-feature-card">
          <span className="auth-feature-card__icon">🎯</span>
          <strong>Mock-интервью</strong>
          <span>с AI-интервьюером</span>
        </div>
        <div className="auth-feature-card">
          <span className="auth-feature-card__icon">🔥</span>
          <strong>Стрики</strong>
          <span>ежедневные задачи</span>
        </div>
      </aside>
    </div>
  );
};
