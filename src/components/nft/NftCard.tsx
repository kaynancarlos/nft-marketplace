import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts'
import { Badge, Skeleton } from '@/components/ui/misc'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { FavoriteButton } from './FavoriteButton'

interface Props {
  nft: NftSummary
  priority?: boolean
  className?: string
}

export function NftCard({ nft, priority, className }: Props) {
  return (
    <article className={cn('group relative', className)} data-testid="nft-card" data-nft-id={nft.id}>
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="block rounded-[var(--radius-card)] focus-visible:outline-2"
        aria-label={`${nft.name}, ${formatEth(nft.price)} ETH${nft.soldOut ? ', esgotado' : ''}`}
      >
        <div className="rounded-md bg-surface p-1">
          <img
            src={nft.image}
            alt={`Arte do NFT ${nft.name}`}
            width={400}
            height={400}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            className={cn(
              'aspect-square w-full rounded-[14px] object-cover transition-transform duration-300 group-hover:scale-[1.02]',
              nft.soldOut && 'opacity-60 grayscale-[40%]',
            )}
          />
        </div>
        <div className="mt-2 space-y-0.5 px-0.5">
          <h3 className="truncate text-sm text-foreground lg:text-base">{nft.name}</h3>
          <p className="text-sm font-bold text-price lg:text-base" data-testid="nft-card-price">
            {formatEth(nft.price)} ETH
            {nft.compareAtPrice && (
              <span className="ml-2 font-normal text-subtle line-through">
                <span className="sr-only">preço anterior </span>
                {formatEth(nft.compareAtPrice)} ETH
              </span>
            )}
          </p>
        </div>
      </Link>
      <div className="pointer-events-none absolute left-1 top-1 flex gap-1 p-1">
        {nft.rarity && <Badge className="bg-primary text-primary-foreground">Raro</Badge>}
        {nft.soldOut && <Badge className="bg-background/90 text-foreground">Esgotado</Badge>}
      </div>
      <FavoriteButton nftId={nft.id} name={nft.name} className="absolute right-2 top-2" />
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden data-testid="nft-card-skeleton">
      <div className="rounded-md bg-surface p-1">
        <Skeleton className="aspect-square w-full rounded-[14px]" />
      </div>
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-1.5 h-4 w-1/3" />
    </div>
  )
}
