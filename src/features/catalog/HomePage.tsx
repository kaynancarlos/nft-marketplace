import { useEffect, useRef, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { CATALOG_TABS, SORT_OPTIONS, type SortOption } from '@/api/contracts'
import { EmptyState, ErrorState } from '@/components/feedback'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/lib/usePageTitle'
import { PAGE_SIZE, useNftList } from '@/queries/nfts'
import { toListParams, type CatalogSearch } from './catalogSearch'
import { Filters } from './Filters'
import { Hero } from './Hero'
import { Journal, PromoBanners } from './Editorial'

const route = getRouteApi('/')

export function HomePage() {
  usePageTitle('Marketplace de NFTs')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const params = toListParams(search, PAGE_SIZE)
  const query = useNftList(params)
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = query

  /** Atualiza a URL; qualquer filtro reinicia a paginação. */
  function update(patch: Partial<CatalogSearch>, { resetPage = true } = {}) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, ...(resetPage ? { page: undefined } : {}) }),
      resetScroll: false,
    })
  }

  function goToPage(page: number) {
    void navigate({ search: (prev) => ({ ...prev, page: page > 1 ? page : undefined }), resetScroll: false })
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeTab = search.tab ?? 'all'
  const hasFilters = Object.entries(search).some(
    ([key, value]) => key !== 'page' && key !== 'sort' && value !== undefined && !(Array.isArray(value) && value.length === 0),
  )
  const updating = isFetching && isPlaceholderData

  return (
    <>
      <MobileSearchBar search={search} onSearch={(q) => update({ q })} facets={data?.facets} onChange={update} />
      <Hero />

      <section id="catalogo" tabIndex={-1} aria-labelledby="catalog-title" className="mt-10 scroll-mt-4 outline-none md:mt-16 lg:mt-24">
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>
        <div className="grid gap-8 md:grid-cols-[224px_1fr] lg:grid-cols-[309px_1fr] lg:gap-12">
          <aside className="hidden md:block" aria-label="Filtros do catálogo">
            <div className="rounded-md bg-surface p-4 lg:p-5">
              <SearchField id="desktop-search" value={search.q} onSearch={(q) => update({ q })} />
              <div className="mt-5">
                <Filters idPrefix="desktop" search={search} facets={data?.facets} onChange={update} />
              </div>
            </div>
            <FeaturedCard />
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Abas do catálogo" className="no-scrollbar flex min-w-0 max-w-full gap-5 overflow-x-auto">
                {CATALOG_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    onClick={() => update({ tab: tab.id === 'all' ? undefined : tab.id })}
                    className={cn(
                      'shrink-0 whitespace-nowrap border-b-2 pb-1.5 text-xs font-semibold transition-colors md:text-[13px] lg:text-[15px]',
                      activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-foreground hover:text-primary',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs md:text-[13px] lg:text-[15px]">
                <label htmlFor="catalog-sort" className="whitespace-nowrap">
                  Ordenar por:
                </label>
                <NativeSelect
                  id="catalog-sort"
                  value={search.sort ?? 'recent'}
                  onChange={(e) => update({ sort: e.target.value === 'recent' ? undefined : (e.target.value as SortOption) })}
                  className="h-8 w-auto border-transparent bg-transparent px-1 text-xs md:text-[13px] lg:text-[15px]"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id} className="bg-surface">
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <ActiveFilters search={search} onChange={update} />

            <p className="sr-only" role="status" aria-live="polite">
              {isPending ? 'Carregando NFTs' : data ? `${data.total} NFTs encontrados. Página ${data.page} de ${data.totalPages}.` : ''}
            </p>

            <div className="relative mt-6" aria-busy={isFetching}>
              {updating && (
                <div className="absolute -top-5 right-0 text-[11px] text-subtle" aria-hidden>
                  Atualizando resultados…
                </div>
              )}

              {isPending ? (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3 md:gap-x-7 md:gap-y-12" aria-label="Carregando NFTs">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <li key={i}>
                      <NftCardSkeleton />
                    </li>
                  ))}
                </ul>
              ) : isError ? (
                <ErrorState
                  title="Não foi possível carregar o catálogo"
                  message={error.message}
                  onRetry={() => void refetch()}
                  retrying={isFetching}
                />
              ) : data.items.length === 0 ? (
                <EmptyState
                  title="Nenhum NFT encontrado"
                  message={
                    hasFilters
                      ? 'Tente outros termos de busca ou remova alguns filtros.'
                      : 'Ainda não há NFTs listados no mercado. Volte em breve.'
                  }
                  action={
                    hasFilters ? (
                      <Link to="/" hash="catalogo" className="text-sm text-primary underline underline-offset-4">
                        Limpar busca e filtros
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul
                  className={cn(
                    // Mobile (Figma): segunda coluna levemente deslocada para baixo.
                    'grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity max-md:[&>li:nth-child(even)]:mt-6 md:grid-cols-2 lg:grid-cols-3 md:gap-x-7 md:gap-y-12 lg:gap-x-8',
                    updating && 'opacity-60',
                  )}
                  data-testid="catalog-grid"
                >
                  {data.items.map((nft, i) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} priority={i < 3} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {data && data.totalPages > 1 && !isError && (
              <Pagination page={data.page} totalPages={data.totalPages} onPage={goToPage} />
            )}
          </div>
        </div>
      </section>

      <PromoBanners />
      <Journal />
    </>
  )
}

function SearchField({ id, value, onSearch, className }: { id: string; value?: string; onSearch: (q: string | undefined) => void; className?: string }) {
  const [text, setText] = useState(value ?? '')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useEffect(() => setText(value ?? ''), [value])

  // Debounce: só atualiza a URL (e consulta a API) 300 ms após parar de digitar.
  useEffect(() => {
    const normalized = text.trim()
    if (normalized === (value ?? '')) return
    const timer = window.setTimeout(() => onSearchRef.current(normalized || undefined), 300)
    return () => window.clearTimeout(timer)
  }, [text, value])

  return (
    <div role="search" className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs por nome, coleção ou atributo
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explorar coleções"
        className="h-10 w-full rounded-md border border-line bg-surface-2 pl-9 pr-3 text-sm placeholder:text-subtle"
      />
    </div>
  )
}

function MobileSearchBar({
  search,
  onSearch,
  facets,
  onChange,
}: {
  search: CatalogSearch
  onSearch: (q: string | undefined) => void
  facets: Parameters<typeof Filters>[0]['facets']
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  const [open, setOpen] = useState(false)
  const activeCount = [search.category, search.network, search.minPrice || search.maxPrice].filter(Boolean).length
  return (
    <div className="mt-4 flex gap-3 md:hidden">
      <SearchField id="mobile-search" value={search.q} onSearch={onSearch} className="flex-1" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          className="relative grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"
          aria-label={`Abrir filtros${activeCount ? ` (${activeCount} ativos)` : ''}`}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background" aria-hidden>
              {activeCount}
            </span>
          )}
        </DialogTrigger>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <DialogTitle className="text-base">Filtros</DialogTitle>
          <Filters
            idPrefix="mobile"
            search={search}
            facets={facets}
            onChange={(patch) => {
              onChange(patch)
              setOpen(false)
            }}
          />
        </SheetContent>
      </Dialog>
    </div>
  )
}

function ActiveFilters({ search, onChange }: { search: CatalogSearch; onChange: (patch: Partial<CatalogSearch>) => void }) {
  const chips: { label: string; clear: Partial<CatalogSearch> }[] = []
  if (search.q) chips.push({ label: `Busca: “${search.q}”`, clear: { q: undefined } })
  if (search.minPrice || search.maxPrice)
    chips.push({ label: `Preço: ${search.minPrice ?? 'mín.'} – ${search.maxPrice ?? 'máx.'} ETH`, clear: { minPrice: undefined, maxPrice: undefined } })
  if (!chips.length) return null
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Filtros ativos">
      {chips.map((chip) => (
        <li key={chip.label}>
          <button
            type="button"
            onClick={() => onChange(chip.clear)}
            className="rounded-full border border-line px-3 py-1 text-xs hover:border-primary"
            aria-label={`Remover filtro ${chip.label}`}
          >
            {chip.label} <span aria-hidden>×</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )
  const btn = 'grid size-7 place-items-center rounded border border-line text-xs transition-colors hover:border-primary disabled:opacity-40'
  return (
    <nav aria-label="Paginação do catálogo" className="mt-10 flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
        </li>
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - pages[i - 1] > 1 && <span aria-hidden className="text-subtle">…</span>}
            <button
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
              className={cn(btn, p === page && 'border-primary bg-primary font-bold text-primary-foreground')}
            >
              {p}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Próxima página">
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </li>
      </ul>
    </nav>
  )
}

function FeaturedCard() {
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: 'sage-nomad-009' }}
      className="mt-6 block overflow-hidden rounded-md bg-gradient-to-b from-[#2b1d12] to-surface pt-5 text-center"
      aria-label="NFT em destaque: Sage Nomad #009, oferta limitada"
    >
      <p className="text-lg font-bold uppercase text-primary">NFT em destaque</p>
      <p className="mb-3 text-[15px] font-bold uppercase">Oferta limitada</p>
      <img src="/images/sage-nomad.webp" alt="" width={400} height={400} loading="lazy" className="aspect-[224/264] w-full rounded-[14px] object-cover" />
    </Link>
  )
}
