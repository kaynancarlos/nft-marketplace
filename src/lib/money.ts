import Big from 'big.js'

/**
 * Aritmética de ETH com precisão decimal. Nunca use Number/parseFloat em valores
 * monetários: 0.1 + 0.2 !== 0.3 em ponto flutuante.
 */
Big.DP = 18
Big.RM = Big.roundHalfUp
Big.NE = -21
Big.PE = 21

export type Decimal = string

const DECIMAL_RE = /^\d+(\.\d+)?$/

export function isDecimal(value: unknown): value is Decimal {
  return typeof value === 'string' && DECIMAL_RE.test(value)
}

export function normalize(value: Decimal): Decimal {
  return new Big(value).toString()
}

export function add(...values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Big(0)).toString()
}

export function sub(a: Decimal, b: Decimal): Decimal {
  return new Big(a).minus(b).toString()
}

export function mul(a: Decimal, quantity: number): Decimal {
  if (!Number.isInteger(quantity)) throw new Error('Quantidade deve ser inteira')
  return new Big(a).times(quantity).toString()
}

/** Percentual com arredondamento para 6 casas (precisão de exibição/cobrança). */
export function percentOf(a: Decimal, percent: number): Decimal {
  return new Big(a).times(percent).div(100).round(6, Big.roundHalfUp).toString()
}

export function min(a: Decimal, b: Decimal): Decimal {
  return new Big(a).lt(b) ? a : b
}

export function max(a: Decimal, b: Decimal): Decimal {
  return new Big(a).gt(b) ? a : b
}

export function compare(a: Decimal, b: Decimal): -1 | 0 | 1 {
  return new Big(a).cmp(b) as -1 | 0 | 1
}

export function isZero(a: Decimal): boolean {
  return new Big(a).eq(0)
}

/**
 * Formata para exibição mantendo todas as casas significativas
 * (no mínimo `minDecimals`). Ex.: "26.846" → "26.846", "2.4" → "2.40".
 */
export function formatEth(value: Decimal, minDecimals = 2): string {
  const fixed = new Big(value).toFixed()
  const [int, frac = ''] = fixed.split('.')
  const trimmed = frac.replace(/0+$/, '')
  const fraction = trimmed.padEnd(minDecimals, '0')
  return fraction ? `${int}.${fraction}` : int
}

export function formatEthWithUnit(value: Decimal): string {
  return `${formatEth(value)} ETH`
}

/** Formato do filtro de preço do Figma: "0,02". */
export function formatEthBr(value: Decimal): string {
  return formatEth(value).replace('.', ',')
}
