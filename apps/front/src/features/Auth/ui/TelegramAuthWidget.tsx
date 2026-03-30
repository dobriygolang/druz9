import React, { useEffect, useRef, useState } from 'react';
import { AxiosError } from '@/shared/api/base';
import { authApi } from '@/features/Auth/api/authApi';

interface TelegramAuthWidgetProps {
  onAuth: (token: string) => Promise<void>;
}

export const TelegramAuthWidget: React.FC<TelegramAuthWidgetProps> = ({
  onAuth,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [hint, setHint] = useState('');
  const pollTimerRef = useRef<number | null>(null);
  const deadlineRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const clearPolling = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const startPolling = (token: string, expiresAt: string) => {
    deadlineRef.current = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 15 * 60 * 1000;

    pollTimerRef.current = window.setInterval(async () => {
      if (Date.now() >= deadlineRef.current) {
        clearPolling();
        setIsStarting(false);
        setHint('Время ожидания истекло. Запусти авторизацию ещё раз.');
        return;
      }

      try {
        await onAuth(token);
        clearPolling();
        setIsStarting(false);
        setHint('');
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 401) {
          return;
        }
        clearPolling();
        setIsStarting(false);
        setHint('Не удалось завершить авторизацию. Попробуй ещё раз.');
      }
    }, 2000);
  };

  const handleStart = async () => {
    try {
      clearPolling();
      setIsStarting(true);
      setHint('');

      const challenge = await authApi.createTelegramAuthChallenge();
      if (challenge.botStartUrl) {
        window.open(challenge.botStartUrl, '_blank', 'noopener,noreferrer');
      }

      setHint('Открой бота в Telegram и нажми Start. После этого вход завершится автоматически.');
      startPolling(challenge.token, challenge.expiresAt);
    } catch (error) {
      clearPolling();
      setIsStarting(false);
      setHint('Не удалось запустить авторизацию через Telegram.');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '12px', justifyItems: 'center' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleStart}
        disabled={isStarting}
        style={{ minWidth: '220px' }}
      >
        {isStarting ? 'Ожидаем подтверждение в Telegram...' : 'Войти через Telegram'}
      </button>
      {hint && (
        <div style={{ maxWidth: '280px', fontSize: '13px', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          {hint}
        </div>
      )}
    </div>
  );
};
