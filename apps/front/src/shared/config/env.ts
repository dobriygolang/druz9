export const ENV = {
  // Базовый URL бэкенда. Пути (например /api/v1/...) добавляются в самих API-методах.
  API_URL: (import.meta.env.VITE_API_URL || '/').replace(/\/$/, ''),
  // Убираем @ если пользователь случайно его написал
  TELEGRAM_BOT_NAME: (import.meta.env.VITE_TELEGRAM_BOT_NAME || 'samplebot').replace(/^@/, ''),
};
