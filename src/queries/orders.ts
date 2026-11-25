import { useQuery } from '@tanstack/react-query'
import { isApiError } from '@/api/client'
import { orderApi } from '@/api/endpoints'
import { useAuth } from '@/auth/authStore'
import { qk } from './keys'

/**
 * Estado do pedido. A fonte primária de atualização é o evento `order.updated`
 * (Socket.IO). Como rede de segurança, enquanto o pedido está pendente a
 * consulta é revalidada a cada 10 s e sempre que o socket reconecta.
 */
export function useOrder(orderId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.private.order(user?.id ?? 'anon', orderId),
    queryFn: ({ signal }) => orderApi.get(orderId, { signal }),
    enabled: Boolean(user),
    retry: (count, error) => isApiError(error) && error.retryable && count < 3,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 10_000 : false),
  })
}
