import { useState } from 'react'
import { isApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { useApplyCoupon, useRemoveCoupon } from '@/queries/cart'

export function CouponForm({ appliedCode, compact }: { appliedCode: string | null; compact?: boolean }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs" data-testid="coupon-applied">
        <span>
          Cupom <strong className="text-primary">{appliedCode}</strong> aplicado
        </span>
        <Button variant="link" size="sm" onClick={() => remove.mutate()} loading={remove.isPending} className="text-xs">
          Remover
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        if (!code.trim()) {
          setError('Informe um código promocional.')
          return
        }
        apply.mutate(code.trim(), {
          onSuccess: () => setCode(''),
          onError: (err) => setError(isApiError(err) ? (err.fields.code ?? err.message) : 'Não foi possível aplicar o cupom.'),
        })
      }}
    >
      <label htmlFor="coupon" className={compact ? 'sr-only' : 'mb-1.5 block text-xs font-bold'}>
        Código promocional
      </label>
      <div className="flex">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          autoComplete="off"
          className="h-9 min-w-0 flex-1 rounded-l-md border border-r-0 border-line bg-surface-2 px-3 text-xs placeholder:text-subtle aria-[invalid=true]:border-danger"
        />
        <Button type="submit" size="sm" className="h-9 rounded-l-none" loading={apply.isPending}>
          Aplicar
        </Button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  )
}
