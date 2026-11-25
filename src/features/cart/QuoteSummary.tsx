import type { Quote } from '@/api/contracts'
import { Skeleton } from '@/components/ui/misc'
import { formatEth, isZero } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Subtotal, desconto, taxa e total exatamente como a API calculou (cotação).
 * Nada é recalculado no cliente.
 */
export function QuoteSummary({ quote, loading, className }: { quote: Quote | undefined; loading?: boolean; className?: string }) {
  if (loading || !quote) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Calculando valores" data-testid="quote-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <dl className={cn('space-y-2 text-xs', className)} data-testid="quote-summary" data-quote-hash={quote.hash}>
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd data-testid="quote-subtotal">{formatEth(quote.subtotal)} ETH</dd>
      </div>
      <div className="flex justify-between">
        <dt>{quote.coupon ? quote.coupon.label : 'Desconto do lançamento'}</dt>
        <dd data-testid="quote-discount">(-) {isZero(quote.discount) ? '0.00' : formatEth(quote.discount)} ETH</dd>
      </div>
      <div className="flex justify-between">
        <dt>Taxa de rede</dt>
        <dd className="text-right">
          <span data-testid="quote-fee">{formatEth(quote.networkFee, 3)} ETH</span>
          <span className="block text-[10px] text-price">Taxa estimada</span>
        </dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-sm font-bold">
        <dt>Total</dt>
        <dd className="text-price" data-testid="quote-total">
          {formatEth(quote.total)} ETH
        </dd>
      </div>
    </dl>
  )
}
