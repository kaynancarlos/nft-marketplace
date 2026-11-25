import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart, NftDetail, NftListResponse, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/api/contracts'
import { compare, formatEth } from '@/lib/money'
import { qk } from '@/queries/keys'
import { realtimeStore } from './realtimeStore'

/**
 * nft.updated → atualiza preço/disponibilidade no detalhe e nas listas
 * (respeitando a versão em cache) e, se o NFT estiver no carrinho, revalida
 * carrinho + cotação e mostra um aviso.
 */
function knownNftVersion(queryClient: QueryClient, nftId: string): number {
  let known = queryClient.getQueryData<NftDetail>(qk.nfts.detail(nftId))?.version ?? 0
  for (const [, list] of queryClient.getQueriesData<NftListResponse>({ queryKey: qk.nfts.lists() })) {
    const item = list?.items.find((i) => i.id === nftId)
    if (item && item.version > known) known = item.version
  }
  return known
}

export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  // Se o cache REST já tem uma versão igual ou mais nova (uma consulta chegou
  // depois da mudança), não há o que corrigir no detalhe/listas. O carrinho e a
  // cotação são revalidados mesmo assim: eles podem ter sido lidos antes.
  if (knownNftVersion(queryClient, event.data.nftId) < event.version) patchNftCaches(queryClient, event)
  revalidateCart(queryClient, event)
}

function patchNftCaches(queryClient: QueryClient, event: NftUpdatedEvent) {
  const { data, version } = event
  queryClient.setQueryData<NftDetail>(qk.nfts.detail(data.nftId), (old) => {
    if (!old || old.version >= version) return old
    return {
      ...old,
      price: data.price,
      soldOut: data.soldOut,
      version,
      editions: old.editions.map((edition) => {
        const update = data.editions.find((e) => e.id === edition.id)
        return update ? { ...edition, price: update.price, available: update.available } : edition
      }),
    }
  })

  queryClient.setQueriesData<NftListResponse>({ queryKey: qk.nfts.lists() }, (old) => {
    if (!old) return old
    let changed = false
    const items = old.items.map((item) => {
      if (item.id !== data.nftId || item.version >= version) return item
      changed = true
      return { ...item, price: data.price, soldOut: data.soldOut, version }
    })
    return changed ? { ...old, items } : old
  })

  // NFTs relacionados exibidos em outros detalhes (carrossel "Mais desta coleção").
  queryClient.setQueriesData<NftDetail>({ queryKey: ['nfts', 'detail'] }, (old) => {
    if (!old || !old.related.some((r) => r.id === data.nftId && r.version < version)) return old
    return {
      ...old,
      related: old.related.map((r) =>
        r.id === data.nftId && r.version < version ? { ...r, price: data.price, soldOut: data.soldOut, version } : r,
      ),
    }
  })
}

function revalidateCart(queryClient: QueryClient, event: NftUpdatedEvent) {
  const { data } = event
  // Carrinho: qualquer carrinho em cache que contenha o NFT.
  const carts = queryClient.getQueriesData<Cart>({ queryKey: qk.cart.all })
  const affected = carts
    .map(([, cart]) => cart)
    .filter((cart): cart is Cart => Boolean(cart && 'itemCount' in cart))
    .flatMap((cart) => cart.items.filter((item) => item.nftId === data.nftId))

  if (affected.length > 0) {
    const item = affected[0]
    const edition = data.editions.find((e) => e.id === item.editionId)
    let message: string
    if (edition && compare(edition.price, item.unitPrice) !== 0) {
      message = `O preço de ${data.name} (${item.editionLabel}) mudou de ${formatEth(item.unitPrice)} para ${formatEth(edition.price)} ETH. O resumo foi atualizado.`
    } else if (edition && edition.available < item.quantity) {
      message =
        edition.available === 0
          ? `${data.name} (${item.editionLabel}) esgotou. Remova o item para continuar.`
          : `Só restam ${edition.available} unidade(s) de ${data.name} (${item.editionLabel}). Ajuste a quantidade.`
    } else {
      message = `A disponibilidade de ${data.name} foi atualizada.`
    }
    realtimeStore.pushNotice({ id: event.eventId, nftId: data.nftId, message })
    toast.warning(message, { id: `nft-${data.nftId}` })
  }

  queryClient.invalidateQueries({ queryKey: qk.cart.all })
}

/**
 * order.updated → só é aplicado se pertencer ao usuário atual (defesa extra:
 * o servidor já filtra por usuário). Atualiza o pedido em cache e, quando
 * confirmado, revalida o carrinho (a API removeu os itens comprados).
 */
export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, currentUserId: string | null) {
  const { data, version } = event
  if (!currentUserId || data.userId !== currentUserId) return

  const key = qk.private.order(currentUserId, data.orderId)
  const before = queryClient.getQueryData<Order>(key)
  queryClient.setQueryData<Order>(key, (old) => {
    if (!old || old.version >= version) return old
    return { ...old, status: data.status, txHash: data.txHash, failureReason: data.failureReason, version }
  })
  queryClient.invalidateQueries({ queryKey: key })

  if (before?.status === data.status) return
  if (data.status === 'confirmed') {
    toast.success('Pagamento confirmado! Seus NFTs já estão na sua carteira.', { id: `order-${data.orderId}` })
    queryClient.invalidateQueries({ queryKey: qk.cart.all })
  } else if (data.status === 'rejected') {
    toast.error('Pagamento recusado. Seus itens continuam no carrinho.', { id: `order-${data.orderId}` })
    queryClient.invalidateQueries({ queryKey: qk.cart.all })
  }
}