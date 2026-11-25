import { delay, HttpResponse } from 'msw'
import type { CreateOrderInput, Network } from '@/api/contracts'
import { collectorSchema, zodFieldErrors } from '@/api/schemas'
import { stableHash } from '@/lib/utils'
import { add } from '@/lib/money'
import { db, findNft, type OrderRecord } from '../db'
import {
  cartOwnerKey,
  computeQuote,
  getCart,
  hasBlockingIssues,
  mutateNft,
  scheduleOrder,
  settleDueOrders,
  toOrder,
} from '../domain'
import { ApiFail, readJson, requireUser, route } from '../http'
import { activeScenario, PAYMENT_RESOLUTION_MS } from '../scenarios'

function consumeOnce(flag: string) {
  if (db.state.consumed[flag]) return false
  db.state.consumed[flag] = true
  db.save()
  return true
}

export const orderHandlers = [
  /**
   * Criação idempotente.
   *  - Mesma Idempotency-Key + mesmo corpo  → 200 com o MESMO pedido.
   *  - Mesma chave + corpo diferente        → 409 IDEMPOTENCY_CONFLICT.
   *  - Cotação desatualizada                → 409 QUOTE_OUTDATED (+ cotação atual).
   *  - Item esgotado/insuficiente           → 409 OUT_OF_STOCK (+ cotação atual).
   */
  route('post', '/orders', async ({ request }) => {
    const { user } = requireUser(request)
    const key = request.headers.get('idempotency-key')
    if (!key || key.length < 8) {
      throw new ApiFail(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
    }
    const body = await readJson<CreateOrderInput>(request)
    const bodyHash = stableHash(body)
    const idemKey = `${user.id}:${key}`
    const previous = db.state.idempotency[idemKey]
    if (previous) {
      if (previous.bodyHash !== bodyHash) {
        throw new ApiFail(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.')
      }
      settleDueOrders()
      const existing = db.state.orders.find((o) => o.id === previous.orderId)!
      return HttpResponse.json(toOrder(existing), { status: 200, headers: { 'Idempotent-Replayed': 'true' } })
    }

    const collector = collectorSchema.safeParse(body.collector ?? {})
    if (!collector.success) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Revise os dados do colecionador.', zodFieldErrors(collector.error))
    }
    const network = body.network as Network
    if (!['ethereum', 'polygon', 'solana'].includes(network)) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Selecione uma rede.', { network: 'Selecione uma rede.' })
    }

    const cart = getCart(cartOwnerKey(request, user))
    if (!cart || cart.items.length === 0) throw new ApiFail(422, 'CART_EMPTY', 'Seu carrinho está vazio.')

    const scenario = activeScenario()
    const firstItem = cart.items[0]
    if (scenario.priceChangeAtCheckout && consumeOnce('price-change-at-checkout')) {
      const nft = findNft(firstItem.nftId)
      if (nft) {
        mutateNft(nft, (n) => {
          for (const edition of n.editions) edition.price = add(edition.price, '0.15')
        })
      }
    }
    if (scenario.soldOutAtCheckout && consumeOnce('sold-out-at-checkout')) {
      const nft = findNft(firstItem.nftId)
      if (nft) {
        mutateNft(nft, (n) => {
          const edition = n.editions.find((e) => e.id === firstItem.editionId)
          if (edition) edition.available = 0
        })
      }
    }

    const quote = computeQuote(cart, network)
    if (hasBlockingIssues(quote)) {
      throw new ApiFail(409, 'OUT_OF_STOCK', 'Um ou mais itens não estão mais disponíveis na quantidade escolhida.', undefined, { quote })
    }
    if (quote.hash !== body.quoteHash) {
      throw new ApiFail(409, 'QUOTE_OUTDATED', 'Os valores do pedido mudaram. Revise e confirme novamente.', undefined, { quote })
    }

    const session = db.state.walletSessions[body.walletSessionId]
    const wallets = db.state.wallets[user.id]
    const wallet = [wallets?.primary, wallets?.secondary].find((w) => w?.id === body.walletId)
    if (!session || session.userId !== user.id || session.status !== 'connected' || session.walletId !== body.walletId || !wallet) {
      throw new ApiFail(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar a compra.')
    }

    const now = new Date()
    const order: OrderRecord = {
      id: db.nextId('ord'),
      userId: user.id,
      status: 'pending',
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      network,
      wallet: { label: wallet.label, address: wallet.address, provider: session.provider },
      items: quote.items.map((l) => ({
        nftId: l.nftId,
        editionId: l.editionId,
        name: l.name,
        image: l.image,
        tokenId: l.tokenId,
        editionLabel: l.editionLabel,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      coupon: quote.coupon,
      txHash: null,
      failureReason: null,
      collector: collector.data,
      resolveAt: now.getTime() + PAYMENT_RESOLUTION_MS,
      outcome: scenario.paymentOutcome ?? 'confirmed',
    }
    db.state.orders.push(order)
    db.state.idempotency[idemKey] = { bodyHash, orderId: order.id }
    db.save()
    scheduleOrder(order)

    // Cenário: o pedido foi criado, mas a resposta "se perde" (timeout no cliente).
    if (scenario.orderResponseDelayMs && consumeOnce('order-timeout')) {
      await delay(scenario.orderResponseDelayMs)
    }

    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  route('get', '/orders/:id', ({ request, params }) => {
    const { user } = requireUser(request)
    settleDueOrders()
    const order = db.state.orders.find((o) => o.id === params.id)
    if (!order) throw new ApiFail(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== user.id) throw new ApiFail(403, 'FORBIDDEN', 'Você não tem permissão para ver este pedido.')
    return HttpResponse.json(toOrder(order))
  }),

  route('get', '/orders', ({ request, url }) => {
    const { user } = requireUser(request)
    settleDueOrders()
    const status = url.searchParams.get('status')
    const orders = db.state.orders
      .filter((o) => o.userId === user.id && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return HttpResponse.json({ items: orders })
  }),
]
