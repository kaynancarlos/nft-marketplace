import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '@/auth/authStore'
import { useCart } from '@/queries/cart'
import { cn } from '@/lib/utils'

/** Barra inferior do mobile (frame "Mobile / Início"). */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useAuth()
  const { data: cart } = useCart()
  const count = cart?.itemCount ?? 0
  const item = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]'

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-end">
        <li className="flex flex-1">
          <Link to="/" className={cn(item, pathname === '/' ? 'text-primary' : 'text-foreground')} aria-current={pathname === '/' ? 'page' : undefined}>
            <Home className="size-5" aria-hidden />
            Início
          </Link>
        </li>
        <li className="flex flex-1">
          {user ? (
            <Link to="/account/favorites" className={cn(item, pathname === '/account/favorites' ? 'text-primary' : 'text-foreground')}>
              <Heart className="size-5" aria-hidden />
              Favoritos
            </Link>
          ) : (
            <Link to="/login" search={{ redirect: '/account/favorites' }} className={cn(item, 'text-foreground')}>
              <Heart className="size-5" aria-hidden />
              Favoritos
            </Link>
          )}
        </li>
        <li className="flex flex-1 justify-center">
          <Link
            to="/cart"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            className="relative -mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <ShoppingCart className="size-6" aria-hidden />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background" aria-hidden>
                {count}
              </span>
            )}
          </Link>
        </li>
        <li className="flex flex-1">
          {user ? (
            <Link to="/account/profile" className={cn(item, pathname.startsWith('/account/profile') ? 'text-primary' : 'text-foreground')}>
              <User className="size-5" aria-hidden />
              Perfil
            </Link>
          ) : (
            <Link to="/login" className={cn(item, pathname === '/login' ? 'text-primary' : 'text-foreground')}>
              <User className="size-5" aria-hidden />
              Entrar
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )
}
