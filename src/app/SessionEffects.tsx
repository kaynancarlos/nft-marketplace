import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authApi } from '@/api/endpoints'
import { authStore, useAuth } from '@/auth/authStore'
import { realtimeStore } from '@/realtime/realtimeStore'
import { clearPrivateCache } from './queryClient'

const PRIVATE_PREFIXES = ['/checkout', '/account', '/orders']

/**
 * Efeitos globais de sessão:
 *  - revalida a sessão no boot (GET /auth/session);
 *  - agenda a expiração local no horário informado pela API;
 *  - quando a sessão expira, limpa o cache privado e leva ao login
 *    preservando a rota atual (o checkout guarda o rascunho em sessionStorage).
 */
export function SessionEffects() {
  const { token, expiresAt, endedReason } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const locationRef = useRef(location)
  locationRef.current = location
  const previousToken = useRef(token)

  // Revalidação no boot.
  useEffect(() => {
    if (!authStore.token) return
    const controller = new AbortController()
    authApi
      .session({ signal: controller.signal })
      .then((session) => authStore.updateUser(session.user))
      .catch(() => {
        /* 401 já tratado pelo interceptor */
      })
    return () => controller.abort()
  }, [])

  // Expiração agendada.
  useEffect(() => {
    if (!token || !expiresAt) return
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) {
      authStore.expire()
      return
    }
    const timer = window.setTimeout(() => authStore.expire(), Math.min(ms, 2_147_000_000))
    return () => window.clearTimeout(timer)
  }, [token, expiresAt])

  // Reação à perda de sessão.
  useEffect(() => {
    const had = previousToken.current
    previousToken.current = token
    if (!had || token) return
    realtimeStore.clearNotices()
    void clearPrivateCache(queryClient)
    if (endedReason === 'expired') {
      const { pathname, href } = locationRef.current
      toast.warning('Sua sessão expirou. Entre novamente para continuar de onde parou.', { id: 'session-expired' })
      if (PRIVATE_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/cart') {
        void navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
      }
    } else if (endedReason === 'logout') {
      const { pathname } = locationRef.current
      if (PRIVATE_PREFIXES.some((p) => pathname.startsWith(p))) void navigate({ to: '/' })
    }
  }, [token, endedReason, queryClient, navigate])

  return null
}
