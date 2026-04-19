import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { ENV } from '../config/env'

export { AxiosError }

const getAuthToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ---------- error interceptor (centralised toast + auth cleanup) ----------

// Callers can opt out of the global toast when they already show an
// inline error in the page ("silent: true") — e.g. form validation where
// the UI already highlights the field. Default is to surface a toast.
declare module 'axios' {
  interface AxiosRequestConfig {
    silent?: boolean
  }
}

type ToastDispatch = (opts: { title: string; body?: string; kind: 'QUEST' | 'DUEL' | 'GUILD' | 'LOOT' }) => void

// Dispatch is injected by the app at startup (see app/providers/AppShell
// or similar) so base.ts stays free of React imports. This decoupling
// keeps the module loadable from Node-side tests.
let toastDispatch: ToastDispatch | null = null
export function registerErrorToast(fn: ToastDispatch) { toastDispatch = fn }

function extractErrorMessage(err: AxiosError): { title: string; body?: string } {
  const status = err.response?.status
  // Kratos errors shape: {reason: 'CODE', message: 'human text', metadata: {...}}
  const data = err.response?.data as { message?: string; reason?: string } | undefined
  const message = data?.message?.trim()

  if (status === 429) {
    return { title: 'Слишком часто', body: message || 'Подожди немного перед следующей попыткой.' }
  }
  if (status === 401) {
    return { title: 'Сессия истекла', body: 'Войди заново, чтобы продолжить.' }
  }
  if (status === 403) {
    return { title: 'Недостаточно прав', body: message }
  }
  if (status === 404) {
    return { title: 'Не найдено', body: message }
  }
  if (status && status >= 500) {
    return { title: 'Сервер недоступен', body: 'Попробуй ещё раз через минуту.' }
  }
  if (!err.response) {
    return { title: 'Нет соединения', body: 'Проверь интернет.' }
  }
  return { title: 'Ошибка', body: message }
}

// Routes we never redirect-on-401 for — probing these is how the app
// discovers whether the user is signed in (GetProfile is the canonical
// one). Without this guard, the initial page-load probe would bounce
// every anonymous visitor to /login before they've even seen the
// hub/landing page.
// AUTH_PROBE_URLS suppresses the global "401 → /login" redirect for routes
// that legitimately fire while the user is mid-task. The chat endpoint
// belongs here because its 401 path was eating drafts: a single expired
// cookie kicked the user out of /interview/live mid-message.
const AUTH_PROBE_URLS = [
  '/api/v1/profile/auth/me',
  '/api/v1/profile/me',
  '/api/v1/interview/live/chat',
]

function isAuthProbe(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_PROBE_URLS.some((p) => url.endsWith(p))
}

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const config = err.config as AxiosRequestConfig | undefined
    if (err.response?.status === 401) {
      // Clear stale Bearer token; cookies remain for the browser to clean up.
      localStorage.removeItem('authToken')
      // Send the user back to /login so they can re-authenticate.
      // Skip when already on /login (prevents a redirect loop while the
      // login page's own probes fail) or when hitting an auth probe.
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/auth') &&
        !isAuthProbe(config?.url)
      ) {
        const returnTo = window.location.pathname + window.location.search
        window.location.assign(`/login?return=${encodeURIComponent(returnTo)}`)
      }
    }
    if (toastDispatch && !config?.silent && !isAuthProbe(config?.url)) {
      const { title, body } = extractErrorMessage(err)
      toastDispatch({ title, body, kind: 'QUEST' })
    }
    return Promise.reject(err)
  },
)

function encodeNameBase64(name: string): string {
  return btoa(encodeURIComponent(name).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
}

export function withGuestArenaHeaders(actorId?: string, guestName?: string) {
  const headers: Record<string, string> = {}
  if (actorId) headers['X-Arena-Guest-Id'] = actorId
  if (guestName) headers['X-Arena-Guest-Name'] = encodeNameBase64(guestName)
  return headers
}

export function withGuestCodeRoomHeaders(guestName?: string) {
  if (!guestName) return {}
  return { 'X-Code-Editor-Guest-Name': encodeNameBase64(guestName) }
}

export interface ListQueryParams {
  limit?: number
  offset?: number
}

export const DEFAULT_LIST_QUERY: Required<ListQueryParams> = { limit: 100, offset: 0 }

export function withDefaultListQuery(params?: ListQueryParams) {
  return { ...DEFAULT_LIST_QUERY, ...params }
}
