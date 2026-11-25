import type { CollectorInfo, Network, OrderLine, OrderStatus, WalletProvider } from '@/api/contracts'
import {
  buildCoupons,
  buildNfts,
  buildOrders,
  buildUsers,
  buildWallets,
  type CouponRecord,
  type NftRecord,
  type UserRecord,
  type WalletRecord,
} from './fixtures'

/**
 * "Banco de dados" da API simulada. Fica em memória e é persistido no
 * localStorage para sobreviver a refresh. `reset()` restaura o seed integral.
 *
 * Só o código em /mocks acessa este módulo — a aplicação conversa com ele
 * exclusivamente via HTTP (Axios → MSW) e WebSocket (socket.io-client → MSW).
 */

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedAt: string
}

export interface CartRecord {
  id: string
  ownerKey: string
  items: CartItemRecord[]
  couponCode: string | null
  updatedAt: string
}

export interface SessionRecord {
  userId: string
  expiresAt: number
}

export interface WalletSessionRecord {
  id: string
  userId: string
  walletId: string
  provider: WalletProvider
  network: Network
  status: 'connected' | 'disconnected'
  connectedAt: string
}

export interface OrderRecord {
  id: string
  userId: string
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  network: Network
  wallet: { label: string; address: string; provider: WalletProvider }
  items: OrderLine[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon: { code: string; label: string } | null
  txHash: string | null
  failureReason: string | null
  collector: CollectorInfo
  /** Timestamp (ms) em que a "rede" decide o pedido. */
  resolveAt: number | null
  outcome: 'confirmed' | 'rejected'
}

export interface DbState {
  schema: 2
  users: UserRecord[]
  sessions: Record<string, SessionRecord>
  nfts: NftRecord[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  wallets: Record<string, { primary: WalletRecord | null; secondary: WalletRecord | null }>
  walletSessions: Record<string, WalletSessionRecord>
  orders: OrderRecord[]
  idempotency: Record<string, { bodyHash: string; orderId: string }>
  coupons: CouponRecord[]
  /** Flags de cenário consumidas (ex.: "mudar preço só na primeira tentativa"). */
  consumed: Record<string, boolean>
  eventSeq: number
  idSeq: number
}

const STORAGE_KEY = 'kurio:mockdb'

function seed(): DbState {
  const nfts = buildNfts()
  return {
    schema: 2,
    users: buildUsers(),
    sessions: {},
    nfts,
    favorites: { usr_ana: ['sage-nomad-009'], usr_bruno: ['golden-beat-207'] },
    carts: {},
    wallets: buildWallets(),
    walletSessions: {},
    orders: buildOrders(nfts),
    idempotency: {},
    coupons: buildCoupons(),
    consumed: {},
    eventSeq: 0,
    idSeq: 1000,
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schema === 2) return parsed
    }
  } catch {
    /* estado corrompido: volta ao seed */
  }
  return seed()
}

let state: DbState = load()

export const db = {
  get state() {
    return state
  },
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignora */
    }
  },
  reset() {
    state = seed()
    this.save()
  },
  nextId(prefix: string) {
    state.idSeq += 1
    return `${prefix}_${state.idSeq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
  },
  nextEventId() {
    state.eventSeq += 1
    return `evt_${String(state.eventSeq).padStart(6, '0')}`
  },
}

export function findNft(id: string) {
  return state.nfts.find((n) => n.id === id) ?? null
}

export function findUser(id: string) {
  return state.users.find((u) => u.id === id) ?? null
}
