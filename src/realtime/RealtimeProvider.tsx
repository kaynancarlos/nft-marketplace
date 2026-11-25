import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { SOCKET_EVENTS, type NftUpdatedEvent, type OrderUpdatedEvent } from '@/api/contracts'
import { useAuth } from '@/auth/authStore'
import { applyNftUpdated, applyOrderUpdated } from './applyEvents'
import { EventGuard } from './eventGuard'
import { realtimeStore } from './realtimeStore'

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock'

/**
 * Ciclo de vida do socket.io-client:
 *  - um socket por sessão (token). Trocar de usuário/logout → o socket antigo
 *    é desconectado, os listeners removidos e o EventGuard descartado — eventos
 *    de uma sessão anterior nunca chegam à nova;
 *  - reconexão automática com backoff; ao reconectar, as consultas ativas de
 *    catálogo, carrinho e dados privados são revalidadas via REST.
 */
export function RealtimeProvider() {
  const queryClient = useQueryClient()
  const { token, user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    const guard = new EventGuard()
    let hasConnected = false
    realtimeStore.setStatus('connecting')

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      query: token ? { token } : {},
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 5000,
    })

    socket.on('connect', () => {
      realtimeStore.setStatus('connected')
      if (hasConnected) {
        // Reconciliação: o que mudou enquanto estávamos desconectados?
        queryClient.invalidateQueries({
          predicate: (q) => ['nfts', 'cart', 'private'].includes(String(q.queryKey[0])),
          refetchType: 'active',
        })
      }
      hasConnected = true
    })

    socket.on('disconnect', () => realtimeStore.setStatus('reconnecting'))
    socket.io.on('reconnect_attempt', () => realtimeStore.setStatus('reconnecting'))
    socket.on('connect_error', () => realtimeStore.setStatus(hasConnected ? 'reconnecting' : 'offline'))

    socket.on(SOCKET_EVENTS.nftUpdated, (event: NftUpdatedEvent) => {
      if (!guard.accept(event)) return
      applyNftUpdated(queryClient, event)
    })

    socket.on(SOCKET_EVENTS.orderUpdated, (event: OrderUpdatedEvent) => {
      if (!guard.accept(event)) return
      applyOrderUpdated(queryClient, event, userId)
    })

    return () => {
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
      realtimeStore.setStatus('idle')
    }
  }, [queryClient, token, userId])

  return null
}
