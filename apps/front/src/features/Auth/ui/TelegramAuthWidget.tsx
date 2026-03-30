import React, { useState } from 'react';
import { AxiosError } from '@/shared/api/base';
import { authApi } from '@/features/Auth/api/authApi';

interface TelegramAuthWidgetProps {
  onAuth: (token: string, code: string) => Promise<void>;
}

export const TelegramAuthWidget: React.FC<TelegramAuthWidgetProps> = ({
  onAuth,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hint, setHint] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleStart = async () => {
    try {
      setIsStarting(true);
      setHint('');
      setCode('');
      setChallengeToken('');
      setExpiresAt('');

      const challenge = await authApi.createTelegramAuthChallenge();
      setChallengeToken(challenge.token);
      setExpiresAt(challenge.expiresAt);
      if (challenge.botStartUrl) {
        window.open(challenge.botStartUrl, '_blank', 'noopener,noreferrer');
      }

      setHint('Открой бота в Telegram, нажми Start и введи код из сообщения ниже.');
      setIsStarting(false);
    } catch (error) {
      setIsStarting(false);
      setHint('Не удалось запустить авторизацию через Telegram.');
    }
  };

  const handleSubmit = async () => {
    if (!challengeToken || !code.trim()) {
      setHint('Сначала открой Telegram-бота и получи код.');
      return;
    }

    if (expiresAt) {
      const deadline = new Date(expiresAt).getTime();
      if (!Number.isNaN(deadline) && Date.now() >= deadline) {
        setHint('Код устарел. Запусти авторизацию ещё раз.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setHint('');
      await onAuth(challengeToken, code.trim());
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        setHint('Код не подошёл или устарел. Запусти авторизацию заново.');
      } else {
        setHint('Не удалось завершить авторизацию. Попробуй ещё раз.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '14px', width: '100%' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleStart}
        disabled={isStarting}
        style={{ width: '100%', minHeight: '46px' }}
      >
        {isStarting ? 'Открываем Telegram...' : 'Получить код в Telegram'}
      </button>
      <div style={{ display: 'grid', gap: '10px' }}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Код из бота"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
          style={{
            width: '100%',
            minHeight: '46px',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.28)',
            background: 'rgba(15, 23, 42, 0.28)',
            color: 'var(--text-primary)',
            padding: '0 14px',
            fontSize: '16px',
            letterSpacing: '0.18em',
            textAlign: 'center',
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSubmit}
          disabled={isSubmitting || !challengeToken || code.trim().length < 4}
          style={{ width: '100%', minHeight: '44px' }}
        >
          {isSubmitting ? 'Проверяем код...' : 'Войти по коду'}
        </button>
      </div>
      {hint && (
        <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {hint}
        </div>
      )}
    </div>
  );
};
