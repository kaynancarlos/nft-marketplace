import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { getRouteApi, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Link2, ShoppingCart, Star, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import type { Edition, NftDetail } from '@/api/contracts'
import { isApiError } from '@/api/client'
import { ErrorState } from '@/components/feedback'
import { FavoriteButton } from '@/components/nft/FavoriteButton'
import { NftRail } from '@/components/nft/NftRail'
import { QuantityStepper } from '@/components/nft/QuantityStepper'
import { SocialIcon } from '@/components/layout/SocialIcons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/misc'
import { formatEth, mul } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/lib/usePageTitle'
import { useAddToCart } from '@/queries/cart'
import { useNftDetail } from '@/queries/nfts'

const route = getRouteApi('/nft/$nftId')

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const { data: nft, isPending, isError, error, refetch, isFetching } = useNftDetail(nftId)
  usePageTitle(nft?.name ?? (isError ? 'NFT não encontrado' : 'Carregando NFT'))

  if (isPending) return <DetailSkeleton />
  if (isError) {
    if (isApiError(error) && error.status === 404) return <NftNotFound />
    return (
      <div className="py-12">
        <ErrorState title="Não foi possível carregar este NFT" message={error.message} onRetry={() => void refetch()} retrying={isFetching} />
      </div>
    )
  }
  return <NftDetailView key={nft.id} nft={nft} />
}

function pickDefaultEdition(editions: Edition[]) {
  const available = editions.filter((e) => e.available > 0)
  return (available.find((e) => e.label === '1/50') ?? available[0] ?? editions[0]).id
}

