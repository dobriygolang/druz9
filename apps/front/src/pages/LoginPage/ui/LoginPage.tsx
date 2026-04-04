import React, { useState } from 'react';
import { ArrowRight, Brain, Code, MapPin, ShieldCheck, Users } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { TelegramAuthWidget } from '@/features/Auth/ui/TelegramAuthWidget';

const FEATURES_LEFT = [
  {
    icon: Code,
    color: '#818CF8',
    title: 'Code Rooms',
    desc: 'Реальное время, совместный код',
  },
  {
    icon: Brain,
    color: '#34D399',
    title: 'Mock Interviews',
    desc: 'AI-подготовка к интервью',
  },
  {
    icon: Users,
    color: '#FBBF24',
    title: 'Community',
    desc: 'Сообщество IT-разработчиков',
  },
];

const FEATURES_RIGHT = [
  {
    icon: MapPin,
    color: '#F472B6',
    title: 'Geo Map',
    desc: 'Карта разработчиков рядом',
  },
];

export const LoginPage: React.FC = () => {
  const { login, startYandexAuth } = useAuth();
  const [error, setError] = useState('');
  const [isYandexLoading, setIsYandexLoading] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);

  const handleTelegramAuth = async (token: string, code: string) => {
    try {
      setError('');
      await login(token, code);
    } catch {
      setError('Ошибка авторизации через Telegram');
    }
  };

  const handleYandexAuth = async () => {
    try {
      setIsYandexLoading(true);
      setError('');
      const authUrl = await startYandexAuth();
      window.location.assign(authUrl);
    } catch {
      setError('Не удалось начать авторизацию через Яндекс');
      setIsYandexLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg">
        <div className="auth-bg__glow auth-bg__glow--tr" />
        <div className="auth-bg__glow auth-bg__glow--bl" />
      </div>

      <aside className="auth-features auth-features--left">
        {FEATURES_LEFT.map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="auth-feature-card">
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <div>
              <div className="auth-feature-card__title">{title}</div>
              <div className="auth-feature-card__desc">{desc}</div>
            </div>
          </div>
        ))}
      </aside>

      <div className="auth-content">
        <div className="auth-brand">
          <div className="auth-brand__row">
            <span className="auth-brand__badge">D9</span>
            <span className="auth-brand__name">Druz9</span>
          </div>
          <p className="auth-brand__tagline">Платформа для IT-сообщества</p>
        </div>

        <div className="auth-card">
          <div className="auth-card__body">
            <h1 className="auth-card__headline">Войти в аккаунт</h1>
            <p className="auth-card__sub">Выберите способ авторизации</p>

            {error && (
              <div className="auth-card__error">{error}</div>
            )}

            <div className="auth-card__actions">
              <button
                type="button"
                className="btn btn-primary auth-card__btn"
                disabled={isYandexLoading}
                onClick={handleYandexAuth}
              >
                {isYandexLoading ? 'Переходим в Яндекс...' : 'Войти через Яндекс ID'}
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn btn-secondary auth-card__btn"
                onClick={() => setShowTelegram((v) => !v)}
              >
                Войти через Telegram
              </button>
            </div>

            {showTelegram && (
              <div className="auth-card__telegram">
                <div className="auth-card__telegram-divider">
                  <span>код из Telegram-бота</span>
                </div>
                <TelegramAuthWidget onAuth={handleTelegramAuth} />
              </div>
            )}
          </div>

          <div className="auth-card__footer">
            <ShieldCheck size={14} />
            <span>Сессия в защищённой cookie. После входа — шаг завершения профиля.</span>
          </div>
        </div>
      </div>

      <aside className="auth-features auth-features--right">
        {FEATURES_RIGHT.map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="auth-feature-card">
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <div>
              <div className="auth-feature-card__title">{title}</div>
              <div className="auth-feature-card__desc">{desc}</div>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
};
