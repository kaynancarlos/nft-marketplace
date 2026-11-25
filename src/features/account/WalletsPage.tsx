import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { NETWORKS, WALLET_PROVIDERS, type Wallet, type WalletSlot } from '@/api/contracts'
import { isApiError } from '@/api/client'
import { walletSchema, type WalletForm } from '@/api/schemas'
import { ErrorState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { usePageTitle } from '@/lib/usePageTitle'
import { useSaveWallet, useWallets } from '@/queries/account'

export function WalletsPage() {
  usePageTitle('Carteiras')
  const wallets = useWallets()
  const [showSecondary, setShowSecondary] = useState(false)

  if (wallets.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  }
  if (wallets.isError) {
    return <ErrorState message={wallets.error.message} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} />
  }

  const { primary, secondary } = wallets.data
  return (
    <div className="space-y-10">
      <section aria-labelledby="primary-title">
        <div className="flex items-baseline justify-between">
          <h1 id="primary-title" className="text-sm font-bold">
            Carteira principal
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted">Usada por padrão nas compras e para receber os NFTs adquiridos.</p>
        <WalletFormSection slot="primary" wallet={primary} />
      </section>

      <section aria-labelledby="secondary-title">
        <h2 id="secondary-title" className="text-sm font-bold">
          Carteira secundária
        </h2>
        <p className="mt-1 text-xs text-muted">Opcional. Pode ser selecionada no pagamento como alternativa.</p>
        {secondary || showSecondary ? (
          <WalletFormSection slot="secondary" wallet={secondary} />
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-line px-4 py-3 text-xs">
            <p className="text-muted">Você ainda não adicionou uma carteira secundária.</p>
            <Button variant="link" size="sm" onClick={() => setShowSecondary(true)}>
              Adicionar carteira secundária
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function toForm(wallet: Wallet | null, slot: WalletSlot): WalletForm {
  return {
    label: wallet?.label ?? (slot === 'primary' ? 'Principal' : 'Reserva'),
    network: wallet?.network ?? 'ethereum',
    type: wallet?.type ?? 'metamask',
    address: wallet?.address ?? '',
    ens: wallet?.ens ?? '',
  }
}

function WalletFormSection({ slot, wallet }: { slot: WalletSlot; wallet: Wallet | null }) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState, setError, reset, watch } = useForm<WalletForm>({
    resolver: zodResolver(walletSchema),
    mode: 'onBlur',
    defaultValues: toForm(wallet, slot),
  })
  const network = watch('network')

  useEffect(() => {
    reset(toForm(wallet, slot))
  }, [wallet, slot, reset])

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    save.mutate(
      { slot, input: { ...values, ens: values.ens || null } },
      {
        onSuccess: () => toast.success(slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.'),
        onError: (error) => {
          if (isApiError(error)) {
            for (const [field, message] of Object.entries(error.fields)) setError(field as keyof WalletForm, { type: 'server', message })
          }
          setFormError(error.message)
        },
      },
    )
  })

  const id = (name: string) => `${slot}-${name}`
  const e = formState.errors

  return (
    <form noValidate onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" data-testid={`wallet-form-${slot}`}>
      <Field id={id('label')} label="Nome da carteira" required error={e.label?.message}>
        {(a) => <Input {...a} {...register('label')} />}
      </Field>
      <Field id={id('network')} label="Rede" required error={e.network?.message}>
        {(a) => (
          <NativeSelect {...a} {...register('network')}>
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field
        id={id('address')}
        label="Endereço da carteira"
        required
        error={e.address?.message}
        hint={network === 'solana' ? 'Endereço Solana (base58).' : 'Formato 0x seguido de 40 caracteres hexadecimais.'}
        className="sm:col-span-2"
      >
        {(a) => <Input {...a} spellCheck={false} autoComplete="off" placeholder="Endereço 0x da carteira" {...register('address')} />}
      </Field>
      <Field id={id('type')} label="Tipo de carteira" required error={e.type?.message}>
        {(a) => (
          <NativeSelect {...a} {...register('type')}>
            {WALLET_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field id={id('ens')} label="Nome ENS" error={e.ens?.message} hint="Opcional, sem o sufixo .eth.">
        {(a) => (
          <div className="flex">
            <Input {...a} className="rounded-r-none" spellCheck={false} {...register('ens')} />
            <span className="grid place-items-center rounded-r-md border border-l-0 border-line bg-surface-2 px-3 text-xs" aria-hidden>
              .eth
            </span>
          </div>
        )}
      </Field>
      {formError && (
        <p role="alert" className="text-xs text-danger sm:col-span-2" data-testid={`wallet-error-${slot}`}>
          {formError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" loading={save.isPending}>
          {slot === 'primary' ? 'Salvar carteira' : 'Salvar carteira secundária'}
        </Button>
      </div>
    </form>
  )
}
