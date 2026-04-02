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
    return needsProfileComplete ? '/complete-registration' : '/feed';
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
          navigate('/feed', { replace: true });
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
      <div className="auth-shell card fade-in">
        <div className="auth-shell__hero">
          <span className="auth-shell__eyebrow">Yandex OAuth</span>
          <h1 className="auth-shell__title">Завершаем вход</h1>
          <p className="auth-shell__subtitle">
            {error || (isSubmitting ? 'Проверяем код авторизации и поднимаем сессию…' : 'Нужно вернуться и повторить вход.')}
          </p>
        </div>
        {error && (
          <button type="button" className="btn btn-primary auth-provider-card__action" onClick={() => navigate('/login', { replace: true })}>
            Вернуться ко входу
          </button>
        )}
      </div>
    </div>
  );
};
