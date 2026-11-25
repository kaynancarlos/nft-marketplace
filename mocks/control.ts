import { add, isDecimal } from '@/lib/money'
import { db, findNft } from './db'
import { mutateNft, settleDueOrders } from './domain'
import { lastEventFor, publishRaw, replayLast } from './realtime/bus'
import { connectionCount, dropConnections } from './realtime/server'
import { activeScenarioId, resetScenarioCounters, SCENARIOS, setScenario, type ScenarioId } from './scenarios'

/**
 * Painel de controle da API simulada, exposto em `window.__kurio`.
 *
 * Usado pelo painel "Cenários" da demonstração e pelos testes Playwright.
 * Ele altera o ESTADO DO SERVIDOR simulado; a interface só fica sabendo das
 * mudanças pelos canais reais (REST via Axios e eventos via socket.io-client).
 */
export function createControl() {
  return {
    scenarios: Object.values(SCENARIOS).map(({ id, label, description }) => ({ id, label, description })),
    getScenario: () => activeScenarioId(),
    setScenario: (id: ScenarioId) => setScenario(id),

    /** Restaura integralmente o cenário conhecido (seed + flags). */
    reset() {
      db.reset()
      resetScenarioCounters()
      dropConnections(0)
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('kurio:') && key !== 'kurio:mockdb' && key !== 'kurio:scenario') localStorage.removeItem(key)
        }
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith('kurio:')) sessionStorage.removeItem(key)
        }
      } catch {
        /* ignora */
      }
    },

    /** Altera o preço de todas as edições de um NFT (padrão: +0.10 ETH). Emite nft.updated. */
    changePrice(nftId: string, delta = '0.10') {
      const nft = findNft(nftId)
      if (!nft) throw new Error(`NFT ${nftId} não existe`)
      if (!isDecimal(delta)) throw new Error('delta deve ser decimal positivo em string')
      mutateNft(nft, (n) => {
        for (const edition of n.editions) edition.price = add(edition.price, delta)
      })
      return nft.version
    },

    /** Define a disponibilidade de uma edição (ou de todas). Emite nft.updated. */
    setAvailability(nftId: string, available: number, editionId?: string) {
      const nft = findNft(nftId)
      if (!nft) throw new Error(`NFT ${nftId} não existe`)
      mutateNft(nft, (n) => {
        for (const edition of n.editions) {
          if (!editionId || edition.id === editionId) edition.available = available
        }
      })
      return nft.version
    },

    /** Reenvia o último evento sem alterações (duplicata: mesmo eventId e versão). */
    replayLastEvent: () => replayLast(),

    /** Envia um nft.updated ANTIGO (versão menor) com preço falso. O cliente deve ignorar. */
    emitStaleNftEvent(nftId: string) {
      const nft = findNft(nftId)
      if (!nft) throw new Error(`NFT ${nftId} não existe`)
      const last = lastEventFor(nftId)
      const staleVersion = Math.max(0, nft.version - 1)
      publishRaw({
        eventId: `stale_${db.nextEventId()}`,
        type: 'nft.updated',
        resource: { type: 'nft', id: nft.id },
        version: staleVersion,
        occurredAt: new Date(Date.now() - 60_000).toISOString(),
        data: {
          nftId: nft.id,
          name: nft.name,
          price: '0.01',
          previousPrice: '0.01',
          soldOut: false,
          editions: nft.editions.map((e) => ({ id: e.id, label: e.label, price: '0.01', available: 999 })),
        },
      })
      return { staleVersion, lastEventId: last?.event.eventId ?? null }
    },

    /** Derruba os sockets e recusa reconexões por `blockMs`. */
    dropSockets: (blockMs = 0) => dropConnections(blockMs),
    socketConnections: () => connectionCount(),

    /** Expira todas as sessões ativas (próxima chamada autenticada → 401 SESSION_EXPIRED). */
    expireSessions() {
      for (const session of Object.values(db.state.sessions)) session.expiresAt = Date.now() - 1
      db.save()
    },

    settleOrders: () => settleDueOrders(),

    snapshot: () => structuredClone(db.state),
  }
}

export type KurioMockControl = ReturnType<typeof createControl>
