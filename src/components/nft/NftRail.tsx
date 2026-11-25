import { useRef, useState } from 'react'
import type { NftSummary } from '@/api/contracts'
import { cn } from '@/lib/utils'
import { NftCard, NftCardSkeleton } from './NftCard'

/**
 * Carrossel horizontal ("Mais desta coleção" / "Colecionadores também viram").
 * Rolagem nativa com scroll-snap (teclado, toque e trackpad) + indicadores.
 */
export function NftRail({ title, items, loading }: { title: string; items: NftSummary[] | undefined; loading?: boolean }) {
  const ref = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil((items?.length ?? 0) / 4))
  const headingId = `rail-${title.replace(/\W+/g, '-').toLowerCase()}`

  function goTo(index: number) {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: (el.scrollWidth / pages) * index, behavior: 'smooth' })
    setPage(index)
  }

  return (
    <section aria-labelledby={headingId} className="mt-14">
      <h2 id={headingId} className="mb-4 border-b border-line pb-2 text-sm font-bold text-primary">
        {title}
      </h2>
      <ul
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        onScroll={(e) => {
          const el = e.currentTarget
          const index = Math.round((el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)) * (pages - 1))
          if (index !== page) setPage(index)
        }}
      >
        {loading || !items
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[calc(20%-12.8px)]">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[calc(20%-12.8px)]">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir para o grupo ${i + 1} de ${pages}`}
              aria-current={i === page ? 'true' : undefined}
              className={cn('size-2.5 rounded-full border border-primary', i === page && 'bg-primary')}
            />
          ))}
        </div>
      )}
    </section>
  )
}
