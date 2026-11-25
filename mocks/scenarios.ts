/**
 * Cenários de rede e de negócio da API simulada.
 *
 * Seleção (por ordem de prioridade):
 *   1. ?scenario=<id> na URL (é persistido e removido da barra de endereço)
 *   2. localStorage["kurio:scenario"]
 *   3. VITE_MOCK_SCENARIO
 *   4. "default"
 *
 * Todos os cenários são determinísticos: a latência "variável" usa um PRNG com
 * semente fixa, e falhas "uma vez" ficam registradas em db.consumed (zeradas no reset).
 */

export type ScenarioId =
  | 'default'
  | 'fast'
  | 'slow'
  | 'variable'
  | 'out-of-order'
  | 'offline'
  | 'server-error'
  | 'flaky'
  | 'empty'
  | 'favorites-fail'
  | 'payment-rejected'
  | 'order-timeout'
  | 'price-change-at-checkout'
  | 'sold-out-at-checkout'
  | 'wallet-rejected'
  | 'short-session'

export interface FailureRule {
  method?: string
  pattern: RegExp
  status: number | 'network'
  code?: string
  message?: string
  /** Quantas vezes falhar antes de responder normalmente (padrão: sempre). */
  times?: number
}

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
  /** Latência em ms: fixa ou [mín, máx] (sorteada com semente fixa). */
  latency: number | [number, number]
  failures?: FailureRule[]
  emptyCatalog?: boolean
  outOfOrderCatalog?: boolean
  paymentOutcome?: 'confirmed' | 'rejected'
  /** Atraso da resposta de POST /orders na 1ª tentativa (o pedido já foi criado). */
  orderResponseDelayMs?: number
  priceChangeAtCheckout?: boolean
  soldOutAtCheckout?: boolean
  walletRejected?: boolean
  sessionTtlMs?: number
}

