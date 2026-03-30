import React, { useState } from 'react';
import { TelegramAuthWidget } from '@/features/Auth/ui/TelegramAuthWidget';
import { useAuth } from '@/app/providers/AuthProvider';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleTelegramAuth = async (token: string) => {
    try {
      setError('');
      await login(token);
    } catch (err) {
      setError('Ошибка авторизации через Telegram');
      console.error(err);
    }
  };

  return (
    <div className="flex-center full-height" style={{ padding: '20px' }}>
      <div className="card fade-in" style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px', fontWeight: '600' }}>Вход в систему</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          Необходима авторизация через Telegram
        </p>

        {error && (
          <div style={{ color: 'var(--danger-color)', marginBottom: '24px', fontSize: '14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TelegramAuthWidget onAuth={handleTelegramAuth} />
        </div>
      </div>
    </div>
  );
};
