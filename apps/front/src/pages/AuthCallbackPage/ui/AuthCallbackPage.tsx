import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, needsProfileComplete, completeYandexAuth } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(true);

  const state = searchParams.get('state') ?? '';
  const code = searchParams.get('code') ?? '';
  const providerError = searchParams.get('error') ?? '';

  const nextPath = useMemo(() => {
    if (!isAuthenticated) return null;
    return needsProfileComplete ? '/complete-registration' : '/home';
  }, [isAuthenticated, needsProfileComplete]);

  useEffect(() => {
    if (providerError) {
      setError('Яндекс отклонил авторизацию. Попробуй ещё раз.');
      setIsSubmitting(false);
      return;
    }
    if (!state || !code) {
      setError('В callback не пришёл код авторизации.');
      setIsSubmitting(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await completeYandexAuth(state, code);
        if (!cancelled) {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError('Не удалось завершить вход через Яндекс.');
          setIsSubmitting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, completeYandexAuth, navigate, providerError, state]);

  if (nextPath) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg">
        <div className="auth-bg__glow auth-bg__glow--tr" />
        <div className="auth-bg__glow auth-bg__glow--bl" />
      </div>
      <div className="auth-content">
        <div className="auth-card fade-in">
          <div className="auth-card__body">
            <h1 className="auth-card__headline">Завершаем вход</h1>
            <p className="auth-card__sub">
              {error || (isSubmitting ? 'Проверяем код авторизации и поднимаем сессию…' : 'Нужно вернуться и повторить вход.')}
            </p>
            {error && (
              <div className="auth-card__actions">
                <button type="button" className="btn btn-primary auth-card__btn" onClick={() => navigate('/login', { replace: true })}>
                  Вернуться ко входу
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
