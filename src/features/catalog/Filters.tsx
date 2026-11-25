import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { CategoryId, Network, NftListResponse } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { formatEthBr } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './catalogSearch'

interface Props {
  search: CatalogSearch
  facets: NftListResponse['facets'] | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  idPrefix: string
}

function FacetButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-2 lg:py-2 lg:text-[15px]',
        active ? 'font-semibold text-primary' : 'text-foreground/90',
      )}
    >
      <span className="flex items-center gap-2">
        {active && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
        {label}
      </span>
      <span className={cn('text-xs tabular-nums lg:text-sm', active ? 'text-primary' : 'text-subtle')}>({count})</span>
    </button>
  )
}

/** Filtros combináveis. Qualquer mudança reinicia a paginação (page = 1). */
export function Filters({ search, facets, onChange, idPrefix }: Props) {
  const minBound = Number(facets?.priceRange.min ?? '0.02')
  const maxBound = Number(facets?.priceRange.max ?? '12.30')
  const [min, setMin] = useState(Number(search.minPrice ?? minBound))
  const [max, setMax] = useState(Number(search.maxPrice ?? maxBound))

  useEffect(() => {
    setMin(Number(search.minPrice ?? minBound))
    setMax(Number(search.maxPrice ?? maxBound))
  }, [search.minPrice, search.maxPrice, minBound, maxBound])

  const hasFilters = Boolean(search.category || search.network || search.minPrice || search.maxPrice || search.q)

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${idPrefix}-collections`}>
        <h2 id={`${idPrefix}-collections`} className="mb-3 text-[15px] font-bold">
          Coleções
        </h2>
        {facets ? (
          <ul className="space-y-0.5">
            {facets.categories.map((c) => (
              <li key={c.id}>
                <FacetButton
                  active={search.category === c.id}
                  label={c.label}
                  count={c.count}
                  onClick={() => onChange({ category: search.category === c.id ? undefined : (c.id as CategoryId) })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <FacetSkeleton rows={9} />
        )}
      </section>

      <section aria-labelledby={`${idPrefix}-price`}>
        <h2 id={`${idPrefix}-price`} className="mb-3 text-[15px] font-bold">
          Faixa de preço
        </h2>
        <div className="space-y-2">
          <div className="relative h-5">
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-primary/70" />
            <label htmlFor={`${idPrefix}-min`} className="sr-only">
              Preço mínimo em ETH
            </label>
            <input
              id={`${idPrefix}-min`}
              type="range"
              min={minBound}
              max={maxBound}
              step={0.01}
              value={min}
              onChange={(e) => setMin(Math.min(Number(e.target.value), max))}
              className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent accent-primary [&::-webkit-slider-thumb]:pointer-events-auto"
            />
            <label htmlFor={`${idPrefix}-max`} className="sr-only">
              Preço máximo em ETH
            </label>
            <input
              id={`${idPrefix}-max`}
              type="range"
              min={minBound}
              max={maxBound}
              step={0.01}
              value={max}
              onChange={(e) => setMax(Math.max(Number(e.target.value), min))}
              className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent accent-primary [&::-webkit-slider-thumb]:pointer-events-auto"
            />
          </div>
          <p className="text-xs text-foreground/90" aria-live="polite">
            Preço: {formatEthBr(min.toFixed(2))} - {formatEthBr(max.toFixed(2))} ETH
          </p>
          <Button
            size="sm"
            className="h-7"
            onClick={() =>
              onChange({
                minPrice: min > minBound ? min.toFixed(2) : undefined,
                maxPrice: max < maxBound ? max.toFixed(2) : undefined,
              })
            }
          >
            Aplicar
          </Button>
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-network`}>
        <h2 id={`${idPrefix}-network`} className="mb-3 text-[15px] font-bold">
          Rede
        </h2>
        {facets ? (
          <ul className="space-y-0.5">
            {facets.networks.map((n) => (
              <li key={n.id}>
                <FacetButton
                  active={search.network === n.id}
                  label={n.label}
                  count={n.count}
                  onClick={() => onChange({ network: search.network === n.id ? undefined : (n.id as Network) })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <FacetSkeleton rows={3} />
        )}
      </section>

      {hasFilters && (
        <Link to="/" search={{ sort: search.sort, tab: search.tab }} hash="catalogo" className="inline-block text-xs text-primary underline underline-offset-4">
          Limpar filtros
        </Link>
      )}
    </div>
  )
}

function FacetSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}
