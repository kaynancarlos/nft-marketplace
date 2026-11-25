import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { ConnectWalletInput, CreateOrderInput, Order, Quote, QuoteOutdatedDetails } from '@/api/contracts'
import { isApiError } from '@/api/client'
import { orderApi, walletApi } from '@/api/endpoints'
import { useAuth } from '@/auth/authStore'
import { useCartOwner } from '@/queries/cart'
import { qk } from '@/queries/keys'
import { clearDraft, markAttemptOrder, type CheckoutAttempt } from './checkoutStorage'

export function useConnectWallet() {
  return useMutation({
    mutationFn: (input: ConnectWalletInput) => walletApi.connect(input),
  })
}

export function useDisconnectWallet() {
  return useMutation({
    mutationFn: (sessionId: string) => walletApi.disconnect(sessionId),
  })
}

/**
 * Criação de pedido idempotente. Falhas transitórias (timeout, rede, 5xx) são
 * repetidas automaticamente com a MESMA chave — a API devolve o mesmo pedido
 * em vez de criar outro.
 *
 * A navegação para o pedido fica aqui (callback do useMutation, e não do
 * mutate): assim ela acontece mesmo se a tela de checkout desmontar durante o
 * envio — por exemplo, quando o carrinho esvazia porque o pedido já foi
 * confirmado enquanto o cliente ainda aguardava a resposta.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const owner = useCartOwner()
  return useMutation({
    mutationKey: ['orders', 'create'],
    mutationFn: ({ input, attempt }: { input: CreateOrderInput; attempt: CheckoutAttempt }) =>
      orderApi.create(input, attempt.key),
    retry: (failureCount, error) => isApiError(error) && error.retryable && failureCount < 2,
    retryDelay: 1000,
    onSuccess: (order: Order, { attempt }) => {
      markAttemptOrder(attempt, order.id)
      clearDraft()
      if (user) queryClient.setQueryData(qk.private.order(user.id, order.id), order)
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: (error, { input }) => {
      // 409 com cotação atual: atualiza o cache para a revisão mostrar os novos valores.
      if (isApiError(error) && (error.code === 'QUOTE_OUTDATED' || error.code === 'OUT_OF_STOCK')) {
        const details = error.details as QuoteOutdatedDetails | undefined
        if (details?.quote) queryClient.setQueryData<Quote>(qk.cart.quote(owner, input.network), details.quote)
        queryClient.invalidateQueries({ queryKey: qk.cart.root(owner) })
      }
    },
  })
}