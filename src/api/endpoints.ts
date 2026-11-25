import { request } from './client'
import type {
  AddCartItemInput,
  Cart,
  ConnectWalletInput,
  CreateOrderInput,
  FavoritesResponse,
  LoginInput,
  Network,
  NftDetail,
  NftListParams,
  NftListResponse,
  Order,
  PasswordChangeInput,
  ProfileUpdateInput,
  Quote,
  RegisterInput,
  Session,
  User,
  Wallet,
  WalletInput,
  WalletSession,
  WalletSlot,
  WalletsResponse,
} from './contracts'

/** Todas as chamadas REST passam por aqui (Axios). `signal` permite cancelamento. */

type Opts = { signal?: AbortSignal }

export const authApi = {
  register: (input: RegisterInput) => request<Session>({ method: 'POST', url: '/auth/register', data: input }),
  login: (input: LoginInput) => request<Session>({ method: 'POST', url: '/auth/login', data: input }),
  session: ({ signal }: Opts = {}) => request<Session>({ method: 'GET', url: '/auth/session', signal }),
  logout: () => request<void>({ method: 'POST', url: '/auth/logout' }),
}

export const nftApi = {
  list: (params: NftListParams, { signal }: Opts = {}) =>
    request<NftListResponse>({ method: 'GET', url: '/nfts', params, signal }),
  detail: (id: string, { signal }: Opts = {}) =>
    request<NftDetail>({ method: 'GET', url: `/nfts/${encodeURIComponent(id)}`, signal }),
}

export const favoritesApi = {
  list: ({ signal }: Opts = {}) => request<FavoritesResponse>({ method: 'GET', url: '/favorites', signal }),
  add: (nftId: string) => request<FavoritesResponse>({ method: 'PUT', url: `/favorites/${encodeURIComponent(nftId)}` }),
  remove: (nftId: string) => request<FavoritesResponse>({ method: 'DELETE', url: `/favorites/${encodeURIComponent(nftId)}` }),
}

export const cartApi = {
  get: ({ signal }: Opts = {}) => request<Cart>({ method: 'GET', url: '/cart', signal }),
  add: (input: AddCartItemInput) => request<Cart>({ method: 'POST', url: '/cart/items', data: input }),
  update: (itemId: string, quantity: number) =>
    request<Cart>({ method: 'PATCH', url: `/cart/items/${itemId}`, data: { quantity } }),
  remove: (itemId: string) => request<Cart>({ method: 'DELETE', url: `/cart/items/${itemId}` }),
  applyCoupon: (code: string) => request<Cart>({ method: 'PUT', url: '/cart/coupon', data: { code } }),
  removeCoupon: () => request<Cart>({ method: 'DELETE', url: '/cart/coupon' }),
  merge: (guestCartId: string) => request<Cart>({ method: 'POST', url: '/cart/merge', data: { guestCartId } }),
}

export const quoteApi = {
  get: (network: Network, { signal }: Opts = {}) =>
    request<Quote>({ method: 'GET', url: '/quote', params: { network }, signal }),
}

export const orderApi = {
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    request<Order>({
      method: 'POST',
      url: '/orders',
      data: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  get: (id: string, { signal }: Opts = {}) => request<Order>({ method: 'GET', url: `/orders/${id}`, signal }),
  list: (status?: Order['status'], { signal }: Opts = {}) =>
    request<{ items: Order[] }>({ method: 'GET', url: '/orders', params: status ? { status } : undefined, signal }),
}

export const profileApi = {
  get: ({ signal }: Opts = {}) => request<User>({ method: 'GET', url: '/profile', signal }),
  update: (input: ProfileUpdateInput) => request<User>({ method: 'PATCH', url: '/profile', data: input }),
  uploadAvatar: (dataUrl: string) => request<User>({ method: 'PUT', url: '/profile/avatar', data: { dataUrl } }),
  removeAvatar: () => request<User>({ method: 'DELETE', url: '/profile/avatar' }),
  changePassword: (input: PasswordChangeInput) => request<void>({ method: 'PUT', url: '/profile/password', data: input }),
}

export const walletApi = {
  list: ({ signal }: Opts = {}) => request<WalletsResponse>({ method: 'GET', url: '/wallets', signal }),
  save: (slot: WalletSlot, input: WalletInput) => request<Wallet>({ method: 'PUT', url: `/wallets/${slot}`, data: input }),
  connect: (input: ConnectWalletInput) => request<WalletSession>({ method: 'POST', url: '/wallet-sessions', data: input }),
  disconnect: (id: string) => request<void>({ method: 'DELETE', url: `/wallet-sessions/${id}` }),
}
