import { HttpResponse } from 'msw'
import type { AddCartItemInput, Network } from '@/api/contracts'
import { db } from '../db'
import {
  assertNumberParam,
  cartOwnerKey,
  computeQuote,
  findEdition,
  getCart,
  maxQuantityFor,
  toCart,
  validateCoupon,
} from '../domain'
import { ApiFail, optionalUser, readJson, requireUser, route } from '../http'

function ownerOrFail(request: Request) {
  const user = optionalUser(request)
  const key = cartOwnerKey(request, user)
  if (!key) throw new ApiFail(400, 'VALIDATION_ERROR', 'Carrinho não identificado.')
  return key
}

function touch(cartId: string) {
  const cart = Object.values(db.state.carts).find((c) => c.id === cartId)
  if (cart) cart.updatedAt = new Date().toISOString()
  db.save()
}

function quantityLimitError(max: number) {
  return new ApiFail(
    409,
    'QUANTITY_LIMIT',
    max === 0 ? 'Esta edição está esgotada.' : `Limite atingido: você pode ter no máximo ${max} unidade(s) desta edição.`,
    { quantity: max === 0 ? 'Edição esgotada.' : `Máximo de ${max}.` },
    { max },
  )
}

export const cartHandlers = [
  route('get', '/cart', ({ request }) => {
    const user = optionalUser(request)
    return HttpResponse.json(toCart(getCart(cartOwnerKey(request, user))))
  }),

  route('post', '/cart/items', async ({ request }) => {
    const key = ownerOrFail(request)
    const body = await readJson<AddCartItemInput>(request)
    const quantity = assertNumberParam(body.quantity, 'quantity')
    const { edition } = findEdition(body.nftId, body.editionId)
    if (edition.available === 0) {
      throw new ApiFail(409, 'EDITION_UNAVAILABLE', `A edição ${edition.label} está esgotada.`)
    }
    const cart = getCart(key, true)!
    const existing = cart.items.find((i) => i.editionId === edition.id)
    const next = (existing?.quantity ?? 0) + quantity
    const max = maxQuantityFor(edition.available)
    if (next > max) throw quantityLimitError(max)
    if (existing) existing.quantity = next
    else
      cart.items.push({
        id: db.nextId('item'),
        nftId: body.nftId,
        editionId: edition.id,
        quantity,
        addedAt: new Date().toISOString(),
      })
    touch(cart.id)
    return HttpResponse.json(toCart(cart), { status: 201 })
  }),

  route('patch', '/cart/items/:itemId', async ({ request, params }) => {
    const key = ownerOrFail(request)
    const body = await readJson<{ quantity: number }>(request)
    const quantity = assertNumberParam(body.quantity, 'quantity')
    const cart = getCart(key)
    const item = cart?.items.find((i) => i.id === params.itemId)
    if (!cart || !item) throw new ApiFail(404, 'NOT_FOUND', 'Item não está mais no carrinho.')
    const { edition } = findEdition(item.nftId, item.editionId)
    const max = maxQuantityFor(edition.available)
    if (quantity > max) throw quantityLimitError(max)
    item.quantity = quantity
    touch(cart.id)
    return HttpResponse.json(toCart(cart))
  }),

  route('delete', '/cart/items/:itemId', ({ request, params }) => {
    const key = ownerOrFail(request)
    const cart = getCart(key)
    if (!cart || !cart.items.some((i) => i.id === params.itemId)) {
      throw new ApiFail(404, 'NOT_FOUND', 'Item não está mais no carrinho.')
    }
    cart.items = cart.items.filter((i) => i.id !== params.itemId)
    touch(cart.id)
    return HttpResponse.json(toCart(cart))
  }),

  route('put', '/cart/coupon', async ({ request }) => {
    const key = ownerOrFail(request)
    const { code } = await readJson<{ code: string }>(request)
    if (!code || !code.trim()) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Informe um cupom.', { code: 'Informe um código promocional.' })
    }
    const result = validateCoupon(code)
    if (result.error) throw new ApiFail(422, result.error.code, result.error.message, { code: result.error.message })
    const cart = getCart(key, true)!
    cart.couponCode = result.coupon!.code
    touch(cart.id)
    return HttpResponse.json(toCart(cart))
  }),

  route('delete', '/cart/coupon', ({ request }) => {
    const key = ownerOrFail(request)
    const cart = getCart(key)
    if (cart) {
      cart.couponCode = null
      touch(cart.id)
    }
    return HttpResponse.json(toCart(cart))
  }),

  /** Ao autenticar, os itens do visitante são incorporados ao carrinho do usuário. */
  route('post', '/cart/merge', async ({ request }) => {
    const { user } = requireUser(request)
    const { guestCartId } = await readJson<{ guestCartId: string }>(request)
    const guest = db.state.carts[`guest:${guestCartId}`]
    const target = getCart(`user:${user.id}`, true)!
    if (guest) {
      for (const item of guest.items) {
        const { edition } = findEdition(item.nftId, item.editionId)
        const max = maxQuantityFor(edition.available)
        const existing = target.items.find((i) => i.editionId === item.editionId)
        if (existing) existing.quantity = Math.min(max, existing.quantity + item.quantity)
        else if (max > 0) target.items.push({ ...item, quantity: Math.min(max, item.quantity) })
      }
      target.items = target.items.filter((i) => i.quantity > 0)
      if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
      delete db.state.carts[`guest:${guestCartId}`]
    }
    touch(target.id)
    return HttpResponse.json(toCart(target))
  }),

  route('get', '/quote', ({ request, url }) => {
    const user = optionalUser(request)
    const network = (url.searchParams.get('network') ?? 'ethereum') as Network
    if (!['ethereum', 'polygon', 'solana'].includes(network)) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Rede inválida.', { network: 'Selecione uma rede válida.' })
    }
    return HttpResponse.json(computeQuote(getCart(cartOwnerKey(request, user)), network))
  }),
]
