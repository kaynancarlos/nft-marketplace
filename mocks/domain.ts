import type {
  Cart,
  CartItem,
  Network,
  NftDetail,
  NftSummary,
  Order,
  Quote,
  QuoteIssue,
  QuoteLine,
  User,
  WalletSession,
} from '@/api/contracts'
import { add, max, min, mul, percentOf, sub } from '@/lib/money'
import { stableHash } from '@/lib/utils'
import { db, findNft, type CartRecord, type OrderRecord, type WalletSessionRecord } from './db'
import { buildReviews, MAX_PER_ORDER, NETWORK_FEES, type NftRecord, type UserRecord } from './fixtures'
import { ApiFail } from './http'
import { publish } from './realtime/bus'

/* ------------------------------------------------------------------ */
/* Usuários                                                            */
/* ------------------------------------------------------------------ */

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    displayName: record.displayName,
    username: record.username,
    email: record.email,
    avatarUrl: record.avatarUrl,
    bio: record.bio,
  }
}

/* ------------------------------------------------------------------ */
/* NFTs                                                                */
/* ------------------------------------------------------------------ */

export function displayPrice(nft: NftRecord): string {
  const available = nft.editions.filter((e) => e.available > 0)
  const pool = available.length ? available : nft.editions
  return pool.reduce((acc, e) => min(acc, e.price), pool[0].price)
}

export function isSoldOut(nft: NftRecord) {
  return nft.editions.every((e) => e.available === 0)
}

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    price: displayPrice(nft),
    compareAtPrice: nft.compareAtPrice,
    rarity: nft.rarity,
    trending: nft.trending,
    listedAt: nft.listedAt,
    soldOut: isSoldOut(nft),
    version: nft.version,
  }
}

