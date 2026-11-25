import { HttpResponse } from 'msw'
import type { ConnectWalletInput, Wallet, WalletInput, WalletSlot, WalletsResponse } from '@/api/contracts'
import { walletSchema, zodFieldErrors } from '@/api/schemas'
import { db } from '../db'
import { toWalletSession } from '../domain'
import type { WalletRecord } from '../fixtures'
import { ApiFail, readJson, requireUser, route } from '../http'
import { activeScenario } from '../scenarios'

function toWallet(record: WalletRecord | null): Wallet | null {
  return record ? { ...record } : null
}

function walletsOf(userId: string) {
  return (db.state.wallets[userId] ??= { primary: null, secondary: null })
}

export const walletHandlers = [
  route('get', '/wallets', ({ request }) => {
    const { user } = requireUser(request)
    const w = walletsOf(user.id)
    const body: WalletsResponse = { primary: toWallet(w.primary), secondary: toWallet(w.secondary) }
    return HttpResponse.json(body)
  }),

  route('put', '/wallets/:slot', async ({ request, params }) => {
    const { user } = requireUser(request)
    const slot = params.slot as WalletSlot
    if (slot !== 'primary' && slot !== 'secondary') throw new ApiFail(404, 'NOT_FOUND', 'Tipo de carteira inexistente.')
    const body = await readJson<WalletInput>(request)
    const parsed = walletSchema.safeParse({ ...body, ens: body.ens ?? '' })
    if (!parsed.success) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Revise os dados da carteira.', zodFieldErrors(parsed.error))
    }
    const data = parsed.data
    const address = data.address.toLowerCase()

    for (const [ownerId, wallets] of Object.entries(db.state.wallets)) {
      if (ownerId === user.id) continue
      if ([wallets.primary, wallets.secondary].some((w) => w?.address.toLowerCase() === address)) {
        throw new ApiFail(409, 'ADDRESS_IN_USE', 'Este endereço já está vinculado a outro colecionador.', {
          address: 'Endereço já vinculado a outra conta.',
        })
      }
    }
    const mine = walletsOf(user.id)
    const other = slot === 'primary' ? mine.secondary : mine.primary
    if (other && other.address.toLowerCase() === address) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'As carteiras principal e secundária devem ser diferentes.', {
        address: 'Use um endereço diferente da outra carteira.',
      })
    }

    const record: WalletRecord = {
      id: mine[slot]?.id ?? db.nextId('wal'),
      slot,
      label: data.label,
      address: data.address,
      network: data.network,
      type: data.type,
      ens: data.ens ? data.ens : null,
      updatedAt: new Date().toISOString(),
    }
    mine[slot] = record
    db.save()
    return HttpResponse.json(toWallet(record))
  }),

  /** Simula a conexão com a extensão/app da carteira. */
  route('post', '/wallet-sessions', async ({ request }) => {
    const { user } = requireUser(request)
    const body = await readJson<ConnectWalletInput>(request)
    const mine = walletsOf(user.id)
    const wallet = [mine.primary, mine.secondary].find((w) => w?.id === body.walletId)
    if (!wallet) throw new ApiFail(403, 'FORBIDDEN', 'Esta carteira não pertence à sua conta.')
    if (activeScenario().walletRejected) {
      throw new ApiFail(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira. Tente novamente ou escolha outra carteira.')
    }
    // Uma sessão ativa por usuário.
    for (const ws of Object.values(db.state.walletSessions)) {
      if (ws.userId === user.id) ws.status = 'disconnected'
    }
    const record = {
      id: db.nextId('wss'),
      userId: user.id,
      walletId: wallet.id,
      provider: body.provider,
      network: body.network,
      status: 'connected' as const,
      connectedAt: new Date().toISOString(),
    }
    db.state.walletSessions[record.id] = record
    db.save()
    return HttpResponse.json(toWalletSession(record), { status: 201 })
  }),

  route('delete', '/wallet-sessions/:id', ({ request, params }) => {
    const { user } = requireUser(request)
    const record = db.state.walletSessions[params.id]
    if (!record || record.userId !== user.id) throw new ApiFail(404, 'NOT_FOUND', 'Sessão de carteira não encontrada.')
    record.status = 'disconnected'
    db.save()
    return new HttpResponse(null, { status: 204 })
  }),
]
