import type { Network, WalletProvider, WalletSlot } from '@/api/contracts'
import type { CollectorForm } from '@/api/schemas'
import { readJson, removeKey, uuid, writeJson } from '@/lib/utils'

/**
 * Persistência do checkout em sessionStorage (por aba):
 *  - rascunho do formulário → retomada após expiração de sessão/refresh;
 *  - tentativa de compra (chave de idempotência + hash da cotação aceita +
 *    id do pedido, quando criado) → reenvios e refresh recuperam o MESMO pedido.
 */

const DRAFT_KEY = 'kurio:checkout-draft'
const ATTEMPT_KEY = 'kurio:checkout-attempt'

export interface CheckoutDraft {
  userId: string
  collector: CollectorForm
  network: Network
  walletSlot: WalletSlot
  provider: WalletProvider
}

export function loadDraft(userId: string): CheckoutDraft | null {
  const draft = readJson<CheckoutDraft>(DRAFT_KEY, 'session')
  return draft && draft.userId === userId ? draft : null
}

export function saveDraft(draft: CheckoutDraft) {
  writeJson(DRAFT_KEY, draft, 'session')
}

export function clearDraft() {
  removeKey(DRAFT_KEY, 'session')
}

export interface CheckoutAttempt {
  userId: string
  key: string
  /** Hash do corpo do pedido (cotação aceita + carteira + dados). */
  fingerprint: string
  orderId: string | null
}

export function loadAttempt(userId: string): CheckoutAttempt | null {
  const attempt = readJson<CheckoutAttempt>(ATTEMPT_KEY, 'session')
  return attempt && attempt.userId === userId ? attempt : null
}

/**
 * Reaproveita a chave enquanto o corpo do pedido for o mesmo (retry, timeout,
 * clique repetido, refresh). Corpo diferente = nova intenção = nova chave.
 */
export function attemptFor(userId: string, fingerprint: string): CheckoutAttempt {
  const current = loadAttempt(userId)
  if (current && current.fingerprint === fingerprint && !current.orderId) return current
  const next: CheckoutAttempt = { userId, key: uuid(), fingerprint, orderId: null }
  writeJson(ATTEMPT_KEY, next, 'session')
  return next
}

export function markAttemptOrder(attempt: CheckoutAttempt, orderId: string) {
  writeJson(ATTEMPT_KEY, { ...attempt, orderId }, 'session')
}

export function resetAttempt() {
  removeKey(ATTEMPT_KEY, 'session')
}
