import React, { useState } from 'react';
import { TelegramAuthWidget } from '@/features/Auth/ui/TelegramAuthWidget';
import { useAuth } from '@/app/providers/AuthProvider';

export const LoginPage: React.FC = () => {
  const { login, loginWithPassword, registerWithPassword } = useAuth();
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'telegram' | 'login' | 'register'>('telegram');
  const [form, setForm] = useState({
    login: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTelegramAuth = async (token: string, code: string) => {
    try {
      setError('');
      await login(token, code);
    } catch (err) {
      setError('Ошибка авторизации через Telegram');
      console.error(err);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      if (mode === 'register') {
        if (form.password.trim().length < 8) {
          setError('Для регистрации нужен пароль минимум 8 символов');
          return;
        }
        if (!form.firstName.trim()) {
          setError('Укажите имя');
          return;
        }
        await registerWithPassword(form);
        return;
      }
      await loginWithPassword(form.login, form.password);
    } catch (err) {
      setError(mode === 'register' ? 'Ошибка обычной регистрации' : 'Ошибка входа по логину и паролю');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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

        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button type="button" className="btn" onClick={() => setMode('telegram')} style={{ minHeight: '42px', opacity: mode === 'telegram' ? 1 : 0.7 }}>
              Telegram
            </button>
            <button type="button" className="btn" onClick={() => setMode('login')} style={{ minHeight: '42px', opacity: mode === 'login' ? 1 : 0.7 }}>
              Вход
            </button>
            <button type="button" className="btn" onClick={() => setMode('register')} style={{ minHeight: '42px', opacity: mode === 'register' ? 1 : 0.7 }}>
              Регистрация
            </button>
          </div>

          {mode === 'telegram' ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <TelegramAuthWidget onAuth={handleTelegramAuth} />
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
              {mode === 'register' && (
                <>
                  <input
                    className="input"
                    placeholder="Имя"
                    value={form.firstName}
                    onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder="Фамилия"
                    value={form.lastName}
                    onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  />
                </>
              )}
              <input
                className="input"
                type="text"
                placeholder="Логин"
                value={form.login}
                onChange={(event) => setForm((prev) => ({ ...prev, login: event.target.value }))}
              />
              <input
                className="input"
                type="password"
                placeholder={mode === 'register' ? 'Пароль, минимум 8 символов' : 'Пароль'}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minHeight: '46px' }}>
                {isSubmitting ? 'Подождите...' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
