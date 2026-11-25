/**
 * Contratos REST e de eventos compartilhados entre:
 *  - transporte (Axios + handlers MSW),
 *  - estado (TanStack Query),
 *  - interface (componentes).
 *
 * Valores monetários em ETH SEMPRE trafegam como string decimal (DecimalString)
 * e só são manipulados com big.js (ver src/lib/money.ts). Quantidades são inteiras.
 */

export type DecimalString = string
export type ISODateString = string

export type Network = 'ethereum' | 'polygon' | 'solana'
export const NETWORKS: { id: Network; label: string }[] = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
]

export type CategoryId =
  | 'arte-digital'
  | 'fotografia'
  | 'musica'
  | 'arte-3d'
  | 'colecionaveis'
  | 'generativa'
  | 'jogos'
  | 'assinaturas'
  | 'utilidade'

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'arte-digital', label: 'Arte digital' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'musica', label: 'Música' },
  { id: 'arte-3d', label: 'Arte 3D' },
  { id: 'colecionaveis', label: 'Colecionáveis' },
  { id: 'generativa', label: 'Generativa' },
  { id: 'jogos', label: 'Jogos' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'utilidade', label: 'Utilidade' },
]

export type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'name-asc'
export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recent', label: 'Listados recentemente' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name-asc', label: 'Nome (A–Z)' },
]

export type CatalogTab = 'all' | 'new' | 'trending'
export const CATALOG_TABS: { id: CatalogTab; label: string }[] = [
  { id: 'all', label: 'Todos os NFTs' },
  { id: 'new', label: 'Novos lançamentos' },
  { id: 'trending', label: 'Em alta' },
]

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
export const WALLET_PROVIDERS: { id: WalletProvider; label: string; short: string }[] = [
  { id: 'walletconnect', label: 'WalletConnect', short: 'W' },
  { id: 'metamask', label: 'MetaMask', short: 'M' },
  { id: 'coinbase', label: 'Coinbase Wallet', short: 'C' },
]

/* ------------------------------------------------------------------ */
/* Erros                                                               */
/* ------------------------------------------------------------------ */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_INVALID'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'OUT_OF_STOCK'
  | 'QUANTITY_LIMIT'
  | 'EDITION_UNAVAILABLE'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'QUOTE_OUTDATED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_REJECTED'
  | 'WALLET_NOT_CONNECTED'
  | 'WRONG_PASSWORD'
  | 'ADDRESS_IN_USE'
  | 'CART_EMPTY'
  | 'TRANSIENT'
  | 'INTERNAL'

export interface ApiErrorBody {
  error: {
    code: ErrorCode
    message: string
    /** Erros por campo (formulários). Chave = nome do campo. */
    fields?: Record<string, string>
    details?: unknown
  }
}

/* ------------------------------------------------------------------ */
/* Sessão e conta                                                      */
/* ------------------------------------------------------------------ */

export interface User {
  id: string
  displayName: string
  username: string
  email: string
  avatarUrl: string | null
  bio: string
}

export interface Session {
  token: string
  expiresAt: ISODateString
  user: User
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

/* ------------------------------------------------------------------ */
/* NFTs                                                                */
/* ------------------------------------------------------------------ */

export interface Edition {
  id: string
  /** "1/1", "1/10", "1/50" ou "Aberta" */
  label: string
  /** null = edição aberta */
  supply: number | null
  available: number
  price: DecimalString
}

export interface NftSummary {
  id: string
  name: string
  tokenId: string
  image: string
  collection: string
  category: CategoryId
  network: Network
  /** Menor preço entre as edições disponíveis */
  price: DecimalString
  compareAtPrice: DecimalString | null
  rarity: 'raro' | null
  trending: boolean
  listedAt: ISODateString
  soldOut: boolean
  version: number
}

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: ISODateString
}

export interface NftDetail extends NftSummary {
  description: string
  longDescription: string[]
  attributes: string[]
  editions: Edition[]
  gallery: string[]
  rating: { average: number; count: number }
  reviews: Review[]
  contract: string
  royalties: string
  maxPerOrder: number
  related: NftSummary[]
}

export interface Facet<T extends string = string> {
  id: T
  label: string
  count: number
}

export interface NftListParams {
  q?: string
  category?: CategoryId
  network?: Network
  minPrice?: DecimalString
  maxPrice?: DecimalString
  sort?: SortOption
  tab?: CatalogTab
  page?: number
  pageSize?: number
}

export interface NftListResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: {
    categories: Facet<CategoryId>[]
    networks: Facet<Network>[]
    priceRange: { min: DecimalString; max: DecimalString }
  }
}

/* ------------------------------------------------------------------ */
/* Favoritos                                                           */
/* ------------------------------------------------------------------ */

export interface FavoritesResponse {
  nftIds: string[]
}

