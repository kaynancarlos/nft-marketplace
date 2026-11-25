import { Skeleton } from '@/components/ui/misc'

/** Fallback enquanto o código da rota (lazy) é carregado. */
export function PageFallback() {
  return (
    <div className="py-10" aria-busy="true" aria-label="Carregando página">
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
      </div>
    </div>
  )
}
