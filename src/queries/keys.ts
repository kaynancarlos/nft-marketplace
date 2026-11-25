import type { Network, NftListParams } from '@/api/contracts'

/**
 * Chaves do TanStack Query.
 *  - Públicas: ['nfts', ...]
 *  - Carrinho: ['cart', owner, ...]   owner = "user:<id>" | "guest:<id>"
 *  - Privadas: ['private', userId, ...] — isoladas por usuário; removidas no
 *    logout/expiração/troca de conta.
 * Os parâmetros da consulta fazem parte da chave (isolamento por parâmetro).
 */
export const qk = {
  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  cart: {
    all: ['cart'] as const,
    root: (owner: string) => ['cart', owner] as const,
    data: (owner: string) => ['cart', owner, 'data'] as const,
    quote: (owner: string, network: Network) => ['cart', owner, 'quote', network] as const,
  },
  private: {
    all: ['private'] as const,
    user: (userId: string) => ['private', userId] as const,
    session: (userId: string) => ['private', userId, 'session'] as const,
    favorites: (userId: string) => ['private', userId, 'favorites'] as const,
    profile: (userId: string) => ['private', userId, 'profile'] as const,
    wallets: (userId: string) => ['private', userId, 'wallets'] as const,
    order: (userId: string, orderId: string) => ['private', userId, 'order', orderId] as const,
    orders: (userId: string) => ['private', userId, 'orders'] as const,
  },
}
