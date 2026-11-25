import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { authStore } from '@/auth/authStore'
import { getGuestCartId } from '@/auth/guestCart'
import type { ApiErrorBody, ErrorCode } from './contracts'

/**
 * Erro normalizado que toda a aplicação recebe (Query, formulários, UI).
 * `retryable` indica falhas transitórias (rede, timeout, 5xx) — as únicas
 * que o TanStack Query repete automaticamente.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED',
    message: string,
    public fields: Record<string, string> = {},
    public details: unknown = undefined,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get retryable() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export const REQUEST_TIMEOUT_MS = 8000

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = authStore.token
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Cart-Id', getGuestCartId())
  return config
})

function toApiError(error: unknown): ApiError {
  if (axios.isCancel(error)) return new ApiError(0, 'CANCELED', 'Requisição cancelada.')
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(0, 'TIMEOUT', 'O servidor demorou para responder. Tente novamente.')
    }
    if (!error.response) {
      return new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.')
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    const payload = body?.error
    return new ApiError(
      error.response.status,
      payload?.code ?? (error.response.status >= 500 ? 'INTERNAL' : 'VALIDATION_ERROR'),
      payload?.message ?? 'Algo deu errado. Tente novamente.',
      payload?.fields ?? {},
      payload?.details,
    )
  }
  return new ApiError(0, 'INTERNAL', error instanceof Error ? error.message : 'Erro inesperado.')
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const sentToken = error instanceof AxiosError && Boolean(error.config?.headers?.Authorization)
    if (apiError.status === 401 && sentToken && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'SESSION_INVALID')) {
      authStore.expire()
    }
    return Promise.reject(apiError)
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<T>(config)
  return response.data
}
