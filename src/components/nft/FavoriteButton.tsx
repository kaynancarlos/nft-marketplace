import { Heart } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/auth/authStore'
import { useFavorites, useToggleFavorite } from '@/queries/favorites'
import { cn } from '@/lib/utils'

interface Props {
  nftId: string
  name: string
  variant?: 'icon' | 'button'
  className?: string
}

/**
 * Favoritar exige autenticação: visitantes são levados ao login e voltam
 * para a mesma página. Para usuários logados a mudança é otimista.
 */
export function FavoriteButton({ nftId, name, variant = 'icon', className }: Props) {
  const { user } = useAuth()
  const { data: favorites } = useFavorites()
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const active = Boolean(favorites?.has(nftId))

  function onClick() {
    if (!user) {
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    toggle.mutate({ nftId, favorite: !active, name })
  }

  const label = active ? `Remover ${name} dos favoritos` : `Favoritar ${name}`

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        data-testid="favorite-button"
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-md border border-primary/70 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10',
          className,
        )}
      >
        <Heart className={cn('size-4', active && 'fill-primary')} aria-hidden />
        {active ? 'Favoritado' : 'Favoritar'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      data-testid="favorite-button"
      className={cn(
        'grid size-8 place-items-center rounded-md border border-line bg-background/80 text-foreground backdrop-blur transition-colors hover:text-primary',
        className,
      )}
    >
      <Heart className={cn('size-4', active && 'fill-primary text-primary')} aria-hidden />
    </button>
  )
}