function NftDetailView({ nft }: { nft: NftDetail }) {
  const [editionId, setEditionId] = useState(() => pickDefaultEdition(nft.editions))
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const router = useRouter()

  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  const unavailable = edition.available === 0
  const maxQuantity = Math.max(1, Math.min(edition.available, nft.maxPerOrder))

  // Se a disponibilidade mudar (tempo real), mantém a quantidade dentro do limite.
  useEffect(() => {
    if (quantity > maxQuantity) setQuantity(maxQuantity)
  }, [maxQuantity, quantity])

  const total = useMemo(() => mul(edition.price, quantity), [edition.price, quantity])

  function add(goToCart: boolean) {
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity, name: nft.name },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/cart' })
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link do NFT copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const shareUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''

  return (
    <article className="pb-28 md:pb-0">
      {/* Mobile: topo com voltar + favoritar */}
      <div className="mt-4 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="grid size-9 place-items-center rounded-full bg-surface-2"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <FavoriteButton nftId={nft.id} name={nft.name} className="size-9 rounded-full" />
      </div>

      <nav aria-label="Trilha de navegação" className="mt-6 hidden text-xs md:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/" className="hover:text-primary">
              Início
            </Link>
            <span aria-hidden className="mx-1">/</span>
          </li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-primary">
              Mercado
            </Link>
            <span aria-hidden className="mx-1">/</span>
          </li>
          <li aria-current="page" className="text-muted">
            {nft.name}
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-6 md:mt-5 md:grid-cols-[minmax(0,420px)_1fr] md:gap-8 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-12">
        {/* Galeria */}
        <div className="grid gap-3 md:grid-cols-[64px_1fr] lg:grid-cols-[96px_1fr] lg:gap-4">
          <ul className="order-2 flex gap-2 md:order-1 md:flex-col" aria-label="Miniaturas">
            {nft.gallery.map((src, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Ver imagem ${i + 1} de ${nft.gallery.length}`}
                  aria-pressed={i === imageIndex}
                  className={cn('block overflow-hidden rounded-md border-2', i === imageIndex ? 'border-primary' : 'border-transparent')}
                >
                  <img
                    src={src}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    className="size-14 object-cover md:size-16 lg:size-[88px]"
                    style={{ objectPosition: ['50% 50%', '50% 20%', '30% 60%', '70% 40%'][i % 4] }}
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="relative order-1 rounded-md bg-surface p-1 md:order-2">
            <img
              src={nft.gallery[imageIndex]}
              alt={`Arte do NFT ${nft.name}`}
              width={400}
              height={400}
              fetchPriority="high"
              className="aspect-square w-full rounded-[14px] object-cover"
              style={{ objectPosition: ['50% 50%', '50% 20%', '30% 60%', '70% 40%'][imageIndex % 4] }}
            />
            <Dialog>
              <DialogTrigger
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-md bg-background/80 text-foreground"
                aria-label="Ampliar imagem"
              >
                <ZoomIn className="size-4" aria-hidden />
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-3" aria-describedby={undefined}>
                <DialogTitle className="sr-only">{nft.name} ampliado</DialogTitle>
                <img src={nft.gallery[imageIndex]} alt={`Arte do NFT ${nft.name} em tamanho ampliado`} className="w-full rounded-[14px]" />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Informações */}
        <div className="rounded-t-2xl bg-surface p-4 md:rounded-none md:bg-transparent md:p-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-bold md:text-xl lg:text-2xl">{nft.name}</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-xs md:hidden">
              <Star className="size-3 fill-primary text-primary" aria-hidden />
              {nft.rating.average.toFixed(1)}
              <span className="text-subtle">({nft.rating.count})</span>
            </span>
          </div>
          <p className="mt-1 hidden text-xl font-bold text-price md:block lg:text-2xl" data-testid="nft-price">
            {formatEth(edition.price)} ETH
          </p>
          <p className="mt-1 hidden items-center gap-2 text-xs md:flex">
            <span className="flex text-primary" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('size-3.5', i < Math.round(nft.rating.average) && 'fill-primary')} />
              ))}
            </span>
            <span>
              <span className="sr-only">Nota {nft.rating.average.toFixed(1)} de 5. </span>
              {nft.rating.count} avaliações de colecionadores
            </span>
          </p>

          <h2 className="mt-4 hidden text-xs font-bold md:block">Sobre este NFT:</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted lg:text-sm">{nft.description}</p>

          <fieldset className="mt-4">
            <legend className="text-xs font-bold">Edição:</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {nft.editions.map((e) => {
                const soldOut = e.available === 0
                return (
                  <label
                    key={e.id}
                    className={cn(
                      'relative cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold uppercase transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                      e.id === editionId ? 'border-primary bg-primary/15 text-primary' : 'border-line text-foreground',
                      soldOut && 'cursor-not-allowed line-through opacity-50',
                    )}
                  >
                    <input
                      type="radio"
                      name="edition"
                      value={e.id}
                      checked={e.id === editionId}
                      disabled={soldOut}
                      onChange={() => {
                        setEditionId(e.id)
                        setQuantity(1)
                      }}
                      className="sr-only"
                    />
                    {e.label}
                    {soldOut && <span className="sr-only"> (esgotada)</span>}
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-subtle" data-testid="edition-availability">
              {unavailable
                ? 'Edição indisponível no momento.'
                : `${edition.supply === null ? 'Edição aberta' : `${edition.available} de ${edition.supply} disponíveis`} · limite de ${maxQuantity} por pedido`}
            </p>
          </fieldset>

          {/* Desktop: quantidade + comprar + favoritar */}
          <div className="mt-4 hidden flex-wrap items-center gap-3 md:flex">
            <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} label={nft.name} disabled={unavailable} />
            <Button onClick={() => add(true)} loading={addToCart.isPending} disabled={unavailable} className="h-9 min-w-36 uppercase">
              {unavailable ? 'Esgotado' : 'Comprar'}
            </Button>
            <FavoriteButton nftId={nft.id} name={nft.name} variant="button" className="h-9" />
          </div>

          <dl className="mt-4 space-y-1.5 text-xs text-muted lg:text-sm">
            <div className="flex gap-1">
              <dt>ID do token:</dt>
              <dd className="text-foreground/90">{nft.tokenId}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Coleção:</dt>
              <dd className="text-foreground/90">{nft.collection}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Atributos:</dt>
              <dd className="text-foreground/90">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>

          <div className="mt-4 hidden items-center gap-3 text-xs font-bold md:flex">
            <span>Compartilhar este NFT:</span>
            <button type="button" onClick={copyLink} className="hover:text-primary" aria-label="Copiar link do NFT">
              <Link2 className="size-4" aria-hidden />
            </button>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
              aria-label="Compartilhar no LinkedIn (abre em nova aba)"
            >
              <SocialIcon network="linkedin" />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodeURIComponent(nft.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
              aria-label="Compartilhar no X (abre em nova aba)"
            >
              <SocialIcon network="twitter" />
            </a>
          </div>
        </div>
      </div>

      <DetailTabs nft={nft} />
      <NftRail title="Mais desta coleção" items={nft.related} />

      {/* Mobile: barra de compra fixa */}
      <div className="fixed inset-x-0 bottom-[60px] z-20 border-t border-line bg-surface px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span>Qtd.</span>
            <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} label={nft.name} disabled={unavailable} size="sm" />
          </div>
          <p className="text-base font-bold text-price" aria-live="polite">
            {formatEth(total)} ETH
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => add(true)} loading={addToCart.isPending} disabled={unavailable} className="h-11 flex-1 rounded-full">
            {unavailable ? 'Esgotado' : 'Comprar NFT'}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-11 rounded-full"
            onClick={() => add(false)}
            disabled={unavailable || addToCart.isPending}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
          >
            <ShoppingCart aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  )
}

function DetailTabs({ nft }: { nft: NftDetail }) {
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const tabs = [
    { id: 'details' as const, label: 'Detalhes do NFT' },
    { id: 'reviews' as const, label: `Avaliações de colecionadores (${nft.rating.count})` },
  ]

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = tab === 'details' ? 'reviews' : 'details'
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <section className="mt-10">
      <div role="tablist" aria-label="Informações do NFT" className="flex gap-6 border-b border-line text-xs" onKeyDown={onKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={cn('-mb-px border-b-2 pb-2 font-semibold', tab === t.id ? 'border-primary text-primary' : 'border-transparent')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="panel-details" role="tabpanel" aria-labelledby="tab-details" hidden={tab !== 'details'} className="space-y-4 pt-5 text-xs leading-relaxed text-muted">
        {nft.longDescription.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <div>
          <h3 className="font-bold text-foreground">Rede:</h3>
          <p>Cunhado na {nft.network === 'ethereum' ? 'Ethereum' : nft.network === 'polygon' ? 'Polygon' : 'Solana'} com procedência imutável e metadados armazenados no IPFS.</p>
        </div>
        <div>
          <h3 className="font-bold text-foreground">Contrato:</h3>
          <p>{nft.contract}</p>
        </div>
        <div>
          <h3 className="font-bold text-foreground">Direitos autorais:</h3>
          <p>{nft.royalties}</p>
        </div>
      </div>
      <div id="panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" hidden={tab !== 'reviews'} className="pt-5">
        <ul className="space-y-4">
          {nft.reviews.map((r) => (
            <li key={r.id} className="rounded-md bg-surface p-4 text-xs">
              <p className="font-bold">
                {r.author} <span className="font-normal text-primary">{'★'.repeat(r.rating)}</span>
                <span className="sr-only">{r.rating} de 5 estrelas</span>
              </p>
              <p className="mt-1 text-muted">{r.comment}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function NftNotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center" data-testid="nft-not-found">
      <h1 className="text-xl font-bold">NFT não encontrado</h1>
      <p className="text-sm text-muted">Este NFT não existe ou foi removido do mercado.</p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Voltar ao mercado
        </Link>
      </Button>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mt-6" aria-busy="true" aria-label="Carregando NFT" data-testid="detail-skeleton">
      <Skeleton className="h-3 w-40" />
      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,420px)_1fr] lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-12">
        <div className="grid gap-3 md:grid-cols-[64px_1fr] lg:grid-cols-[96px_1fr] lg:gap-4">
          <div className="hidden flex-col gap-2 md:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-16 lg:size-[88px]" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full rounded-[14px]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-9 w-80" />
        </div>
      </div>
      {/* Reserva o espaço das abas e do carrossel: sem isso o rodapé aparece na
          tela durante o carregamento e "pula" quando o conteúdo chega (CLS). */}
      <div className="mt-10 space-y-3">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-56 w-full" />
      </div>
      <NftRail title="Mais desta coleção" items={undefined} loading />
    </div>
  )
}
