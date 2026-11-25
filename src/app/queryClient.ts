import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/client'
import { qk } from '@/queries/keys'

/**
 * Política de cache (detalhada no ARCHITECTURE.md):
 *  - staleTime 30 s: dados recém-buscados não refazem requisição ao montar.
 *  - Retry só para falhas transitórias (rede, timeout, 5xx), até 2 vezes,
 *    com backoff exponencial (1 s, 2 s). 4xx nunca é repetido.
 *  - Mutations não repetem automaticamente (exceto criação de pedido, que é
 *    idempotente e define sua própria política).
 *  - Eventos Socket.IO atualizam/invalidade o cache; ao reconectar, as
 *    consultas ativas são revalidadas (ver src/realtime).
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => isApiError(error) && error.retryable && failureCount < 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/** Remove todo dado privado/do carrinho (logout, expiração, troca de usuário). */
export async function clearPrivateCache(queryClient: QueryClient) {
  const predicate = (q: { queryKey: readonly unknown[] }) =>
    q.queryKey[0] === qk.private.all[0] || q.queryKey[0] === qk.cart.all[0]
  await queryClient.cancelQueries({ predicate })
  queryClient.removeQueries({ predicate })
  queryClient.getMutationCache().clear()
}
