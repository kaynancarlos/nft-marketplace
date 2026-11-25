import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FavoritesResponse } from '@/api/contracts'
import { favoritesApi } from '@/api/endpoints'
import { useAuth } from '@/auth/authStore'
import { qk } from './keys'

export function useFavorites() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.private.favorites(user?.id ?? 'anon'),
    queryFn: ({ signal }) => favoritesApi.list({ signal }),
    enabled: Boolean(user),
    select: (data) => new Set(data.nftIds),
  })
}

/**
 * Atualização OTIMISTA com rollback:
 *  1. cancela consultas em voo da lista de favoritos;
 *  2. aplica a mudança no cache imediatamente;
 *  3. se a API falhar, restaura o snapshot anterior e avisa o usuário;
 *  4. ao final, revalida com o servidor.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationKey: ['favorites', 'toggle'],
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      if (!user) return { previous: undefined, key: undefined }
      const key = qk.private.favorites(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      const current = new Set(previous?.nftIds ?? [])
      if (favorite) current.add(nftId)
      else current.delete(nftId)
      queryClient.setQueryData<FavoritesResponse>(key, { nftIds: [...current] })
      return { previous, key }
    },
    onError: (error, { name, favorite }, context) => {
      if (context?.key) queryClient.setQueryData(context.key, context.previous)
      toast.error(
        `${favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos'} ${name}. ${error.message}`,
      )
    },
    onSuccess: (_data, { name, favorite }) => {
      toast.success(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onSettled: () => {
      if (user) queryClient.invalidateQueries({ queryKey: qk.private.favorites(user.id) })
    },
  })
}
