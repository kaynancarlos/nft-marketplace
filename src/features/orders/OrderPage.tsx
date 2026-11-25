import { getRouteApi, Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, ShoppingBag, X, XCircle } from 'lucide-react'
import { NETWORKS, WALLET_PROVIDERS, type Order } from '@/api/contracts'
import { isApiError } from '@/api/client'
import { ErrorState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { formatEth, isZero } from '@/lib/money'
import { shortAddress } from '@/lib/utils'
import { usePageTitle } from '@/lib/usePageTitle'
import { useOrder } from '@/queries/orders'
import { useRealtimeState } from '@/realtime/realtimeStore'

const route = getRouteApi('/orders/$orderId')

export function OrderPage() {
  const { orderId } = route.useParams()
  const { data: order, isPending, isError, error, refetch, isFetching } = useOrder(orderId)
  usePageTitle(
    order?.status === 'confirmed' ? 'Pedido confirmado' : order?.status === 'rejected' ? 'Pagamento recusado' : 'Acompanhando pedido',
  )

  if (isPending) {
    return (
      <div className="mx-auto mt-10 max-w-xl space-y-4" aria-busy="true" aria-label="Carregando pedido">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError) {
    if (isApiError(error) && error.status === 403) {
      return (
        <div className="py-12" data-testid="order-forbidden">
          <ErrorState title="Acesso não autorizado" message="Este pedido pertence a outra conta. Você não tem permissão para visualizá-lo." />
        </div>
      )
    }
    if (isApiError(error) && error.status === 404) {
      return (
        <div className="py-12">
          <ErrorState title="Pedido não encontrado" message="Confira o link ou acesse seus pedidos pelo carrinho." />
        </div>
      )
    }
    return (
      <div className="py-12">
        <ErrorState title="Não foi possível carregar o pedido" message={error.message} onRetry={() => void refetch()} retrying={isFetching} />
      </div>
    )
  }

  if (order.status === 'pending') return <PendingOrder order={order} />
  if (order.status === 'rejected') return <RejectedOrder order={order} />
  return <Receipt order={order} />
}

function PendingOrder({ order }: { order: Order }) {
  const { status } = useRealtimeState()
  return (
    <section className="mx-auto mt-10 max-w-xl rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center" data-testid="order-pending">
      <Loader2 className="mx-auto size-10 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      <h1 className="mt-4 text-lg font-bold">Aguardando confirmação da rede</h1>
      <p role="status" className="mt-2 text-sm text-muted">
        Pedido <strong>{order.id}</strong> criado. Total de {formatEth(order.total)} ETH. Você pode recarregar ou fechar esta página: o
        pedido continua sendo processado e não será duplicado.
      </p>
      {status !== 'connected' && (
        <p className="mt-3 text-xs text-primary" data-testid="order-reconnecting">
          Conexão em tempo real interrompida. Tentando reconectar…
        </p>
      )}
    </section>
  )
}

function RejectedOrder({ order }: { order: Order }) {
  return (
    <section className="mx-auto mt-10 max-w-xl rounded-[var(--radius-card)] border border-danger/50 bg-surface p-6 text-center" data-testid="order-rejected">
      <XCircle className="mx-auto size-10 text-danger" aria-hidden />
      <h1 className="mt-4 text-lg font-bold">Pagamento recusado</h1>
      <p role="status" className="mt-2 text-sm text-muted">
        {order.failureReason ?? 'A transação não foi concluída.'} Nenhum valor foi cobrado e seus itens continuam no carrinho.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Button asChild>
          <Link to="/checkout">Tentar novamente</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/cart">Ver carrinho</Link>
        </Button>
      </div>
    </section>
  )
}

/** Recibo: reproduz o snapshot do pedido — mudanças posteriores no catálogo não o afetam. */
function Receipt({ order }: { order: Order }) {
  const networkLabel = NETWORKS.find((n) => n.id === order.network)?.label
  const provider = WALLET_PROVIDERS.find((p) => p.id === order.wallet.provider)?.label
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.updatedAt))

  return (
    <section
      className="relative mx-auto mt-10 max-w-[560px] overflow-hidden rounded-[var(--radius-card)] border-b-4 border-primary bg-surface px-5 pb-8 pt-6 md:px-8"
      data-testid="order-confirmed"
      aria-labelledby="receipt-title"
    >
      <Link to="/" className="absolute right-3 top-3 rounded p-1 text-primary hover:bg-surface-2" aria-label="Fechar e voltar ao início">
        <X className="size-4" aria-hidden />
      </Link>
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-primary text-primary">
          <ShoppingBag className="size-6" aria-hidden />
        </span>
        <h1 id="receipt-title" className="mt-3 flex items-center justify-center gap-2 text-sm font-bold">
          <CheckCircle2 className="size-4 text-success" aria-hidden />
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-y-3 border-y border-line py-3 text-[11px] sm:grid-cols-4 sm:divide-x sm:divide-line">
        <div className="px-2">
          <dt className="font-bold">ID da transação</dt>
          <dd className="text-subtle" data-testid="receipt-tx">
            {shortAddress(order.txHash ?? '', 4)}
          </dd>
        </div>
        <div className="px-2">
          <dt className="font-bold">Data</dt>
          <dd className="text-subtle">{date}</dd>
        </div>
        <div className="px-2">
          <dt className="font-bold">Total</dt>
          <dd className="text-subtle">{formatEth(order.total)} ETH</dd>
        </div>
        <div className="px-2">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-subtle">{provider}</dd>
        </div>
      </dl>

      <h2 className="mt-5 text-xs font-bold">Detalhes da transação</h2>
      <table className="mt-2 w-full text-left text-xs" data-testid="receipt-items">
        <caption className="sr-only">Itens comprados</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-2 font-bold">NFTs</th>
            <th scope="col" className="py-2 font-bold">Edições</th>
            <th scope="col" className="py-2 text-right font-bold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((line) => (
            <tr key={line.editionId}>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <img src={line.image} alt="" width={40} height={40} className="size-10 rounded object-cover" />
                  <div>
                    <p className="font-bold">{line.name}</p>
                    <p className="text-[10px] text-subtle">
                      ID do token: {line.tokenId} · {line.editionLabel}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-2 text-subtle">(x {line.quantity})</td>
              <td className="py-2 text-right font-bold text-price">{formatEth(line.lineTotal)} ETH</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-3 space-y-1.5 text-xs">
        {!isZero(order.discount) && (
          <div className="flex justify-end gap-10">
            <dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
            <dd>(-) {formatEth(order.discount)} ETH</dd>
          </div>
        )}
        <div className="flex justify-end gap-10">
          <dt>Taxa</dt>
          <dd>{formatEth(order.networkFee, 3)} ETH</dd>
        </div>
        <div className="flex justify-end gap-10 font-bold">
          <dt>Total</dt>
          <dd className="text-price" data-testid="receipt-total">
            {formatEth(order.total)} ETH
          </dd>
        </div>
      </dl>

      <p className="mx-auto mt-5 max-w-sm border-t border-line pt-4 text-center text-[11px] text-muted">
        Transação confirmada na {networkLabel}. A propriedade foi transferida para sua carteira conectada ({shortAddress(order.wallet.address)}) e
        registrada na rede.
      </p>
      <div className="mt-4 text-center">
        <Button asChild size="sm">
          <Link to="/explorer/$txHash" params={{ txHash: order.txHash ?? '' }} search={{ order: order.id }}>
            Ver no Etherscan
          </Link>
        </Button>
        <p className="mt-2 text-[10px] text-subtle">Explorador simulado — esta demonstração não usa blockchain real.</p>
      </div>
    </section>
  )
}
