import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

interface FieldProps {
  id: string
  label: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  className?: string
  /** Label só para leitores de tela (o Figma usa placeholder nos formulários de login/cadastro). */
  hideLabel?: boolean
  /** Recebe as props de acessibilidade para aplicar no controle. */
  children: (control: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
    'aria-required': boolean | undefined
  }) => React.ReactNode
}

/**
 * Agrupa label + controle + dica + erro, associando tudo via id/aria-describedby
 * para leitores de tela. O erro é anunciado (role="alert") quando aparece.
 */
export function Field({ id, label, required, error, hint, className, hideLabel, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
        {required && (
          <span className="text-primary" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
