import { getRouteApi, Link } from '@tanstack/react-router'
import { NETWORKS } from '@/api/contracts'
import { ErrorState } from '@/components/feedback'
import { Skeleton } from '@/components/ui/misc'
import { formatEth } from '@/lib/money'
import { usePageTitle } from '@/lib/usePageTitle'
import { useOrder } from '@/queries/orders'

const route = getRouteApi('/explorer/$txHash')

/** Explorador de blocos SIMULADO: mostra a transação do pedido confirmado. */
export function ExplorerPage() {
  usePageTitle('Explorador de transações (simulado)')
  const { txHash } = route.useParams()
  const { order: orderId } = route.useSearch()
  const { data: order, isPending, isError } = useOrder(orderId ?? '')

  if (!orderId) return <ErrorState title="Transação não encontrada" message="Abra o explorador a partir do recibo do pedido." />
  if (isPending) return <Skeleton className="mt-10 h-48 w-full" />
  if (isError || order.txHash !== txHash) {
    return (
      <div className="py-12">
        <ErrorState title="Transação não encontrada" message="Este hash não corresponde a nenhum pedido seu." />
      </div>
    )
  }

  return (
    <section className="mx-auto mt-10 max-w-2xl rounded-[var(--radius-card)] border border-line bg-surface p-6 text-xs">
      <p className="mb-2 inline-block rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Simulação</p>
      <h1 className="text-base font-bold">Detalhes da transação</h1>
      <dl className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
        <dt className="text-subtle">Hash</dt>
        <dd className="break-all font-mono">{txHash}</dd>
        <dt className="text-subtle">Status</dt>
        <dd className="text-success">Sucesso</dd>
        <dt className="text-subtle">Rede</dt>
        <dd>{NETWORKS.find((n) => n.id === order.network)?.label}</dd>
        <dt className="text-subtle">Para</dt>
        <dd className="break-all font-mono">{order.wallet.address}</dd>
        <dt className="text-subtle">Valor</dt>
        <dd>{formatEth(order.total)} ETH</dd>
        <dt className="text-subtle">Tokens</dt>
        <dd>{order.items.map((i) => `${i.name} (${i.editionLabel}) × ${i.quantity}`).join(', ')}</dd>
      </dl>
      <Link to="/orders/$orderId" params={{ orderId: order.id }} className="mt-6 inline-block text-primary underline">
        Voltar ao recibo
      </Link>
    </section>
  )
}
