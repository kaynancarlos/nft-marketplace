import type { ServerEvent } from '@/api/contracts'

/**
 * Barramento entre as regras de negócio do mock e o servidor Socket.IO simulado.
 * Toda mudança de dados que gera evento passa por aqui — assim REST e eventos
 * sempre refletem o mesmo estado.
 */

type Publisher = (event: ServerEvent, toUserId?: string) => void

let publisher: Publisher = () => {}
const history: { event: ServerEvent; toUserId?: string }[] = []

export function setPublisher(fn: Publisher) {
  publisher = fn
}

export function publish(event: ServerEvent, toUserId?: string) {
  history.push({ event, toUserId })
  if (history.length > 50) history.shift()
  publisher(event, toUserId)
}

/** Reenvia exatamente o último evento (mesmo eventId/versão) — simula duplicata. */
export function replayLast() {
  const last = history.at(-1)
  if (last) publisher(last.event, last.toUserId)
  return last?.event ?? null
}

export function lastEventFor(resourceId: string) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].event.resource.id === resourceId) return history[i]
  }
  return null
}

/** Envia sem registrar no histórico (para eventos "antigos" fabricados). */
export function publishRaw(event: ServerEvent, toUserId?: string) {
  publisher(event, toUserId)
}
