import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useIsMutating } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ChevronLeft, PlugZap, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import {
  NETWORKS,
  WALLET_PROVIDERS,
  type CreateOrderInput,
  type Network,
  type Wallet,
  type WalletProvider,
  type WalletSession,
  type WalletSlot,
} from '@/api/contracts'
import { isApiError } from '@/api/client'
import { collectorSchema, type CollectorForm } from '@/api/schemas'
import { useAuth } from '@/auth/authStore'
import { EmptyState, ErrorState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { CartNotices } from '@/features/cart/CartNotices'
import { CouponForm } from '@/features/cart/CouponForm'
import { QuoteSummary } from '@/features/cart/QuoteSummary'
import { formatEth } from '@/lib/money'
import { cn, shortAddress, stableHash } from '@/lib/utils'
import { usePageTitle } from '@/lib/usePageTitle'
import { useProfile, useWallets } from '@/queries/account'
import { useCart, useQuote } from '@/queries/cart'
import { attemptFor, loadAttempt, loadDraft, resetAttempt, saveDraft } from './checkoutStorage'
import { ReviewDialog } from './ReviewDialog'
import { useConnectWallet, useCreateOrder, useDisconnectWallet } from './useCheckout'

export function CheckoutPage() {
  usePageTitle('Pagamento')
  const { user } = useAuth()
  const cart = useCart()
  const profile = useProfile()
  const wallets = useWallets()
  const creatingOrder = useIsMutating({ mutationKey: ['orders', 'create'] }) > 0

  if (!user) return null
  if (cart.isPending || profile.isPending || wallets.isPending) return <CheckoutSkeleton />
  if (cart.isError || profile.isError || wallets.isError) {
    const error = cart.error ?? profile.error ?? wallets.error
    return (
      <div className="py-12">
        <ErrorState
          title="Não foi possível carregar o pagamento"
          message={error?.message}
          onRetry={() => {
            void cart.refetch()
            void profile.refetch()
            void wallets.refetch()
          }}
        />
      </div>
    )
  }
  // Enquanto um pedido está sendo enviado, o formulário continua montado mesmo
  // que o carrinho esvazie (o pedido pode ter sido confirmado antes da resposta).
  if (cart.data.items.length === 0 && !creatingOrder) {
    return <EmptyCheckout userId={user.id} />
  }
  return <CheckoutForm userId={user.id} />
}

function EmptyCheckout({ userId }: { userId: string }) {
  const pending = loadAttempt(userId)
  return (
    <div className="py-12">
      <EmptyState
        title="Não há itens para pagar"
        message="Seu carrinho está vazio."
        action={
          <div className="flex flex-col items-center gap-2">
            {pending?.orderId && (
              <Link to="/orders/$orderId" params={{ orderId: pending.orderId }} className="text-sm text-primary underline">
                Ver o último pedido
              </Link>
            )}
            <Link to="/" hash="catalogo" className="text-sm text-primary underline">
              Explorar NFTs
            </Link>
          </div>
        }
      />
    </div>
  )
}

function CheckoutForm({ userId }: { userId: string }) {
  const profile = useProfile()
  const walletsQuery = useWallets()
  const cart = useCart()
  const draft = useMemo(() => loadDraft(userId), [userId])
  const wallets = walletsQuery.data!
  const available = [wallets.primary, wallets.secondary].filter((w): w is Wallet => Boolean(w))

  const [walletSlot, setWalletSlot] = useState<WalletSlot>(draft?.walletSlot ?? (wallets.primary ? 'primary' : 'secondary'))
  const wallet = (walletSlot === 'primary' ? wallets.primary : wallets.secondary) ?? available[0] ?? null
  const [network, setNetwork] = useState<Network>(draft?.network ?? wallet?.network ?? 'ethereum')
  const [provider, setProvider] = useState<WalletProvider>(draft?.provider ?? wallet?.type ?? 'metamask')
  const [session, setSession] = useState<WalletSession | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const quote = useQuote(network)
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const createOrder = useCreateOrder()

  const form = useForm<CollectorForm>({
    resolver: zodResolver(collectorSchema),
    mode: 'onBlur',
    defaultValues: draft?.collector ?? {
      displayName: profile.data?.displayName ?? '',
      username: profile.data?.username ?? '',
      email: profile.data?.email ?? '',
      referralCode: '',
      note: '',
    },
  })
  const { register, formState, watch, handleSubmit, setError } = form
  const values = watch()

  // Rascunho salvo continuamente (retomada após expiração de sessão/refresh).
  useEffect(() => {
    saveDraft({ userId, collector: values, network, walletSlot, provider })
  }, [userId, values, network, walletSlot, provider])

  // Trocar carteira, rede ou provedor invalida a conexão atual.
  const sessionMatches = session && wallet && session.walletId === wallet.id && session.network === network && session.provider === provider
  useEffect(() => {
    if (session && !sessionMatches) setSession(null)
  }, [session, sessionMatches])

  const pendingAttempt = loadAttempt(userId)

  function handleConnect() {
    if (!wallet) return
    setConnectError(null)
    connect.mutate(
      { walletId: wallet.id, provider, network },
      {
        onSuccess: (s) => {
          setSession(s)
          toast.success(`Carteira ${wallet.label} conectada via ${WALLET_PROVIDERS.find((p) => p.id === provider)?.label}.`)
        },
        onError: (error) => setConnectError(error.message),
      },
    )
  }

  function handleDisconnect() {
    if (!session) return
    disconnect.mutate(session.id, {
      onSettled: () => {
        setSession(null)
        toast.info('Carteira desconectada.')
      },
    })
  }

  const openReview = handleSubmit(
    () => {
      setSubmitError(null)
      if (!wallet) {
        setSubmitError('Cadastre uma carteira para continuar.')
        return
      }
      if (!session || !sessionMatches) {
        setSubmitError('Conecte a carteira selecionada antes de revisar o pedido.')
        document.getElementById('connect-wallet')?.focus()
        return
      }
      setReviewOpen(true)
    },
    () => {
      setSubmitError('Revise os campos destacados.')
    },
  )

  function confirmOrder(acceptedHash: string) {
    if (submittingRef.current || createOrder.isPending || !wallet || !session) return
    submittingRef.current = true
    setSubmitError(null)

    const input: CreateOrderInput = {
      quoteHash: acceptedHash,
      network,
      walletId: wallet.id,
      walletSessionId: session.id,
      collector: {
        displayName: values.displayName.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        referralCode: values.referralCode?.trim() || undefined,
        note: values.note?.trim() || undefined,
      },
    }
    const attempt = attemptFor(userId, stableHash(input))

    createOrder.mutate(
      { input, attempt },
      {
        onSuccess: () => setReviewOpen(false),
        onError: (error) => {
          if (!isApiError(error)) return
          switch (error.code) {
            case 'QUOTE_OUTDATED':
            case 'OUT_OF_STOCK':
              // A revisão continua aberta e exige nova confirmação com os valores atualizados.
              break
            case 'WALLET_NOT_CONNECTED':
              setSession(null)
              setReviewOpen(false)
              setSubmitError(error.message)
              break
            case 'IDEMPOTENCY_CONFLICT':
              resetAttempt()
              setSubmitError('Detectamos uma tentativa anterior diferente. Confirme novamente.')
              break
            case 'VALIDATION_ERROR':
              setReviewOpen(false)
              for (const [field, message] of Object.entries(error.fields)) {
                setError(field as keyof CollectorForm, { message })
              }
              setSubmitError(error.message)
              break
            default:
              setSubmitError(`${error.message} Seus itens continuam no carrinho.`)
          }
        },
        onSettled: () => {
          submittingRef.current = false
        },
      },
    )
  }

    const items = cart.data?.items ?? []
  const fieldError = (name: keyof CollectorForm) => formState.errors[name]?.message

  return (
    <div className="pb-10">
      <div className="mt-4 flex items-center gap-3 md:hidden">
        <Link to="/cart" className="grid size-9 place-items-center rounded-full bg-surface-2" aria-label="Voltar ao carrinho">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">Pagamento com carteira</h1>
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
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>

      {pendingAttempt?.orderId && (
        <p role="status" className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-xs">
          Você tem um pedido recente.{' '}
          <Link to="/orders/$orderId" params={{ orderId: pendingAttempt.orderId }} className="text-primary underline">
            Acompanhar pedido
          </Link>
        </p>
      )}

      <div className="mt-4">
        <CartNotices />
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void openReview()
        }}
        className="mt-4 grid gap-8 lg:grid-cols-[1fr_406px] lg:gap-12"
      >
        <section aria-labelledby="collector-title" className="order-2 md:order-1">
          <h1 id="collector-title" className="mb-4 hidden text-sm font-bold md:block">
            Perfil do colecionador
          </h1>
          <h2 className="mb-4 text-sm font-bold md:hidden">Perfil do colecionador</h2>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field id="displayName" label="Nome de exibição" required error={fieldError('displayName')}>
              {(a) => <Input {...a} autoComplete="name" {...register('displayName')} />}
            </Field>
            <Field id="username" label="Nome de usuário" required error={fieldError('username')}>
              {(a) => <Input {...a} autoComplete="username" {...register('username')} />}
            </Field>
            <Field id="email" label="E-mail" required error={fieldError('email')}>
              {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
            </Field>
            <Field id="network" label="Rede" required>
              {(a) => (
                <NativeSelect {...a} value={network} onChange={(e) => setNetwork(e.target.value as Network)}>
                  {NETWORKS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field id="walletAddress" label="Endereço da carteira" required hint="Definido pela carteira selecionada.">
              {(a) => <Input {...a} readOnly value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" />}
            </Field>
            <Field id="walletEns" label="Nome ENS">
              {(a) => <Input {...a} readOnly value={wallet?.ens ? `${wallet.ens}.eth` : '—'} />}
            </Field>
            <Field id="referralCode" label="Código de indicação" error={fieldError('referralCode')} hint="Opcional.">
              {(a) => <Input {...a} {...register('referralCode')} />}
            </Field>
            <Field id="note" label="Observação do colecionador (opcional)" error={fieldError('note')} className="sm:col-start-1">
              {(a) => <Textarea {...a} rows={4} {...register('note')} />}
            </Field>
          </div>
        </section>

        <aside aria-label="Resumo do pedido e carteira" className="order-1 space-y-5 md:order-2">
          <section aria-labelledby="order-summary-title" className="hidden md:block">
            <div className="flex justify-between text-xs font-bold">
              <h2 id="order-summary-title">Seus NFTs</h2>
              <span>Subtotal</span>
            </div>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded bg-surface p-1.5 text-xs">
                  <img src={item.nft.image} alt="" width={40} height={40} className="size-10 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{item.nft.name}</p>
                    <p className="text-[10px] text-subtle">ID do token: {item.nft.tokenId}</p>
                  </div>
                  <span className="text-[10px] text-subtle">(x {item.quantity})</span>
                  <span className="font-bold text-price">{formatEth(item.lineTotal)} ETH</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="hidden md:block">
            <CheckoutCoupon appliedCode={cart.data?.couponCode ?? null} />
          </div>
          <div className="hidden md:block">
            <QuoteSummary quote={quote.data} loading={quote.isPending} />
          </div>

          <fieldset>
            <legend className="flex w-full items-center justify-between text-xs font-bold">
              <span>Carteira conectada</span>
            </legend>
            <Link to="/account/wallets" className="float-right -mt-4 text-[11px] text-primary hover:underline">
              Trocar carteira
            </Link>
            {available.length === 0 ? (
              <p className="mt-3 rounded-md border border-line p-3 text-xs">
                Você ainda não cadastrou carteiras.{' '}
                <Link to="/account/wallets" className="text-primary underline">
                  Cadastrar carteira
                </Link>
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {available.map((w) => (
                  <label
                    key={w.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border bg-surface p-3 text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                      w.slot === walletSlot ? 'border-primary' : 'border-line',
                    )}
                  >
                    <input
                      type="radio"
                      name="wallet"
                      value={w.slot}
                      checked={w.slot === walletSlot}
                      onChange={() => {
                        setWalletSlot(w.slot)
                        setNetwork(w.network)
                        setProvider(w.type)
                      }}
                      className="accent-primary"
                    />
                    <span className="flex-1">
                      <span className="block font-bold">{w.label}</span>
                      <span className="block text-subtle">{w.ens ? `${w.ens}.eth` : shortAddress(w.address)}</span>
                      <span className="block text-subtle">Rede {NETWORKS.find((n) => n.id === w.network)?.label}</span>
                    </span>
                    <span className="text-[10px] text-subtle">{w.slot === 'primary' ? 'Principal' : 'Secundária'}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-center text-xs font-bold md:w-full">Carteira e rede</legend>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label="Provedor da carteira">
              {WALLET_PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                    provider === p.id ? 'border-primary' : 'border-line',
                  )}
                >
                  <span className="grid size-7 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-primary" aria-hidden>
                    {p.short}
                  </span>
                  <span className="flex-1">{p.label}</span>
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={provider === p.id}
                    onChange={() => setProvider(p.id)}
                    className="accent-primary"
                  />
                </label>
              ))}
            </div>

            <div className="mt-3" aria-live="polite">
              {sessionMatches ? (
                <div className="flex items-center justify-between rounded-md border border-success/50 bg-success/10 px-3 py-2 text-xs" data-testid="wallet-connected">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" aria-hidden />
                    Conectada: {wallet?.label} · {shortAddress(wallet?.address ?? '')}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect} loading={disconnect.isPending}>
                    <Unplug aria-hidden />
                    Desconectar
                  </Button>
                </div>
              ) : (
                <Button
                  id="connect-wallet"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleConnect}
                  loading={connect.isPending}
                  disabled={!wallet}
                >
                  <PlugZap aria-hidden />
                  Conectar carteira
                </Button>
              )}
              {connectError && (
                <p role="alert" className="mt-2 text-xs text-danger" data-testid="wallet-error">
                  {connectError}
                </p>
              )}
            </div>
          </fieldset>

          <div className="flex items-center justify-between text-sm font-bold md:hidden">
            <span>Total:</span>
            <span className="text-price">{quote.data ? `${formatEth(quote.data.total)} ETH` : '—'}</span>
          </div>

          {submitError && (
            <p role="alert" className="rounded-md border border-danger/60 bg-danger/10 px-3 py-2 text-xs text-danger" data-testid="checkout-error">
              {submitError}
            </p>
          )}

          <Button type="submit" className="h-11 w-full rounded-full md:h-9 md:rounded-md" disabled={!quote.data || createOrder.isPending}>
            Confirmar compra
          </Button>
        </aside>
      </form>

      {wallet && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={(open) => {
            if (!createOrder.isPending) setReviewOpen(open)
          }}
          network={network}
          wallet={wallet}
          provider={provider}
          collector={values}
          submitting={createOrder.isPending}
          submitError={
            createOrder.error && isApiError(createOrder.error) && ['QUOTE_OUTDATED', 'OUT_OF_STOCK'].includes(createOrder.error.code)
              ? createOrder.error.message
              : null
          }
          onConfirm={confirmOrder}
        />
      )}
    </div>
  )
}

/** Figma: "Tem um código promocional? Aplique aqui" — o campo abre ao clicar. */
function CheckoutCoupon({ appliedCode }: { appliedCode: string | null }) {
  const [open, setOpen] = useState(false)
  if (appliedCode || open) return <CouponForm appliedCode={appliedCode} compact />
  return (
    <p className="text-center text-xs">
      Tem um código promocional?{' '}
      <button type="button" onClick={() => setOpen(true)} className="font-semibold text-primary underline-offset-4 hover:underline">
        Aplique aqui
      </button>
    </p>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_406px]" aria-busy="true" aria-label="Carregando pagamento">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-10" />
      </div>
    </div>
  )
}