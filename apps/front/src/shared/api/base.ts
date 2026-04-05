import axios, { AxiosError } from 'axios'
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

export function withGuestArenaHeaders(actorId?: string, guestName?: string) {
  const headers: Record<string, string> = {}
  if (actorId) headers['X-Arena-Guest-Id'] = actorId
  if (guestName) headers['X-Arena-Guest-Name'] = btoa(encodeURIComponent(guestName).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
  return headers
}

export function withGuestCodeRoomHeaders(guestName?: string) {
  if (!guestName) return {}
  return { 'X-Code-Editor-Guest-Name': btoa(encodeURIComponent(guestName).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)))) }
}

export interface ListQueryParams {
  limit?: number
  offset?: number
}

export const DEFAULT_LIST_QUERY: Required<ListQueryParams> = { limit: 100, offset: 0 }

export function withDefaultListQuery(params?: ListQueryParams) {
  return { ...DEFAULT_LIST_QUERY, ...params }
}