export function toDetail(nft: NftRecord): NftDetail {
  const related = db.state.nfts.filter((n) => n.collection === nft.collection && n.id !== nft.id).slice(0, 8)
  const reviews = buildReviews(nft.id)
  return {
    ...toSummary(nft),
    description: nft.description,
    longDescription: [
      `${nft.name} é uma obra digital finalizada à mão da coleção ${nft.collection}. Cada atributo fica armazenado nos metadados do token e verificado na rede, garantindo procedência permanente.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência na rede. Novos donos recebem 5% de royalties nas vendas secundárias.',
    ],
    attributes: nft.attributes,
    editions: nft.editions.map((e) => ({ ...e })),
    gallery: [nft.image, nft.image, nft.image, nft.image],
    rating: nft.rating,
    reviews,
    contract: `${nft.id.slice(0, 6)}…1969 — Contrato inteligente ERC-721 verificado.`,
    royalties: '5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    maxPerOrder: MAX_PER_ORDER,
    related: related.map(toSummary),
  }
}

/**
 * Único ponto que altera um NFT. Incrementa a versão, persiste e publica
 * `nft.updated` — REST e Socket.IO ficam sempre coerentes.
 */
export function mutateNft(nft: NftRecord, mutator: (nft: NftRecord) => void) {
  const previousPrice = displayPrice(nft)
  mutator(nft)
  nft.version += 1
  db.save()
  publish({
    eventId: db.nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      nftId: nft.id,
      name: nft.name,
      price: displayPrice(nft),
      previousPrice,
      soldOut: isSoldOut(nft),
      editions: nft.editions.map((e) => ({ id: e.id, label: e.label, price: e.price, available: e.available })),
    },
  })
  db.save()
}

/* ------------------------------------------------------------------ */
/* Carrinho                                                            */
/* ------------------------------------------------------------------ */

export function cartOwnerKey(request: Request, user: UserRecord | null): string | null {
  if (user) return `user:${user.id}`
  const cartId = request.headers.get('x-cart-id')
  if (cartId && /^[a-zA-Z0-9-]{8,64}$/.test(cartId)) return `guest:${cartId}`
  return null
}

export function getCart(ownerKey: string | null, create = false): CartRecord | null {
  if (!ownerKey) return null
  let cart = db.state.carts[ownerKey]
  if (!cart && create) {
    cart = { id: db.nextId('cart'), ownerKey, items: [], couponCode: null, updatedAt: new Date().toISOString() }
    db.state.carts[ownerKey] = cart
  }
  return cart ?? null
}

export function findEdition(nftId: string, editionId: string) {
  const nft = findNft(nftId)
  if (!nft) throw new ApiFail(404, 'NOT_FOUND', 'NFT não encontrado.')
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) throw new ApiFail(404, 'NOT_FOUND', 'Edição não encontrada.')
  return { nft, edition }
}

export function maxQuantityFor(available: number) {
  return Math.max(0, Math.min(available, MAX_PER_ORDER))
}

export function toCart(record: CartRecord | null): Cart {
  if (!record) return { id: 'empty', items: [], couponCode: null, itemCount: 0, updatedAt: new Date(0).toISOString() }
  const items: CartItem[] = []
  for (const item of record.items) {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) continue
    items.push({
      id: item.id,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      quantity: item.quantity,
      unitPrice: edition.price,
      lineTotal: mul(edition.price, item.quantity),
      available: edition.available,
      maxQuantity: maxQuantityFor(edition.available),
      nft: { name: nft.name, image: nft.image, tokenId: nft.tokenId },
    })
  }
  return {
    id: record.id,
    items,
    couponCode: record.couponCode,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    updatedAt: record.updatedAt,
  }
}

export function validateCoupon(code: string) {
  const coupon = db.state.coupons.find((c) => c.code === code.trim().toUpperCase())
  if (!coupon) return { coupon: null, error: { code: 'COUPON_INVALID' as const, message: 'Cupom inválido. Confira o código digitado.' } }
  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { coupon: null, error: { code: 'COUPON_EXPIRED' as const, message: 'Este cupom expirou.' } }
  }
  return { coupon, error: null }
}

export function computeQuote(record: CartRecord | null, network: Network): Quote {
  const cart = toCart(record)
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = []

  for (const item of cart.items) {
    let quantity = item.quantity
    if (item.available === 0) {
      issues.push({ type: 'OUT_OF_STOCK', itemId: item.id, message: `${item.nft.name} (${item.editionLabel}) esgotou.` })
      quantity = 0
    } else if (item.available < item.quantity) {
      issues.push({
        type: 'QUANTITY_REDUCED',
        itemId: item.id,
        message: `Só restam ${item.available} unidade(s) de ${item.nft.name} (${item.editionLabel}).`,
      })
      quantity = item.available
    }
    if (quantity === 0) continue
    lines.push({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.nft.name,
      image: item.nft.image,
      tokenId: item.nft.tokenId,
      editionLabel: item.editionLabel,
      quantity,
      unitPrice: item.unitPrice,
      lineTotal: mul(item.unitPrice, quantity),
      available: item.available,
    })
  }

  const subtotal = add('0', ...lines.map((l) => l.lineTotal))
  let discount = '0'
  let coupon: Quote['coupon'] = null
  if (cart.couponCode) {
    const result = validateCoupon(cart.couponCode)
    if (result.error) {
      issues.push({ type: result.error.code, message: result.error.message })
    } else if (result.coupon) {
      coupon = { code: result.coupon.code, label: result.coupon.label }
      discount =
        result.coupon.kind === 'percent' ? percentOf(subtotal, Number(result.coupon.value)) : min(result.coupon.value, subtotal)
    }
  }
  const networkFee = lines.length ? NETWORK_FEES[network] : '0'
  const total = add(max(sub(subtotal, discount), '0'), networkFee)

  const hash = stableHash({
    network,
    lines: lines.map((l) => [l.itemId, l.editionId, l.quantity, l.unitPrice]),
    subtotal,
    discount,
    networkFee,
    total,
    coupon: coupon?.code ?? null,
  })

  return {
    hash,
    network,
    items: lines,
    subtotal,
    discount,
    networkFee,
    total,
    coupon,
    issues,
    computedAt: new Date().toISOString(),
  }
}

export function hasBlockingIssues(quote: Quote) {
  return quote.issues.some((i) => i.type === 'OUT_OF_STOCK' || i.type === 'QUANTITY_REDUCED')
}

/* ------------------------------------------------------------------ */
/* Carteiras                                                           */
/* ------------------------------------------------------------------ */

export function toWalletSession(record: WalletSessionRecord): WalletSession {
  return {
    id: record.id,
    walletId: record.walletId,
    provider: record.provider,
    network: record.network,
    status: record.status,
    connectedAt: record.connectedAt,
  }
}

/* ------------------------------------------------------------------ */
/* Pedidos                                                             */
/* ------------------------------------------------------------------ */

export function toOrder(record: OrderRecord): Order {
  return structuredClone({
    id: record.id,
    userId: record.userId,
    status: record.status,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    network: record.network,
    wallet: record.wallet,
    items: record.items,
    subtotal: record.subtotal,
    discount: record.discount,
    networkFee: record.networkFee,
    total: record.total,
    coupon: record.coupon,
    txHash: record.txHash,
    failureReason: record.failureReason,
    collector: record.collector,
  })
}

function fakeTxHash(seed: string) {
  let out = ''
  for (let i = 0; i < 8; i++) out += stableHash(`${seed}:${i}`)
  return `0x${out}`
}

export function settleOrder(order: OrderRecord) {
  if (order.status !== 'pending') return
  const now = new Date().toISOString()

  if (order.outcome === 'confirmed') {
    order.status = 'confirmed'
    order.txHash = fakeTxHash(order.id)

    // Remove do carrinho apenas os itens e quantidades comprados.
    const cart = db.state.carts[`user:${order.userId}`]
    if (cart) {
      for (const line of order.items) {
        const item = cart.items.find((i) => i.editionId === line.editionId)
        if (item) item.quantity -= line.quantity
      }
      cart.items = cart.items.filter((i) => i.quantity > 0)
      if (order.coupon && cart.couponCode === order.coupon.code) cart.couponCode = null
      cart.updatedAt = now
    }

    // Baixa de estoque (gera nft.updated).
    for (const line of order.items) {
      const nft = findNft(line.nftId)
      if (!nft) continue
      mutateNft(nft, (n) => {
        const edition = n.editions.find((e) => e.id === line.editionId)
        if (edition) edition.available = Math.max(0, edition.available - line.quantity)
      })
    }
  } else {
    order.status = 'rejected'
    order.failureReason = 'A rede recusou o pagamento: a assinatura não foi autorizada pela carteira.'
  }

  order.version += 1
  order.updatedAt = now
  order.resolveAt = null
  db.save()

  publish(
    {
      eventId: db.nextEventId(),
      type: 'order.updated',
      resource: { type: 'order', id: order.id },
      version: order.version,
      occurredAt: now,
      data: {
        orderId: order.id,
        userId: order.userId,
        status: order.status,
        txHash: order.txHash,
        failureReason: order.failureReason,
      },
    },
    order.userId,
  )
  db.save()
}

export function settleDueOrders() {
  const now = Date.now()
  for (const order of db.state.orders) {
    if (order.status === 'pending' && order.resolveAt !== null && order.resolveAt <= now) settleOrder(order)
  }
}

const scheduled = new Set<string>()

export function scheduleOrder(order: OrderRecord) {
  if (order.status !== 'pending' || order.resolveAt === null || scheduled.has(order.id)) return
  scheduled.add(order.id)
  const wait = Math.max(0, order.resolveAt - Date.now()) + 5
  setTimeout(() => {
    scheduled.delete(order.id)
    const current = db.state.orders.find((o) => o.id === order.id)
    if (current && current.status === 'pending' && current.resolveAt !== null && current.resolveAt <= Date.now()) {
      settleOrder(current)
    }
  }, wait)
}

export function schedulePendingOrders() {
  settleDueOrders()
  for (const order of db.state.orders) scheduleOrder(order)
}

export function assertNumberParam(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ApiFail(422, 'VALIDATION_ERROR', 'Quantidade inválida.', { [field]: 'Informe uma quantidade inteira maior que zero.' })
  }
  return value
}

