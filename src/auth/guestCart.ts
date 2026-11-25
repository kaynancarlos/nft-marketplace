import { safeStorage, uuid } from '@/lib/utils'

/**
 * O carrinho do visitante vive na API (identificado por X-Cart-Id).
 * Guardamos apenas o identificador para sobreviver a refresh e, no login,
 * pedimos à API para incorporar esses itens ao carrinho do usuário.
 */
const KEY = 'kurio:guest-cart'

export function getGuestCartId(): string {
  const storage = safeStorage('local')
  let id = storage?.getItem(KEY) ?? null
  if (!id) {
    id = uuid()
    storage?.setItem(KEY, id)
  }
  return id
}

export function peekGuestCartId(): string | null {
  return safeStorage('local')?.getItem(KEY) ?? null
}

export function rotateGuestCartId() {
  safeStorage('local')?.setItem(KEY, uuid())
}
