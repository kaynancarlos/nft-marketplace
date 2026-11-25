import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

/** Controle de quantidade inteira (Figma: botões circulares cobre). */
export function QuantityStepper({ value, min = 1, max, onChange, label, disabled, size = 'md' }: Props) {
  const btn = cn(
    'grid place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:bg-elevated disabled:text-subtle',
    size === 'sm' ? 'size-6 [&_svg]:size-3' : 'size-7 [&_svg]:size-3.5',
  )
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus aria-hidden />
      </button>
      <output className="min-w-6 text-center text-sm tabular-nums" aria-live="polite" aria-label={`Quantidade de ${label}`}>
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus aria-hidden />
      </button>
    </div>
  )
}
