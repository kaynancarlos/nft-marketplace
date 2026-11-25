import type { ReactNode } from 'react'
import { AlertTriangle, RotateCcw, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ErrorState({
  title = 'Não foi possível carregar',
  message,
  onRetry,
  retrying,
  className,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-10 text-center', className)}>
      <AlertTriangle className="size-8 text-primary" aria-hidden />
      <h2 className="text-base font-bold">{title}</h2>
      {message && <p className="max-w-md text-sm text-muted">{message}</p>}
      {onRetry && (
        <Button onClick={onRetry} loading={retrying} variant="outline">
          {!retrying && <RotateCcw aria-hidden />}
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center">
      <SearchX className="size-8 text-primary" aria-hidden />
      <h2 className="text-base font-bold">{title}</h2>
      {message && <p className="max-w-md text-sm text-muted">{message}</p>}
      {action}
    </div>
  )
}
