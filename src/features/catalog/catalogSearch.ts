import {
  CATALOG_TABS,
  CATEGORIES,
  NETWORKS,
  SORT_OPTIONS,
  type CatalogTab,
  type CategoryId,
  type Network,
  type NftListParams,
  type SortOption,
} from '@/api/contracts'
import { isDecimal } from '@/lib/money'

/**
 * Estado do catálogo na URL (sobrevive a refresh, compartilhamento e
 * navegação pelo histórico). Valores inválidos são descartados.
 */
export interface CatalogSearch {
  q?: string
  category?: CategoryId
  network?: Network
  minPrice?: string
  maxPrice?: string
  sort?: SortOption
  tab?: CatalogTab
  page?: number
}

function pick<T extends string>(value: unknown, allowed: { id: T }[]): T | undefined {
  return typeof value === 'string' && allowed.some((a) => a.id === value) ? (value as T) : undefined
}

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const q = typeof search.q === 'string' ? search.q.trim().slice(0, 60) : undefined
  const page = Number(search.page)
  const minPrice = typeof search.minPrice === 'string' || typeof search.minPrice === 'number' ? String(search.minPrice) : undefined
  const maxPrice = typeof search.maxPrice === 'string' || typeof search.maxPrice === 'number' ? String(search.maxPrice) : undefined
  const sort = pick(search.sort, SORT_OPTIONS)
  const tab = pick(search.tab, CATALOG_TABS)
  return {
    q: q || undefined,
    category: pick(search.category, CATEGORIES),
    network: pick(search.network, NETWORKS),
    minPrice: minPrice && isDecimal(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice && isDecimal(maxPrice) ? maxPrice : undefined,
    sort: sort && sort !== 'recent' ? sort : undefined,
    tab: tab && tab !== 'all' ? tab : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export function toListParams(search: CatalogSearch, pageSize: number): NftListParams {
  return {
    q: search.q,
    category: search.category,
    network: search.network,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort ?? 'recent',
    tab: search.tab ?? 'all',
    page: search.page ?? 1,
    pageSize,
  }
}
