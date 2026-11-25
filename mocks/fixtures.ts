import type { CategoryId, Edition, Network, Review, WalletProvider } from '@/api/contracts'
import { mul, percentOf, add } from '@/lib/money'

/**
 * Fixtures determinísticas. Tudo é gerado a partir de um PRNG com semente fixa,
 * então o mesmo cenário sempre produz o mesmo catálogo (essencial para os testes
 * de regressão visual e para a paginação/filtros previsíveis).
 */

export const FIXTURE_NOW = '2026-11-20T12:00:00.000Z'
/** NFTs listados a partir desta data aparecem em "Novos lançamentos". */
export const NEW_RELEASES_SINCE = '2026-10-15T00:00:00.000Z'

export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.0005',
}

export const MAX_PER_ORDER = 10

export interface NftRecord {
  id: string
  name: string
  tokenId: string
  image: string
  collection: string
  category: CategoryId
  network: Network
  compareAtPrice: string | null
  rarity: 'raro' | null
  trending: boolean
  listedAt: string
  description: string
  attributes: string[]
  editions: Edition[]
  rating: { average: number; count: number }
  version: number
}

export interface UserRecord {
  id: string
  displayName: string
  username: string
  email: string
  bio: string
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  createdAt: string
}

export interface WalletRecord {
  id: string
  slot: 'primary' | 'secondary'
  label: string
  address: string
  network: Network
  type: WalletProvider
  ens: string | null
  updatedAt: string
}

export interface CouponRecord {
  code: string
  label: string
  kind: 'percent' | 'fixed'
  value: string
  expiresAt: string
}

