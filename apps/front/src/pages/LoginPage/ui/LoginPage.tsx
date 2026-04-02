import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { TelegramAuthWidget } from '@/features/Auth/ui/TelegramAuthWidget';

export const LoginPage: React.FC = () => {
  const { login, startYandexAuth } = useAuth();
  const [error, setError] = useState('');
  const [isYandexLoading, setIsYandexLoading] = useState(false);

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
      <div className="auth-shell card fade-in">
        <div className="auth-shell__hero">
          <span className="auth-shell__eyebrow">Druz9 Access</span>
          <h1 className="auth-shell__title">Вход через Яндекс или Telegram</h1>
          <p className="auth-shell__subtitle">
            Парольная регистрация удалена. Войти можно только через внешний провайдер.
          </p>
        </div>

        {error && (
          <div className="auth-shell__error">
            {error}
          </div>
        )}

        <div className="auth-shell__grid">
          <section className="auth-provider-card auth-provider-card--primary">
            <div className="auth-provider-card__header">
              <span className="auth-provider-card__badge">Рекомендуется</span>
              <h2>Яндекс ID</h2>
            </div>
            <p>Быстрый вход в браузере с автоматическим созданием аккаунта и сохранением сессии.</p>
            <div className="auth-provider-card__action-wrapper">
              <button
                type="button"
                className="btn btn-primary auth-provider-card__action"
                disabled={isYandexLoading}
                onClick={handleYandexAuth}
              >
                {isYandexLoading ? 'Переходим в Яндекс...' : 'Войти через Яндекс'}
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <section className="auth-provider-card">
            <div className="auth-provider-card__header">
              <span className="auth-provider-card__badge auth-provider-card__badge--neutral">Альтернатива</span>
              <h2>Telegram</h2>
            </div>
            <p>Можно войти кодом из бота и позже привязать Telegram как дополнительный провайдер в профиле.</p>
            <div className="auth-provider-card__action-wrapper">
              <TelegramAuthWidget onAuth={handleTelegramAuth} />
            </div>
          </section>
        </div>

        <div className="auth-shell__footer">
          <ShieldCheck size={16} />
          <span>Сессия хранится в защищённой cookie. После первого входа откроется шаг завершения профиля.</span>
        </div>
      </div>
    </div>
  );
};
