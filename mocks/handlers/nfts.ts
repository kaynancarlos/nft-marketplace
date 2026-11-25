import { HttpResponse } from 'msw'
import {
  CATEGORIES,
  NETWORKS,
  type CatalogTab,
  type CategoryId,
  type Network,
  type NftListResponse,
  type SortOption,
} from '@/api/contracts'
import { compare, isDecimal } from '@/lib/money'
import { db, findNft } from '../db'
import { displayPrice, toDetail, toSummary } from '../domain'
import { NEW_RELEASES_SINCE, type NftRecord } from '../fixtures'
import { ApiFail, route } from '../http'
import { activeScenario } from '../scenarios'

const SORTS: SortOption[] = ['recent', 'price-asc', 'price-desc', 'name-asc']
const TABS: CatalogTab[] = ['all', 'new', 'trending']

interface Filters {
  q: string
  category: CategoryId | null
  network: Network | null
  minPrice: string | null
  maxPrice: string | null
  tab: CatalogTab
}

function matches(nft: NftRecord, f: Filters, skip?: 'category' | 'network') {
  if (f.q) {
    const haystack = `${nft.name} ${nft.collection} ${nft.attributes.join(' ')}`.toLowerCase()
    if (!haystack.includes(f.q)) return false
  }
  if (skip !== 'category' && f.category && nft.category !== f.category) return false
  if (skip !== 'network' && f.network && nft.network !== f.network) return false
  const price = displayPrice(nft)
  if (f.minPrice && compare(price, f.minPrice) < 0) return false
  if (f.maxPrice && compare(price, f.maxPrice) > 0) return false
  if (f.tab === 'new' && nft.listedAt < NEW_RELEASES_SINCE) return false
  if (f.tab === 'trending' && !nft.trending) return false
  return true
}

export const nftHandlers = [
  route('get', '/nfts', ({ url }) => {
    const p = url.searchParams
    const category = p.get('category') as CategoryId | null
    const network = p.get('network') as Network | null
    const minPrice = p.get('minPrice')
    const maxPrice = p.get('maxPrice')
    const sort = (SORTS.includes(p.get('sort') as SortOption) ? p.get('sort') : 'recent') as SortOption
    const tab = (TABS.includes(p.get('tab') as CatalogTab) ? p.get('tab') : 'all') as CatalogTab
    const page = Math.max(1, Number.parseInt(p.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(48, Math.max(1, Number.parseInt(p.get('pageSize') ?? '9', 10) || 9))

    const filters: Filters = {
      q: (p.get('q') ?? '').trim().toLowerCase(),
      category: CATEGORIES.some((c) => c.id === category) ? category : null,
      network: NETWORKS.some((n) => n.id === network) ? network : null,
      minPrice: minPrice && isDecimal(minPrice) ? minPrice : null,
      maxPrice: maxPrice && isDecimal(maxPrice) ? maxPrice : null,
      tab,
    }

    const all = activeScenario().emptyCatalog ? [] : db.state.nfts
    const result = all.filter((n) => matches(n, filters))

    result.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return compare(displayPrice(a), displayPrice(b)) || a.name.localeCompare(b.name)
        case 'price-desc':
          return compare(displayPrice(b), displayPrice(a)) || a.name.localeCompare(b.name)
        case 'name-asc':
          return a.name.localeCompare(b.name, 'pt-BR')
        default:
          return b.listedAt.localeCompare(a.listedAt)
      }
    })

    const total = result.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize

    const prices = db.state.nfts.map(displayPrice)
    const minAll = prices.reduce((a, b) => (compare(a, b) <= 0 ? a : b), prices[0] ?? '0')
    const maxAll = prices.reduce((a, b) => (compare(a, b) >= 0 ? a : b), prices[0] ?? '0')

    const body: NftListResponse = {
      items: result.slice(start, start + pageSize).map(toSummary),
      page,
      pageSize,
      total,
      totalPages,
      facets: {
        categories: CATEGORIES.map((c) => ({
          id: c.id,
          label: c.label,
          count: all.filter((n) => n.category === c.id && matches(n, filters, 'category')).length,
        })),
        networks: NETWORKS.map((n) => ({
          id: n.id,
          label: n.label,
          count: all.filter((x) => x.network === n.id && matches(x, filters, 'network')).length,
        })),
        priceRange: { min: minAll, max: maxAll },
      },
    }
    return HttpResponse.json(body)
  }),

  route('get', '/nfts/:id', ({ params }) => {
    const nft = findNft(params.id)
    if (!nft) throw new ApiFail(404, 'NOT_FOUND', 'Este NFT não existe ou foi removido do mercado.')
    return HttpResponse.json(toDetail(nft))
  }),

  // Exposto para referência/depuração: o mesmo resumo que o catálogo usa.
  route('get', '/nfts/:id/summary', ({ params }) => {
    const nft = findNft(params.id)
    if (!nft) throw new ApiFail(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(toSummary(nft))
  }),
]