const IMAGES = {
  emerald: '/images/emerald-ape.webp',
  sage: '/images/sage-nomad.webp',
  ivory: '/images/ivory-baron.webp',
  golden: '/images/golden-beat.webp',
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CATEGORY_IDS: CategoryId[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]
const NETWORK_IDS: Network[] = ['ethereum', 'polygon', 'solana']

interface Seed {
  name: string
  number: string
  image: keyof typeof IMAGES
  price: string
  compareAt?: string
  collection: string
  category: CategoryId
  network: Network
  trending?: boolean
  rarity?: boolean
  editions?: ('1/1' | '1/10' | '1/50' | 'Aberta')[]
  soldOut?: ('1/1' | '1/10' | '1/50' | 'Aberta')[] | 'all'
  attributes: string[]
}

/** As 9 primeiras reproduzem os cards do Figma. */
const HANDPICKED: Seed[] = [
  { name: 'Emerald Ape', number: '042', image: 'emerald', price: '1.19', collection: 'Kurio Apes', category: 'arte-digital', network: 'ethereum', trending: true, attributes: ['Óculos', 'Esmeralda', 'Raro'], editions: ['1/1', '1/10', '1/50', 'Aberta'], soldOut: ['1/1'] },
  { name: 'Sage Nomad', number: '009', image: 'sage', price: '1.69', collection: 'Nomad Club', category: 'arte-digital', network: 'ethereum', trending: true, attributes: ['Chapéu', 'Moletom', 'Sereno'] },
  { name: 'Neon Vessel', number: '552', image: 'ivory', price: '1.99', compareAt: '2.29', collection: 'Baron Society', category: 'colecionaveis', network: 'polygon', rarity: true, attributes: ['Gola alta', 'Blazer', 'Neon'] },
  { name: 'Cosmic Bloom', number: '118', image: 'sage', price: '1.29', collection: 'Nomad Club', category: 'generativa', network: 'ethereum', attributes: ['Chapéu', 'Cósmico'] },
  { name: 'Violet Nomad', number: '314', image: 'sage', price: '1.39', collection: 'Nomad Club', category: 'arte-digital', network: 'polygon', trending: true, attributes: ['Violeta', 'Moletom'], editions: ['1/1', '1/10', '1/50'] },
  { name: 'Ivory Baron', number: '088', image: 'ivory', price: '1.79', collection: 'Baron Society', category: 'arte-3d', network: 'ethereum', rarity: true, attributes: ['Marfim', 'Brinco', 'Raro'] },
  { name: 'Golden Beat', number: '207', image: 'golden', price: '0.99', collection: 'Golden Frequencies', category: 'musica', network: 'solana', trending: true, attributes: ['Fones', 'Dourado'] },
  { name: 'Golden Frequency', number: '071', image: 'golden', price: '0.59', collection: 'Golden Frequencies', category: 'musica', network: 'solana', attributes: ['Fones', 'Frequência'] },
  { name: 'Golden Signal', number: '160', image: 'golden', price: '0.39', collection: 'Golden Frequencies', category: 'musica', network: 'polygon', attributes: ['Fones', 'Sinal'] },
  { name: 'Lunar Echo', number: '777', image: 'ivory', price: '3.40', collection: 'Baron Society', category: 'colecionaveis', network: 'ethereum', attributes: ['Lunar', 'Esgotado'], editions: ['1/1', '1/10'], soldOut: 'all' },
]

const ADJECTIVES = ['Amber', 'Velvet', 'Crimson', 'Silent', 'Hidden', 'Rustic', 'Solar', 'Copper', 'Frost', 'Echo', 'Prism', 'Midnight', 'Desert', 'Royal', 'Wild', 'Quantum']
const NOUNS = ['Ape', 'Nomad', 'Baron', 'Beat', 'Monk', 'Drifter', 'Pilot', 'Scholar', 'Ranger', 'Dreamer', 'Signal', 'Vessel']
const IMAGE_BY_NOUN: Record<string, keyof typeof IMAGES> = {
  Ape: 'emerald',
  Nomad: 'sage',
  Baron: 'ivory',
  Beat: 'golden',
  Monk: 'sage',
  Drifter: 'emerald',
  Pilot: 'golden',
  Scholar: 'ivory',
  Ranger: 'emerald',
  Dreamer: 'sage',
  Signal: 'golden',
  Vessel: 'ivory',
}
const COLLECTION_BY_IMAGE: Record<keyof typeof IMAGES, string> = {
  emerald: 'Kurio Apes',
  sage: 'Nomad Club',
  ivory: 'Baron Society',
  golden: 'Golden Frequencies',
}
const TRAITS = ['Óculos', 'Chapéu', 'Fones', 'Brinco', 'Moletom', 'Blazer', 'Colar', 'Dourado', 'Esmeralda', 'Neon', 'Vintage', 'Holográfico']

function generateSeeds(count: number): Seed[] {
  const rand = mulberry32(20261124)
  const seeds: Seed[] = []
  const used = new Set(HANDPICKED.map((s) => `${s.name}`))
  let i = 0
  while (seeds.length < count) {
    const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(rand() * NOUNS.length)]
    const name = `${adjective} ${noun}`
    i++
    if (used.has(name)) continue
    used.add(name)
    const image = IMAGE_BY_NOUN[noun]
    // Faixa de preço do Figma: 0,02 – 12,30 ETH
    const cents = Math.round(2 + Math.pow(rand(), 2.2) * 1228)
    const price = (cents / 100).toFixed(2)
    const trait1 = TRAITS[Math.floor(rand() * TRAITS.length)]
    const trait2 = TRAITS[Math.floor(rand() * TRAITS.length)]
    seeds.push({
      name,
      number: String(Math.floor(rand() * 900) + 100),
      image,
      price,
      compareAt: rand() > 0.85 ? (Number(price) * 1.15).toFixed(2) : undefined,
      collection: COLLECTION_BY_IMAGE[image],
      category: CATEGORY_IDS[(i * 7 + Math.floor(rand() * 9)) % CATEGORY_IDS.length],
      network: NETWORK_IDS[Math.floor(rand() * NETWORK_IDS.length)],
      trending: rand() > 0.75,
      rarity: rand() > 0.88,
      attributes: Array.from(new Set([trait1, trait2])),
      soldOut: rand() > 0.9 ? ['1/1'] : undefined,
    })
  }
  return seeds
}

