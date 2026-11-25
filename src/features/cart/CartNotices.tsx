import { AlertTriangle, X } from 'lucide-react'
import { realtimeStore, useRealtimeState } from '@/realtime/realtimeStore'

/** Avisos de alteração de preço/disponibilidade recebidos via Socket.IO. */
export function CartNotices() {
  const { notices } = useRealtimeState()
  return (
    <div role="status" aria-live="polite" className="space-y-2" data-testid="cart-notices">
      {notices.map((notice) => (
        <div key={notice.id} className="flex items-start gap-3 rounded-md border border-primary/60 bg-primary/10 px-4 py-3 text-xs">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="flex-1">{notice.message}</p>
          <button
            type="button"
            onClick={() => realtimeStore.dismiss(notice.id)}
            className="rounded p-0.5 hover:bg-primary/20"
            aria-label="Dispensar aviso"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
