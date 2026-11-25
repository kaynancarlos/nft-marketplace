import { useRealtimeState } from '@/realtime/realtimeStore'
import { cn } from '@/lib/utils'

const LABELS = {
  idle: 'Tempo real inativo',
  connecting: 'Conectando ao tempo real',
  connected: 'Tempo real conectado',
  reconnecting: 'Reconectando ao tempo real',
  offline: 'Tempo real indisponível',
} as const

/** Indicador discreto do estado do Socket.IO (texto + forma, não só cor). */
export function ConnectionIndicator() {
  const { status } = useRealtimeState()
  const ok = status === 'connected'
  return (
    <span
      className="hidden items-center gap-1.5 text-[11px] text-subtle lg:inline-flex"
      data-testid="realtime-status"
      data-status={status}
      title={LABELS[status]}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-2',
          ok ? 'rounded-full bg-success' : 'rotate-45 bg-primary',
          status === 'reconnecting' && 'animate-pulse',
        )}
      />
      <span className="sr-only">{LABELS[status]}</span>
      <span aria-hidden>{ok ? 'ao vivo' : status === 'reconnecting' ? 'reconectando' : status === 'offline' ? 'offline' : ''}</span>
    </span>
  )
}