export const DEFAULT_SESSION_TTL_MS = 2 * 60 * 60 * 1000
export const PAYMENT_RESOLUTION_MS = 2500

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  default: {
    id: 'default',
    label: 'Padrão',
    description: 'Tudo funciona, latência realista (120–380 ms).',
    latency: [120, 380],
  },
  fast: {
    id: 'fast',
    label: 'Rápido (testes)',
    description: 'Sem latência. Usado pela suíte E2E.',
    latency: 0,
  },
  slow: {
    id: 'slow',
    label: 'Rede lenta',
    description: 'Todas as respostas levam 2,5 s (exibe skeletons).',
    latency: 2500,
  },
  variable: {
    id: 'variable',
    label: 'Latência variável',
    description: 'Latência sorteada entre 50 ms e 2 s (semente fixa).',
    latency: [50, 2000],
  },
  'out-of-order': {
    id: 'out-of-order',
    label: 'Respostas fora de ordem',
    description: 'Consultas do catálogo alternam 1,5 s e 100 ms: a resposta antiga chega depois da nova.',
    latency: 0,
    outOfOrderCatalog: true,
  },
  offline: {
    id: 'offline',
    label: 'Sem conexão',
    description: 'Toda chamada falha com erro de rede e o socket recusa conexão.',
    latency: 300,
    failures: [{ pattern: /\/api\//, status: 'network' }],
  },
  'server-error': {
    id: 'server-error',
    label: 'Erro 500 no catálogo',
    description: 'GET /api/nfts responde 500 sempre.',
    latency: 150,
    failures: [{ method: 'GET', pattern: /\/api\/nfts/, status: 500, code: 'INTERNAL', message: 'Falha interna ao consultar o catálogo.' }],
  },
  flaky: {
    id: 'flaky',
    label: 'Falha transitória',
    description: 'A primeira consulta do catálogo e do detalhe responde 503; as seguintes funcionam.',
    latency: 150,
    failures: [
      { method: 'GET', pattern: /\/api\/nfts(\?|$)/, status: 503, code: 'TRANSIENT', message: 'Serviço temporariamente indisponível.', times: 1 },
      { method: 'GET', pattern: /\/api\/nfts\/[^/?]+$/, status: 503, code: 'TRANSIENT', message: 'Serviço temporariamente indisponível.', times: 1 },
    ],
  },
  empty: {
    id: 'empty',
    label: 'Catálogo vazio',
    description: 'A listagem de NFTs não retorna resultados.',
    latency: 150,
    emptyCatalog: true,
  },
  'favorites-fail': {
    id: 'favorites-fail',
    label: 'Falha ao favoritar',
    description: 'PUT/DELETE de favoritos respondem 500 (testa o rollback otimista).',
    latency: 200,
    failures: [{ method: 'PUT', pattern: /\/api\/favorites\//, status: 500, code: 'INTERNAL', message: 'Não foi possível salvar o favorito.' }, { method: 'DELETE', pattern: /\/api\/favorites\//, status: 500, code: 'INTERNAL', message: 'Não foi possível remover o favorito.' }],
  },
  'payment-rejected': {
    id: 'payment-rejected',
    label: 'Pagamento recusado',
    description: 'Pedidos criados são recusados pela rede após ~2,5 s.',
    latency: 150,
    paymentOutcome: 'rejected',
  },
  'order-timeout': {
    id: 'order-timeout',
    label: 'Timeout após criar pedido',
    description: 'A 1ª resposta de POST /orders demora 15 s (o cliente desiste em 8 s); o retry com a mesma chave recupera o pedido.',
    latency: 150,
    orderResponseDelayMs: 15000,
  },
  'price-change-at-checkout': {
    id: 'price-change-at-checkout',
    label: 'Preço muda na compra',
    description: 'Na 1ª tentativa de compra o preço do primeiro item sobe e a API responde 409 QUOTE_OUTDATED.',
    latency: 150,
    priceChangeAtCheckout: true,
  },
  'sold-out-at-checkout': {
    id: 'sold-out-at-checkout',
    label: 'Edição esgota na compra',
    description: 'Na 1ª tentativa de compra a edição do primeiro item esgota (409 OUT_OF_STOCK).',
    latency: 150,
    soldOutAtCheckout: true,
  },
  'wallet-rejected': {
    id: 'wallet-rejected',
    label: 'Carteira recusa conexão',
    description: 'A simulação de conexão de carteira responde 409 WALLET_REJECTED.',
    latency: 300,
    walletRejected: true,
  },
  'short-session': {
    id: 'short-session',
    label: 'Sessão curta (60 s)',
    description: 'Sessões expiram 60 s após o login.',
    latency: 150,
    sessionTtlMs: 60_000,
  },
}

const STORAGE_KEY = 'kurio:scenario'

function isScenarioId(value: string | null | undefined): value is ScenarioId {
  return Boolean(value && value in SCENARIOS)
}

export function initScenarioFromUrl() {
  const url = new URL(window.location.href)
  const fromUrl = url.searchParams.get('scenario')
  if (isScenarioId(fromUrl)) {
    setScenario(fromUrl)
    url.searchParams.delete('scenario')
    window.history.replaceState(window.history.state, '', url.toString())
  }
}

export function activeScenarioId(): ScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isScenarioId(stored)) return stored
  } catch {
    /* ignora */
  }
  const fromEnv = import.meta.env.VITE_MOCK_SCENARIO as string | undefined
  return isScenarioId(fromEnv) ? fromEnv : 'default'
}

export function activeScenario(): Scenario {
  return SCENARIOS[activeScenarioId()]
}

export function setScenario(id: ScenarioId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignora */
  }
  failureCounters.clear()
}

export function sessionTtl() {
  return activeScenario().sessionTtlMs ?? DEFAULT_SESSION_TTL_MS
}

/* ---------- latência determinística ---------- */

let seedState = 0x9e3779b9
function nextRandom() {
  seedState |= 0
  seedState = (seedState + 0x6d2b79f5) | 0
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

let catalogCounter = 0

export function latencyFor(method: string, url: URL): number {
  const scenario = activeScenario()
  if (scenario.outOfOrderCatalog && method === 'GET' && url.pathname === '/api/nfts') {
    catalogCounter += 1
    return catalogCounter % 2 === 1 ? 1500 : 100
  }
  const { latency } = scenario
  if (typeof latency === 'number') return latency
  const [min, max] = latency
  return Math.round(min + nextRandom() * (max - min))
}

/* ---------- falhas ---------- */

const failureCounters = new Map<string, number>()

export function failureFor(method: string, url: URL): FailureRule | null {
  const scenario = activeScenario()
  for (const [index, rule] of (scenario.failures ?? []).entries()) {
    if (rule.method && rule.method !== method) continue
    if (!rule.pattern.test(url.pathname + url.search)) continue
    if (rule.times !== undefined) {
      const key = `${scenario.id}:${index}`
      const count = failureCounters.get(key) ?? 0
      if (count >= rule.times) continue
      failureCounters.set(key, count + 1)
    }
    return rule
  }
  return null
}

export function resetScenarioCounters() {
  failureCounters.clear()
  catalogCounter = 0
  seedState = 0x9e3779b9
}