const EDITION_MULTIPLIER: Record<string, number> = { '1/1': 300, '1/10': 150, '1/50': 100, Aberta: 100 }
const EDITION_SUPPLY: Record<string, number | null> = { '1/1': 1, '1/10': 10, '1/50': 50, Aberta: null }

function buildEditions(seed: Seed, id: string, rand: () => number): Edition[] {
  const labels = seed.editions ?? ['1/1', '1/10', '1/50', 'Aberta']
  return labels.map((label) => {
    const supply = EDITION_SUPPLY[label]
    const soldOut = seed.soldOut === 'all' || (Array.isArray(seed.soldOut) && seed.soldOut.includes(label))
    let available: number
    if (soldOut) available = 0
    else if (supply === null) available = 500
    else if (supply === 1) available = 1
    else available = Math.max(1, Math.floor(supply * (0.4 + rand() * 0.6)))
    return {
      id: `${id}--${label.replace('/', '-').toLowerCase()}`,
      label,
      supply,
      available,
      price: percentOf(seed.price, EDITION_MULTIPLIER[label]),
    }
  })
}

function slug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildNfts(): NftRecord[] {
  const rand = mulberry32(42)
  const seeds = [...HANDPICKED, ...generateSeeds(46)]
  const base = new Date(FIXTURE_NOW).getTime()
  return seeds.map((seed, index) => {
    const id = slug(`${seed.name}-${seed.number}`)
    const listedAt = new Date(base - index * 2.3 * 24 * 3600 * 1000).toISOString()
    return {
      id,
      name: `${seed.name} #${seed.number}`,
      tokenId: `#${seed.number.padStart(4, '0')}`,
      image: IMAGES[seed.image],
      collection: seed.collection,
      category: seed.category,
      network: seed.network,
      compareAtPrice: seed.compareAt ?? null,
      rarity: seed.rarity ? 'raro' : null,
      trending: Boolean(seed.trending),
      listedAt,
      description: `${seed.name} #${seed.number} é uma obra digital da coleção ${seed.collection}, verificada na ${networkLabel(seed.network)}, com arte desbloqueável e acesso para colecionadores.`,
      attributes: seed.attributes,
      editions: buildEditions(seed, id, rand),
      rating: { average: Math.round((4 + rand()) * 10) / 10, count: 5 + Math.floor(rand() * 40) },
      version: 1,
    }
  })
}

export function networkLabel(network: Network) {
  return network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'
}

export function buildReviews(nftId: string): Review[] {
  return [
    { id: `${nftId}-r1`, author: 'marina.eth', rating: 5, comment: 'Arte impecável e procedência verificada. A entrega na carteira foi imediata.', createdAt: '2026-10-02T14:00:00.000Z' },
    { id: `${nftId}-r2`, author: 'colecionador_br', rating: 5, comment: 'Os detalhes em alta resolução valem cada ETH.', createdAt: '2026-10-11T09:30:00.000Z' },
    { id: `${nftId}-r3`, author: 'pixelmonk', rating: 4, comment: 'Ótima peça; gostaria de mais utilidades para quem segura a edição.', createdAt: '2026-10-20T19:10:00.000Z' },
  ]
}

/**
 * Usuários de demonstração. Senha de ambos: Kurio@123
 * Armazenamos apenas SHA-256(salt + ":" + senha); nunca a senha em claro.
 */
export function buildUsers(): UserRecord[] {
  return [
    {
      id: 'usr_ana',
      displayName: 'Ana Colecionadora',
      username: 'ana.kurio',
      email: 'ana@kurio.dev',
      bio: 'Coleciono arte generativa e retratos digitais.',
      avatarUrl: null,
      passwordSalt: 'ana-salt-7f3c',
      passwordHash: '9ab851f0f8c0a9e704b40a7261872451efd2fa17187f01ff21ba7dc09ef28750',
      createdAt: '2026-01-10T10:00:00.000Z',
    },
    {
      id: 'usr_bruno',
      displayName: 'Bruno Mint',
      username: 'bruno.mint',
      email: 'bruno@kurio.dev',
      bio: 'Fã de música on-chain.',
      avatarUrl: null,
      passwordSalt: 'bruno-salt-91ad',
      passwordHash: '36f3199e26369b3f7457c4ad79a7ba4a57a8ff0196133eb3ae6c85b58ab4988c',
      createdAt: '2026-03-02T10:00:00.000Z',
    },
  ]
}

