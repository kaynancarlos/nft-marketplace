import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-foreground placeholder:text-subtle transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-60 aria-[invalid=true]:border-danger'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(inputClass, className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputClass, 'min-h-28 py-2 h-auto resize-y', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

/** Select nativo estilizado: acessível por padrão (teclado, leitores de tela, mobile). */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputClass, 'appearance-auto pr-8', className)} {...props}>
      {children}
    </select>
  ),
)
NativeSelect.displayName = 'NativeSelect'
