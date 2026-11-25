import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { LoginInput, RegisterInput, Session } from '@/api/contracts'
import { authApi, cartApi } from '@/api/endpoints'
import { authStore } from '@/auth/authStore'
import { peekGuestCartId, rotateGuestCartId } from '@/auth/guestCart'
import { clearPrivateCache } from '@/app/queryClient'
import { qk } from './keys'

/**
 * Após autenticar:
 *  1. limpa qualquer cache privado/de carrinho anterior (troca de usuário);
 *  2. grava a sessão (o socket reconecta com o novo token);
 *  3. incorpora o carrinho do visitante ao carrinho do usuário (API);
 *  4. gera um novo id de visitante (o antigo já foi consumido).
 */
async function completeAuth(queryClient: QueryClient, session: Session) {
  await clearPrivateCache(queryClient)
  authStore.setSession(session)
  const guestId = peekGuestCartId()
  if (guestId) {
    try {
      const cart = await cartApi.merge(guestId)
      queryClient.setQueryData(qk.cart.data(`user:${session.user.id}`), cart)
      if (cart.itemCount > 0) toast.info('Os itens que você escolheu antes de entrar foram mantidos no carrinho.')
    } catch {
      toast.error('Não foi possível recuperar os itens do carrinho de visitante.')
    }
    rotateGuestCartId()
  }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: async (session) => {
      await completeAuth(queryClient, session)
      toast.success(`Bem-vindo de volta, ${session.user.displayName}!`)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: async (session) => {
      await completeAuth(queryClient, session)
      toast.success('Perfil de colecionador criado!')
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        /* mesmo offline, o logout local deve acontecer */
      }
    },
    onSettled: async () => {
      rotateGuestCartId()
      authStore.logout()
      await clearPrivateCache(queryClient)
      toast.success('Você saiu da sua conta.')
    },
  })
}
