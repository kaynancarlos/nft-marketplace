import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Hash FNV-1a (32 bits) em hex — determinístico e barato. */
export function stableHash(input: unknown): string {
  const text = typeof input === 'string' ? input : stableStringify(input)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** JSON.stringify com chaves ordenadas (para hashes estáveis). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

export function safeStorage(kind: 'local' | 'session' = 'local'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readJson<T>(key: string, kind: 'local' | 'session' = 'local'): T | null {
  const raw = safeStorage(kind)?.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown, kind: 'local' | 'session' = 'local') {
  try {
    safeStorage(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage cheio ou bloqueado: ignora */
  }
}

export function removeKey(key: string, kind: 'local' | 'session' = 'local') {
  try {
    safeStorage(kind)?.removeItem(key)
  } catch {
    /* ignora */
  }
}
