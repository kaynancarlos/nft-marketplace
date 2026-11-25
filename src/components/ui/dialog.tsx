import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Dialog/Sheet do shadcn/ui (Radix): prende o foco dentro do conteúdo,
 * fecha com Esc e devolve o foco ao gatilho ao fechar.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-in', className)}
    {...props}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

interface ContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean
  closeLabel?: string
}

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, ContentProps>(
  ({ className, children, hideClose, closeLabel = 'Fechar', ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-2xl',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-md p-1.5 text-primary hover:bg-surface-2"
            aria-label={closeLabel}
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
)
DialogContent.displayName = 'DialogContent'

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-bold', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

/** Sheet (drawer) — mesmo primitivo, ancorado na lateral/rodapé. */
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ContentProps & { side?: 'left' | 'right' | 'bottom' }
>(({ className, children, side = 'left', closeLabel = 'Fechar', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 overflow-y-auto border-line bg-surface p-5 shadow-2xl',
        side === 'left' && 'inset-y-0 left-0 w-[86%] max-w-sm border-r',
        side === 'right' && 'inset-y-0 right-0 w-[86%] max-w-sm border-l',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 rounded-md p-1.5 text-primary hover:bg-surface-2"
        aria-label={closeLabel}
      >
        <X className="size-4" aria-hidden />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
SheetContent.displayName = 'SheetContent'
