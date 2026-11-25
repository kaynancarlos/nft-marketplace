import { ws } from 'msw'
import type { ServerEvent } from '@/api/contracts'
import { settleDueOrders } from '../domain'
import { userIdFromToken } from '../http'
import { activeScenarioId } from '../scenarios'
import { setPublisher } from './bus'

/**
 * Servidor Socket.IO simulado sobre a API de WebSocket do MSW (`ws.link`).
 *
 * O MSW intercepta o WebSocket aberto pelo socket.io-client. Aqui falamos o
 * protocolo real (Engine.IO v4 + Socket.IO v5, apenas transporte websocket):
 *
 *   servidor → "0{sid,pingInterval,...}"   handshake Engine.IO (OPEN)
 *   cliente  → "40"                        CONNECT no namespace "/"
 *   servidor → "40{sid}"                   CONNECT confirmado
 *   servidor → "42[evento, payload]"       EVENT
 *   servidor → "2" / cliente → "3"         PING / PONG (heartbeat)
 *
 * Limitações (documentadas no ARCHITECTURE.md): só transporte websocket
 * (sem long-polling), só namespace "/", sem binários e sem ACKs.
 */

// Padrão em string com curinga (formato documentado pelo MSW). Casa com
// wss://realtime.kurio.mock/socket.io/?EIO=4&transport=websocket&token=...
export const SOCKET_URL_PATTERN = 'wss://realtime.kurio.mock/*'

const realtime = ws.link(SOCKET_URL_PATTERN)

const PING_INTERVAL = 25_000
const PING_TIMEOUT = 20_000

interface Connection {
  sid: string
  userId: string | null
  connected: boolean
  send: (data: string) => void
  close: () => void
  pingTimer: ReturnType<typeof setInterval> | null
}

const connections = new Set<Connection>()
let refuseUntil = 0

function randomSid() {
  return Math.random().toString(36).slice(2, 12)
}

function cleanup(conn: Connection) {
  if (conn.pingTimer) clearInterval(conn.pingTimer)
  conn.pingTimer = null
  conn.connected = false
  connections.delete(conn)
}

export const realtimeHandler = realtime.addEventListener('connection', ({ client }) => {
  // Cenário offline ou "queda" forçada: recusa a conexão — o socket.io-client
  // entra no ciclo de reconexão automática com backoff.
  if (activeScenarioId() === 'offline' || Date.now() < refuseUntil) {
    queueMicrotask(() => client.close())
    return
  }

  const token = client.url.searchParams.get('token')
  const conn: Connection = {
    sid: randomSid(),
    userId: userIdFromToken(token),
    connected: false,
    send: (data) => client.send(data),
    close: () => client.close(),
    pingTimer: null,
  }
  connections.add(conn)

  // OPEN do Engine.IO: só depois que o WebSocket do cliente estiver aberto.
  // Se enviarmos antes, o transporte do cliente ainda não está "writable" e o
  // CONNECT ("40") fica preso no buffer até estourar o timeout.
  let opened = false
  const sendOpen = () => {
    if (opened) return
    opened = true
    client.send(
      `0${JSON.stringify({ sid: conn.sid, upgrades: [], pingInterval: PING_INTERVAL, pingTimeout: PING_TIMEOUT, maxPayload: 1_000_000 })}`,
    )
  }
  const socket = (client as unknown as { socket?: WebSocket }).socket
  if (socket && socket.readyState !== WebSocket.OPEN) {
    socket.addEventListener('open', () => setTimeout(sendOpen, 0), { once: true })
  }
  setTimeout(() => {
    if (!socket || socket.readyState === WebSocket.OPEN) sendOpen()
  }, 0)
  conn.pingTimer = setInterval(() => client.send('2'), PING_INTERVAL)

  client.addEventListener('message', (event) => {
    const packet = typeof event.data === 'string' ? event.data : ''
    if (packet === '3') return // PONG
    if (packet.startsWith('40')) {
      conn.connected = true
      client.send(`40${JSON.stringify({ sid: randomSid() })}`)
      // Ao (re)conectar, resolve pedidos que venceram enquanto o cliente estava fora.
      settleDueOrders()
      return
    }
    if (packet.startsWith('41')) {
      cleanup(conn)
      client.close()
      return
    }
    // "42[...]" de cliente → servidor: não há comandos do cliente nesta API.
  })

  client.addEventListener('close', () => cleanup(conn))
})

function deliver(event: ServerEvent, toUserId?: string) {
  const packet = `42${JSON.stringify([event.type, event])}`
  for (const conn of connections) {
    if (!conn.connected) continue
    // Eventos de pedido só vão para o dono — nunca vazam entre usuários.
    if (toUserId && conn.userId !== toUserId) continue
    conn.send(packet)
  }
}

setPublisher(deliver)

/** Derruba todas as conexões e recusa novas por `blockMs`. */
export function dropConnections(blockMs = 0) {
  refuseUntil = Date.now() + blockMs
  for (const conn of [...connections]) {
    cleanup(conn)
    conn.close()
  }
}

export function connectionCount() {
  return [...connections].filter((c) => c.connected).length
}
