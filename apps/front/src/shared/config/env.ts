const apiUrl = (import.meta.env.VITE_API_URL || '/').replace(/\/$/, '');
const wsUrl = (import.meta.env.VITE_WS_URL || apiUrl || '').replace(/\/$/, '');
const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  return fallback;
};

export const ENV = {
  // Базовый URL бэкенда. Пути (например /api/v1/...) добавляются в самих API-методах.
  API_URL: apiUrl,
  // URL для SSE (Server-Sent Events)
  SSE_URL: (import.meta.env.VITE_SSE_URL || apiUrl || '').replace(/\/$/, ''),
  WS_URL: wsUrl,
  ARENA_REQUIRE_AUTH: parseBoolean(import.meta.env.VITE_ARENA_REQUIRE_AUTH, false),
};