export function buildWallets(): Record<string, { primary: WalletRecord | null; secondary: WalletRecord | null }> {
  return {
    usr_ana: {
      primary: {
        id: 'wal_ana_primary',
        slot: 'primary',
        label: 'Principal',
        address: '0xA91F3c2bD4e5F6a7B8c9D0e1F2a3B4c5D6e7E82C',
        network: 'ethereum',
        type: 'metamask',
        ens: 'ana.kurio',
        updatedAt: '2026-06-01T10:00:00.000Z',
      },
      secondary: {
        id: 'wal_ana_secondary',
        slot: 'secondary',
        label: 'Reserva',
        address: '0x5B7d9E1f3A5c7E9b1D3f5A7c9E1b3D5f7A9c1E3b',
        network: 'polygon',
        type: 'coinbase',
        ens: 'nova.kurio',
        updatedAt: '2026-06-01T10:00:00.000Z',
      },
    },
    usr_bruno: {
      primary: {
        id: 'wal_bruno_primary',
        slot: 'primary',
        label: 'Principal',
        address: '0x1C3e5A7b9D1f3C5e7A9b1D3f5C7e9A1b3D5f7C90',
        network: 'ethereum',
        type: 'walletconnect',
        ens: null,
        updatedAt: '2026-06-01T10:00:00.000Z',
      },
      secondary: null,
    },
  }
}

export function buildCoupons(): CouponRecord[] {
  return [
    { code: 'KURIO10', label: 'Cupom KURIO10 (10%)', kind: 'percent', value: '10', expiresAt: '2099-12-31T23:59:59.000Z' },
    { code: 'LANCAMENTO', label: 'Desconto do lançamento', kind: 'fixed', value: '0.05', expiresAt: '2099-12-31T23:59:59.000Z' },
    { code: 'VERAO2024', label: 'Cupom de verão', kind: 'percent', value: '15', expiresAt: '2024-03-01T00:00:00.000Z' },
  ]
}

/** Pedido confirmado de outro usuário: usado no cenário de acesso não autorizado. */
export function buildOrders(nfts: NftRecord[]) {
  const nft = nfts.find((n) => n.id === 'golden-beat-207')!
  const edition = nft.editions.find((e) => e.label === '1/50')!
  const lineTotal = mul(edition.price, 2)
  const fee = NETWORK_FEES.ethereum
  return [
    {
      id: 'ord_bruno_0001',
      userId: 'usr_bruno',
      status: 'confirmed' as const,
      version: 2,
      createdAt: '2026-11-01T15:00:00.000Z',
      updatedAt: '2026-11-01T15:00:03.000Z',
      network: 'ethereum' as Network,
      wallet: { label: 'Principal', address: '0x1C3e5A7b9D1f3C5e7A9b1D3f5C7e9A1b3D5f7C90', provider: 'walletconnect' as WalletProvider },
      items: [
        {
          nftId: nft.id,
          editionId: edition.id,
          name: nft.name,
          image: nft.image,
          tokenId: nft.tokenId,
          editionLabel: edition.label,
          quantity: 2,
          unitPrice: edition.price,
          lineTotal,
        },
      ],
      subtotal: lineTotal,
      discount: '0',
      networkFee: fee,
      total: add(lineTotal, fee),
      coupon: null,
      txHash: '0x7b1e0f4c2a9d8e6b5c3a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c',
      failureReason: null,
      collector: { displayName: 'Bruno Mint', username: 'bruno.mint', email: 'bruno@kurio.dev' },
      resolveAt: null as number | null,
      outcome: 'confirmed' as 'confirmed' | 'rejected',
    },
  ]
}
