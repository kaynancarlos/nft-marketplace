import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddCartItemInput, Cart, Network } from '@/api/contracts'
import { cartApi, quoteApi } from '@/api/endpoints'
import { useAuth } from '@/auth/authStore'
import { getGuestCartId } from '@/auth/guestCart'
import { qk } from './keys'

/** Dono do carrinho: usuário autenticado ou visitante (id persistido). */
export function useCartOwner() {
  const { user } = useAuth()
  return useMemo(() => (user ? `user:${user.id}` : `guest:${getGuestCartId()}`), [user])
}

export function useCart() {
  const owner = useCartOwner()
  return useQuery({
    queryKey: qk.cart.data(owner),
    queryFn: ({ signal }) => cartApi.get({ signal }),
    staleTime: 10_000,
  })
}

/** Cotação (subtotal, desconto, taxa, total) calculada pela API — fonte da verdade dos valores. */
export function useQuote(network: Network, enabled = true) {
  const owner = useCartOwner()
  return useQuery({
    queryKey: qk.cart.quote(owner, network),
    queryFn: ({ signal }) => quoteApi.get(network, { signal }),
    enabled,
    staleTime: 5_000,
  })
}

export function syncCart(queryClient: QueryClient, owner: string, cart: Cart) {
  queryClient.setQueryData(qk.cart.data(owner), cart)
  queryClient.invalidateQueries({ queryKey: [...qk.cart.root(owner), 'quote'] })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: (input: AddCartItemInput & { name: string }) =>
      cartApi.add({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
    onSuccess: (cart, input) => {
      syncCart(queryClient, owner, cart)
      toast.success(`${input.name} foi adicionado ao carrinho.`)
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.update(itemId, quantity),
    onSuccess: (cart) => syncCart(queryClient, owner, cart),
    onError: (error) => {
      toast.error(error.message)
      queryClient.invalidateQueries({ queryKey: qk.cart.root(owner) })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; name: string }) => cartApi.remove(itemId),
    onSuccess: (cart, { name }) => {
      syncCart(queryClient, owner, cart)
      toast.success(`${name} foi removido do carrinho.`)
    },
    onError: (error) => {
      toast.error(error.message)
      queryClient.invalidateQueries({ queryKey: qk.cart.root(owner) })
    },
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (cart) => {
      syncCart(queryClient, owner, cart)
      toast.success(`Cupom ${cart.couponCode} aplicado.`)
    },
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => {
      syncCart(queryClient, owner, cart)
      toast.success('Cupom removido.')
    },
    onError: (error) => toast.error(error.message),
  })
}
