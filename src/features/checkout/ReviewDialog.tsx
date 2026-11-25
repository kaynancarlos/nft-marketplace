import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { NETWORKS, WALLET_PROVIDERS, type Network, type Quote, type Wallet, type WalletProvider } from '@/api/contracts'
import type { CollectorForm } from '@/api/schemas'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { QuoteSummary } from '@/features/cart/QuoteSummary'
import { formatEth } from '@/lib/money'
import { shortAddress } from '@/lib/utils'
import { useQuote } from '@/queries/cart'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  network: Network
  wallet: Wallet
  provider: WalletProvider
  collector: CollectorForm
  submitting: boolean
  submitError: string | null
  onConfirm: (acceptedQuoteHash: string) => void
}

/**
 * Revisão antes do envio. Ao abrir, revalida a cotação com a API. Se a cotação
 * mudar enquanto a revisão está aberta (evento nft.updated ou 409 da API), o
 * botão de confirmação é bloqueado até o usuário aceitar os novos valores.
 */
export function ReviewDialog({ open, onOpenChange, network, wallet, provider, collector, submitting, submitError, onConfirm }: Props) {
  const quote = useQuote(network, open)
  const [accepted, setAccepted] = useState<Quote | null>(null)
  const { refetch } = quote

  useEffect(() => {
    if (!open) {
      setAccepted(null)
      return
    }
    let active = true
    void refetch().then((result) => {
      if (active && result.data) setAccepted(result.data)
    })
    return () => {
      active = false
    }
  }, [open, refetch])

  const current = quote.data
  const changed = Boolean(accepted && current && accepted.hash !== current.hash)
  const blocking = current?.issues.some((i) => i.type === 'OUT_OF_STOCK' || i.type === 'QUANTITY_REDUCED')
  const ready = Boolean(accepted && current && !changed && !quote.isFetching && !blocking && current.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" closeLabel="Fechar revisão">
        <DialogTitle>Revise seu pedido</DialogTitle>
        <DialogDescription>Confira os itens, valores e a carteira antes de confirmar. Os valores foram revalidados agora.</DialogDescription>

        {changed && !blocking && accepted && current && (
          <div role="alert" className="flex gap-3 rounded-md border border-primary/60 bg-primary/10 p-3 text-xs" data-testid="quote-changed">
            <AlertTriangle className="size-4 shrink-0 text-primary" aria-hidden />
            <div className="space-y-2">
              <p>
                Os valores mudaram desde que você abriu a revisão. Total anterior: <strong>{formatEth(accepted.total)} ETH</strong> → novo
                total: <strong>{formatEth(current.total)} ETH</strong>.
              </p>
              <Button size="sm" variant="outline" onClick={() => setAccepted(current)}>
                Aceitar novos valores
              </Button>
            </div>
          </div>
        )}

        {submitError && !changed && (
          <p role="alert" className="rounded-md border border-danger/60 bg-danger/10 p-3 text-xs text-danger">
            {submitError}
          </p>
        )}

        {current?.issues.length ? (
          <ul className="space-y-1 text-xs text-danger" role="alert">
            {current.issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        ) : null}

        <ul className="space-y-2" aria-label="Itens do pedido">
          {current?.items.map((line) => (
            <li key={line.itemId} className="flex items-center gap-3 text-xs">
              <img src={line.image} alt="" width={40} height={40} className="size-10 rounded object-cover" />
              <div className="flex-1">
                <p className="font-bold">{line.name}</p>
                <p className="text-[10px] text-subtle">
                  Edição {line.editionLabel} · {line.quantity} × {formatEth(line.unitPrice)} ETH
                </p>
              </div>
              <span className="font-bold text-price">{formatEth(line.lineTotal)} ETH</span>
            </li>
          ))}
        </ul>

        <QuoteSummary quote={current} loading={!current} />

        <dl className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-3 text-[11px]">
          <div>
            <dt className="text-subtle">Colecionador</dt>
            <dd>
              {collector.displayName} (@{collector.username})
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Rede</dt>
            <dd>{NETWORKS.find((n) => n.id === network)?.label}</dd>
          </div>
          <div>
            <dt className="text-subtle">Carteira</dt>
            <dd>
              {wallet.label} · {shortAddress(wallet.address)}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Provedor</dt>
            <dd>{WALLET_PROVIDERS.find((p) => p.id === provider)?.label}</dd>
          </div>
        </dl>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={() => accepted && onConfirm(accepted.hash)} disabled={!ready} loading={submitting} data-testid="confirm-order">
            {submitting ? 'Enviando pedido' : 'Confirmar e pagar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
