import React, { useEffect, useRef } from 'react';
import { ENV } from '@/shared/config/env';
import { TelegramUser } from '@/entities/User/model/types';

interface TelegramAuthWidgetProps {
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write';
}

export const TelegramAuthWidget: React.FC<TelegramAuthWidgetProps> = ({
  onAuth,
  buttonSize = 'large',
  cornerRadius = 8,
  requestAccess = 'write',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleAuth = (user: TelegramUser) => {
      onAuth(user);
    };
    (window as unknown as { onTelegramAuth?: (user: TelegramUser) => void }).onTelegramAuth = handleAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', ENV.TELEGRAM_BOT_NAME);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      delete (window as unknown as { onTelegramAuth?: (user: TelegramUser) => void }).onTelegramAuth;
    };
  }, [onAuth, buttonSize, cornerRadius, requestAccess]);

  return <div ref={containerRef} className="telegram-login-container" style={{ display: 'inline-block' }}></div>;
};
