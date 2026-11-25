import * as React from 'react'
import { cn } from '@/lib/utils'

/** Skeleton com shimmer (desativado com prefers-reduced-motion). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} {...props} />
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', className)}
      {...props}
    />
  )
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] bg-surface', className)} {...props} />
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      <span>{label}…</span>
    </span>
  )
}