/* ------------------------------------------------------------------ */
/* Carrinho e cotação                                                  */
/* ------------------------------------------------------------------ */

export interface CartItem {
  id: string
  nftId: string
  editionId: string
  editionLabel: string
  quantity: number
  unitPrice: DecimalString
  lineTotal: DecimalString
  available: number
  maxQuantity: number
  nft: { name: string; image: string; tokenId: string }
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode: string | null
  itemCount: number
  updatedAt: ISODateString
}

export interface AddCartItemInput {
  nftId: string
  editionId: string
  quantity: number
}

export type QuoteIssueType = 'OUT_OF_STOCK' | 'QUANTITY_REDUCED' | 'COUPON_INVALID' | 'COUPON_EXPIRED'

export interface QuoteIssue {
  type: QuoteIssueType
  itemId?: string
  message: string
}

export interface QuoteLine {
  itemId: string
  nftId: string
  editionId: string
  name: string
  image: string
  tokenId: string
  editionLabel: string
  quantity: number
  unitPrice: DecimalString
  lineTotal: DecimalString
  available: number
}

export interface Quote {
  /** Hash determinístico das linhas e totais. Muda quando qualquer valor muda. */
  hash: string
  network: Network
  items: QuoteLine[]
  subtotal: DecimalString
  discount: DecimalString
  networkFee: DecimalString
  total: DecimalString
  coupon: { code: string; label: string } | null
  issues: QuoteIssue[]
  computedAt: ISODateString
}

/* ------------------------------------------------------------------ */
/* Carteiras                                                           */
/* ------------------------------------------------------------------ */

export type WalletSlot = 'primary' | 'secondary'

export interface Wallet {
  id: string
  slot: WalletSlot
  label: string
  address: string
  network: Network
  type: WalletProvider
  ens: string | null
  updatedAt: ISODateString
}

export interface WalletsResponse {
  primary: Wallet | null
  secondary: Wallet | null
}

export interface WalletInput {
  label: string
  address: string
  network: Network
  type: WalletProvider
  ens?: string | null
}

export interface WalletSession {
  id: string
  walletId: string
  provider: WalletProvider
  network: Network
  status: 'connected' | 'disconnected'
  connectedAt: ISODateString
}

export interface ConnectWalletInput {
  walletId: string
  provider: WalletProvider
  network: Network
}

/* ------------------------------------------------------------------ */
/* Pedidos                                                             */
/* ------------------------------------------------------------------ */

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface OrderLine {
  nftId: string
  editionId: string
  name: string
  image: string
  tokenId: string
  editionLabel: string
  quantity: number
  unitPrice: DecimalString
  lineTotal: DecimalString
}

export interface CollectorInfo {
  displayName: string
  username: string
  email: string
  referralCode?: string
  note?: string
}

export interface CreateOrderInput {
  quoteHash: string
  network: Network
  walletId: string
  walletSessionId: string
  collector: CollectorInfo
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  version: number
  createdAt: ISODateString
  updatedAt: ISODateString
  network: Network
  wallet: { label: string; address: string; provider: WalletProvider }
  items: OrderLine[]
  subtotal: DecimalString
  discount: DecimalString
  networkFee: DecimalString
  total: DecimalString
  coupon: { code: string; label: string } | null
  txHash: string | null
  failureReason: string | null
  collector: CollectorInfo
}

/** 409 QUOTE_OUTDATED / OUT_OF_STOCK em POST /orders trazem a cotação atual. */
export interface QuoteOutdatedDetails {
  quote: Quote
}

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

export interface ProfileUpdateInput {
  displayName: string
  username: string
  email: string
  bio: string
}

export interface AvatarInput {
  dataUrl: string
}

export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
}

/* ------------------------------------------------------------------ */
/* Eventos em tempo real (Socket.IO)                                   */
/* ------------------------------------------------------------------ */

export interface RealtimeEvent<TType extends string, TData> {
  /** Identidade estável: o mesmo evento reenviado mantém o mesmo id. */
  eventId: string
  type: TType
  resource: { type: 'nft' | 'order'; id: string }
  /** Versão do recurso após a mudança. Monotônica por recurso. */
  version: number
  occurredAt: ISODateString
  data: TData
}

export interface NftUpdatedData {
  nftId: string
  name: string
  price: DecimalString
  previousPrice: DecimalString
  soldOut: boolean
  editions: { id: string; label: string; price: DecimalString; available: number }[]
}

export interface OrderUpdatedData {
  orderId: string
  userId: string
  status: OrderStatus
  txHash: string | null
  failureReason: string | null
}

export type NftUpdatedEvent = RealtimeEvent<'nft.updated', NftUpdatedData>
export type OrderUpdatedEvent = RealtimeEvent<'order.updated', OrderUpdatedData>
export type ServerEvent = NftUpdatedEvent | OrderUpdatedEvent

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const
