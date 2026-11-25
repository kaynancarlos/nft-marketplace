import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import type { CartItem } from '@/api/contracts'
import { EmptyState, ErrorState } from '@/components/feedback'
import { NftRail } from '@/components/nft/NftRail'
import { QuantityStepper } from '@/components/nft/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/lib/usePageTitle'
import { useCart, useQuote, useRemoveCartItem, useUpdateCartItem } from '@/queries/cart'
import { useNftList } from '@/queries/nfts'
import { CartNotices } from './CartNotices'
import { CouponForm } from './CouponForm'
import { QuoteSummary } from './QuoteSummary'

export function CartPage() {
  usePageTitle('Carrinho de NFTs')
  const cart = useCart()
  const quote = useQuote('ethereum', Boolean(cart.data?.items.length))
  const suggestions = useNftList({ tab: 'trending', sort: 'recent', page: 1, pageSize: 8 })
  const navigate = useNavigate()

  const items = cart.data?.items ?? []
  const blocking = quote.data?.issues.some((i) => i.type === 'OUT_OF_STOCK' || i.type === 'QUANTITY_REDUCED')

  return (
    <div className="pb-10">
      <div className="mt-4 flex items-center gap-3 md:hidden">
        <Link to="/" className="grid size-9 place-items-center rounded-full bg-surface-2" aria-label="Voltar ao mercado">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">Carrinho de NFTs</h1>
        <span className="size-9" aria-hidden />
      </div>

      <nav aria-label="Trilha de navegação" className="mt-6 hidden text-xs md:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/">Início</Link>
            <span aria-hidden className="mx-1">/</span>
          </li>
          <li>
            <Link to="/" hash="catalogo">
              Mercado
            </Link>
            <span aria-hidden className="mx-1">/</span>
          </li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho de NFTs</h1>

      <div className="mt-4">
        <CartNotices />
      </div>

      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.isError ? (
        <div className="mt-6">
          <ErrorState title="Não foi possível carregar o carrinho" message={cart.error.message} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Seu carrinho está vazio"
            message="Explore o mercado e adicione NFTs para começar sua coleção."
            action={
              <Button asChild>
                <Link to="/" hash="catalogo">
                  Explorar NFTs
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_333px] lg:gap-20">
          <section aria-label="Itens do carrinho">
            <table className="hidden w-full border-separate border-spacing-y-1.5 text-left text-xs lg:table lg:text-[13px]">
              <caption className="sr-only">NFTs no carrinho, com preço, quantidade e total</caption>
              <thead className="border-b border-line">
                <tr>
                  <th scope="col" className="py-2 font-bold">NFTs</th>
                  <th scope="col" className="py-2 font-bold">Preço</th>
                  <th scope="col" className="py-2 font-bold">Edições</th>
                  <th scope="col" className="py-2 font-bold">Total</th>
                  <th scope="col" className="py-2"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <CartRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
            <ul className="space-y-3 lg:hidden">
              {items.map((item) => (
                <CartCard key={item.id} item={item} />
              ))}
            </ul>
          </section>

          <aside aria-labelledby="summary-title" className="h-fit lg:sticky lg:top-4">
            <h2 id="summary-title" className="mb-3 hidden text-sm font-bold lg:block">
              Resumo da carteira
            </h2>
            <div className="space-y-4 rounded-t-2xl bg-surface p-4 lg:rounded-none lg:bg-transparent lg:p-0">
              <CouponForm appliedCode={cart.data.couponCode} />
              <QuoteSummary quote={quote.data} loading={quote.isPending} />
              {quote.isError && (
                <p role="alert" className="text-xs text-danger">
                  Não foi possível calcular os valores.{' '}
                  <button type="button" className="underline" onClick={() => void quote.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
              {quote.data?.issues.map((issue, i) => (
                <p key={i} role="alert" className="text-xs text-danger">
                  {issue.message}
                </p>
              ))}
              <Button
                className="h-10 w-full md:h-9"
                onClick={() => void navigate({ to: '/checkout' })}
                disabled={!quote.data || Boolean(blocking)}
              >
                Conectar e finalizar
              </Button>
              <Link to="/" hash="catalogo" className="block text-center text-xs text-primary hover:underline">
                Continuar explorando
              </Link>
            </div>
          </aside>
        </div>
      )}

      <NftRail title="Colecionadores também viram" items={suggestions.data?.items} loading={suggestions.isPending} />
    </div>
  )
}

function useItemActions(item: CartItem) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  return {
    busy,
    setQuantity: (quantity: number) => update.mutate({ itemId: item.id, quantity }),
    remove: () => remove.mutate({ itemId: item.id, name: item.nft.name }),
  }
}

function availabilityNote(item: CartItem) {
  if (item.available === 0) return 'Esgotado — remova para continuar'
  if (item.available < item.quantity) return `Só restam ${item.available}`
  return null
}

function CartRow({ item }: { item: CartItem }) {
  const { busy, setQuantity, remove } = useItemActions(item)
  const note = availabilityNote(item)
  return (
    <tr
      className={cn(
        'align-middle [&>td]:bg-surface [&>td:first-child]:rounded-l-md [&>td:first-child]:pl-1.5 [&>td:last-child]:rounded-r-md [&>td:last-child]:pr-2',
        busy && 'opacity-60',
      )}
      data-testid="cart-item"
      data-item-id={item.id}
    >
      <td className="py-2">
        <div className="flex items-center gap-3">
          <img src={item.nft.image} alt="" width={44} height={44} className="size-11 rounded object-cover" />
          <div>
            <p className="font-bold">{item.nft.name}</p>
            <p className="text-[10px] text-subtle">
              ID do token: {item.nft.tokenId} · Edição {item.editionLabel}
            </p>
            {note && <p className="text-[10px] font-semibold text-danger">{note}</p>}
          </div>
        </div>
      </td>
      <td className="py-2 font-bold text-price" data-testid="cart-item-price">
        {formatEth(item.unitPrice)} ETH
      </td>
      <td className="py-2">
        <QuantityStepper
          value={item.quantity}
          max={Math.max(item.maxQuantity, 1)}
          onChange={setQuantity}
          label={item.nft.name}
          disabled={busy || item.available === 0}
          size="sm"
        />
      </td>
      <td className="py-2 font-bold text-price" data-testid="cart-item-total">
        {formatEth(item.lineTotal)} ETH
      </td>
      <td className="py-2 text-right">
        <Button variant="danger" size="icon-sm" onClick={remove} disabled={busy} aria-label={`Remover ${item.nft.name} do carrinho`}>
          <Trash2 aria-hidden />
        </Button>
      </td>
    </tr>
  )
}

function CartCard({ item }: { item: CartItem }) {
  const { busy, setQuantity, remove } = useItemActions(item)
  const note = availabilityNote(item)
  return (
    <li className={cn('flex gap-3 rounded-xl bg-surface p-2', busy && 'opacity-60')} data-testid="cart-item-mobile">
      <img src={item.nft.image} alt="" width={64} height={64} className="size-16 rounded-lg object-cover" />
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between gap-2">
          <div>
            <p className="text-xs font-bold">{item.nft.name}</p>
            <p className="text-[10px] text-muted">Edição: {item.editionLabel}</p>
            {note && <p className="text-[10px] font-semibold text-danger">{note}</p>}
          </div>
          <Button variant="danger" size="icon-sm" onClick={remove} disabled={busy} aria-label={`Remover ${item.nft.name} do carrinho`}>
            <Trash2 aria-hidden />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-price">{formatEth(item.lineTotal)} ETH</p>
          <QuantityStepper value={item.quantity} max={Math.max(item.maxQuantity, 1)} onChange={setQuantity} label={item.nft.name} disabled={busy || item.available === 0} size="sm" />
        </div>
      </div>
    </li>
  )
}

function CartSkeleton() {
  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_333px] lg:gap-20" aria-busy="true" aria-label="Carregando carrinho" data-testid="cart-skeleton">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}
