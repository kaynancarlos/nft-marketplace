import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { EmptyState, ErrorState } from '@/components/feedback'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { usePageTitle } from '@/lib/usePageTitle'
import { useFavorites } from '@/queries/favorites'
import { nftDetailQuery } from '@/queries/nfts'

export function FavoritesPage() {
  usePageTitle('Lista de interesse')
  const favorites = useFavorites()
  const ids = favorites.data ? [...favorites.data] : []
  const details = useQueries({ queries: ids.map((id) => nftDetailQuery(id)) })

  return (
    <section aria-labelledby="favorites-title">
      <h1 id="favorites-title" className="text-sm font-bold">
        Lista de interesse
      </h1>
      <div className="mt-4">
        {favorites.isPending ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <NftCardSkeleton />
            <NftCardSkeleton />
            <NftCardSkeleton />
          </div>
        ) : favorites.isError ? (
          <ErrorState message={favorites.error.message} onRetry={() => void favorites.refetch()} />
        ) : ids.length === 0 ? (
          <EmptyState
            title="Nenhum favorito ainda"
            message="Toque no coração de um NFT para salvá-lo aqui."
            action={
              <Link to="/" hash="catalogo" className="text-sm text-primary underline">
                Explorar NFTs
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3" data-testid="favorites-grid">
            {details.map((q, i) => (
              <li key={ids[i]}>{q.data ? <NftCard nft={q.data} /> : <NftCardSkeleton />}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
