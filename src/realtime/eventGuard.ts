import type { ServerEvent } from '@/api/contracts'

/**
 * Garante que cada evento seja aplicado no máximo uma vez e em ordem:
 *  - duplicata (mesmo eventId) → descartada;
 *  - evento antigo (versão ≤ última aplicada para o recurso) → descartado.
 * Uma instância por sessão de socket: trocar de usuário descarta o histórico.
 */
export class EventGuard {
  private seen = new Set<string>()
  private order: string[] = []
  private versions = new Map<string, number>()

  constructor(private readonly capacity = 500) {}

  accept(event: ServerEvent): boolean {
    if (this.seen.has(event.eventId)) return false
    const key = `${event.resource.type}:${event.resource.id}`
    const current = this.versions.get(key) ?? 0
    if (event.version <= current) {
      this.remember(event.eventId)
      return false
    }
    this.versions.set(key, event.version)
    this.remember(event.eventId)
    return true
  }

  /** Registra a versão vista via REST (evita aplicar evento mais velho que o dado em cache). */
  observe(resourceType: 'nft' | 'order', id: string, version: number) {
    const key = `${resourceType}:${id}`
    if ((this.versions.get(key) ?? 0) < version) this.versions.set(key, version)
  }

  private remember(id: string) {
    this.seen.add(id)
    this.order.push(id)
    if (this.order.length > this.capacity) {
      const oldest = this.order.shift()
      if (oldest) this.seen.delete(oldest)
    }
  }
}
