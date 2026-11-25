import { delay, http, HttpResponse } from 'msw'
import type { ApiErrorBody, ErrorCode } from '@/api/contracts'
import { db, findUser } from './db'
import { failureFor, latencyFor } from './scenarios'
import type { UserRecord } from './fixtures'

export const API = '/api'

export class ApiFail extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
    public details?: unknown,
  ) {
    super(message)
  }
}

export function errorResponse(status: number, code: ErrorCode, message: string, fields?: Record<string, string>, details?: unknown) {
  const body: ApiErrorBody = { error: { code, message, ...(fields ? { fields } : {}), ...(details ? { details } : {}) } }
  return HttpResponse.json(body, { status })
}

export interface RouteContext {
  request: Request
  url: URL
  params: Record<string, string>
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Registra um handler aplicando, nesta ordem:
 *   latência do cenário → falha configurada → regra de negócio.
 * Exceções ApiFail viram respostas de erro tipadas.
 */
export function route(method: Method, path: string, handler: (ctx: RouteContext) => Promise<Response> | Response) {
  return http[method](`${API}${path}`, async ({ request, params }) => {
    const url = new URL(request.url)
    const ms = latencyFor(request.method, url)
    if (ms > 0) await delay(ms)

    const failure = failureFor(request.method, url)
    if (failure) {
      if (failure.status === 'network') return HttpResponse.error()
      return errorResponse(failure.status, (failure.code as ErrorCode) ?? 'INTERNAL', failure.message ?? 'Falha simulada.')
    }

    try {
      return await handler({ request, url, params: params as Record<string, string> })
    } catch (error) {
      if (error instanceof ApiFail) {
        return errorResponse(error.status, error.code, error.message, error.fields, error.details)
      }
      console.error('[mocks] erro inesperado no handler', error)
      return errorResponse(500, 'INTERNAL', 'Erro inesperado na API simulada.')
    }
  })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiFail(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido.')
  }
}

/* ------------------------------------------------------------------ */
/* Autenticação                                                        */
/* ------------------------------------------------------------------ */

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

/** Usuário autenticado ou null (sem lançar). Sessões expiradas contam como anônimas. */
export function optionalUser(request: Request): UserRecord | null {
  const token = bearerToken(request)
  if (!token) return null
  const session = db.state.sessions[token]
  if (!session || session.expiresAt <= Date.now()) return null
  return findUser(session.userId)
}

export function requireUser(request: Request): { user: UserRecord; token: string } {
  const token = bearerToken(request)
  if (!token) throw new ApiFail(401, 'SESSION_INVALID', 'Faça login para continuar.')
  const session = db.state.sessions[token]
  if (!session) throw new ApiFail(401, 'SESSION_INVALID', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) throw new ApiFail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  const user = findUser(session.userId)
  if (!user) throw new ApiFail(401, 'SESSION_INVALID', 'Sessão inválida. Entre novamente.')
  return { user, token }
}

export function userIdFromToken(token: string | null): string | null {
  if (!token) return null
  const session = db.state.sessions[token]
  if (!session || session.expiresAt <= Date.now()) return null
  return session.userId
}

export async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
