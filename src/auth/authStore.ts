import { useSyncExternalStore } from 'react'
import type { Session, User } from '@/api/contracts'
import { readJson, removeKey, writeJson } from '@/lib/utils'

/**
 * Política de sessão
 *  - O token (opaco, emitido pela API) e sua expiração ficam no localStorage
 *    para a sessão sobreviver a refresh. Senhas nunca são armazenadas.
 *  - A sessão é revalidada no boot via GET /auth/session.
 *  - 401 SESSION_EXPIRED/INVALID em qualquer chamada autenticada → `expire()`.
 *  - Logout/expiração/troca de usuário limpam o cache privado e o socket
 *    (ver SessionEffects em src/app/SessionEffects.tsx).
 */

const STORAGE_KEY = 'kurio:session'

export interface AuthState {
  token: string | null
  expiresAt: string | null
  user: User | null
  /** Motivo da última saída — usado para exibir aviso no login. */
  endedReason: 'logout' | 'expired' | null
}

type Listener = () => void

function initialState(): AuthState {
  const stored = readJson<{ token: string; expiresAt: string; user: User }>(STORAGE_KEY)
  if (stored?.token && stored.user && new Date(stored.expiresAt).getTime() > Date.now()) {
    return { token: stored.token, expiresAt: stored.expiresAt, user: stored.user, endedReason: null }
  }
  return { token: null, expiresAt: null, user: null, endedReason: stored ? 'expired' : null }
}

class AuthStore {
  private state: AuthState = initialState()
  private listeners = new Set<Listener>()

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.state

  private set(next: AuthState) {
    this.state = next
    for (const l of this.listeners) l()
  }

  setSession(session: Session) {
    writeJson(STORAGE_KEY, { token: session.token, expiresAt: session.expiresAt, user: session.user })
    this.set({ token: session.token, expiresAt: session.expiresAt, user: session.user, endedReason: null })
  }

  updateUser(user: User) {
    if (!this.state.token) return
    writeJson(STORAGE_KEY, { token: this.state.token, expiresAt: this.state.expiresAt, user })
    this.set({ ...this.state, user })
  }

  logout() {
    removeKey(STORAGE_KEY)
    this.set({ token: null, expiresAt: null, user: null, endedReason: 'logout' })
  }

  expire() {
    if (!this.state.token) return
    removeKey(STORAGE_KEY)
    this.set({ token: null, expiresAt: null, user: null, endedReason: 'expired' })
  }

  get token() {
    return this.state.token
  }

  get userId() {
    return this.state.user?.id ?? null
  }
}

export const authStore = new AuthStore()

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot)
}
