import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, ScanLine, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '@/auth/authStore'
import { useCart } from '@/queries/cart'
import { cn } from '@/lib/utils'

/**
 * Barra inferior do mobile (frame "Mobile / Início" do Figma): fundo com cantos
 * superiores arredondados e um recorte côncavo no centro, onde fica o botão
 * circular. Os ícones não têm texto visível; o nome vai em aria-label.
 * O botão central (ícone de leitura de QR) leva às Carteiras: é onde se
 * conecta uma carteira, ação que no Web3 normalmente começa lendo um QR code.
 */

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useAuth()
  const { data: cart } = useCart()
  const count = cart?.itemCount ?? 0

  // Detalhe do NFT (frame mobile do Figma): a barra de compra ocupa o rodapé no lugar da navegação.
  if (pathname.startsWith('/nft/')) return null

  const item = (active: boolean) =>
    cn(
      'relative grid size-12 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-primary',
      active ? 'text-primary' : 'text-muted hover:text-foreground',
    )
  const icon = 'size-6'
  const isFavorites = pathname === '/account/favorites'
  const isWallets = pathname === '/account/wallets'
  const isCart = pathname === '/cart'
  const isProfile = pathname.startsWith('/account/profile') || pathname === '/login'

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-30 drop-shadow-[0_-6px_16px_rgba(0,0,0,0.45)] md:hidden">
      <div className="relative h-16">
        {/* Fundo: lateral esquerda + recorte central + lateral direita. */}
        <div aria-hidden className="absolute inset-0 flex">
          <div className="flex-1 rounded-tl-[28px] bg-surface" />
          <svg viewBox="0 0 140 64" className="h-16 w-[140px] shrink-0 fill-surface" preserveAspectRatio="none">
            <path d="M0 0H20C34 0 38 6 43 16C50 30 58 38 70 38C82 38 90 30 97 16C102 6 106 0 120 0H140V64H0Z" />
          </svg>
          <div className="flex-1 rounded-tr-[28px] bg-surface" />
        </div>

        <ul className="relative mx-auto grid h-full max-w-md grid-cols-5 items-center justify-items-center">
          <li>
            <Link to="/" aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined} className={item(pathname === '/')}>
              <Home className={icon} fill="currentColor" strokeWidth={1.5} aria-hidden />
            </Link>
          </li>
          <li>
            {user ? (
              <Link to="/account/favorites" aria-label="Favoritos" aria-current={isFavorites ? 'page' : undefined} className={item(isFavorites)}>
                <Heart className={icon} fill="currentColor" aria-hidden />
              </Link>
            ) : (
              <Link to="/login" search={{ redirect: '/account/favorites' }} aria-label="Favoritos" className={item(false)}>
                <Heart className={icon} fill="currentColor" aria-hidden />
              </Link>
            )}
          </li>
          <li className="relative self-start">
            <Link
              to="/account/wallets"
              aria-label="Carteiras: conectar carteira"
              aria-current={isWallets ? 'page' : undefined}
              className={cn(
                'absolute left-1/2 top-0 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-foreground shadow-lg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                isWallets && 'ring-2 ring-foreground/70',
              )}
            >
              <ScanLine className="size-6" strokeWidth={2} aria-hidden />
            </Link>
          </li>
          <li>
            <Link
              to="/cart"
              aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
              aria-current={isCart ? 'page' : undefined}
              className={item(isCart)}
            >
              <ShoppingCart className={icon} fill="currentColor" strokeWidth={1.5} aria-hidden />
              {count > 0 && (
                <span
                  className="absolute right-0.5 top-1 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-primary-foreground"
                  aria-hidden
                >
                  {count}
                </span>
              )}
            </Link>
          </li>
          <li>
            {user ? (
              <Link to="/account/profile" aria-label="Perfil" aria-current={isProfile ? 'page' : undefined} className={item(isProfile)}>
                <User className={icon} fill="currentColor" aria-hidden />
              </Link>
            ) : (
              <Link to="/login" aria-label="Entrar" aria-current={pathname === '/login' ? 'page' : undefined} className={item(isProfile)}>
                <User className={icon} fill="currentColor" aria-hidden />
              </Link>
            )}
          </li>
        </ul>
      </div>
      <div aria-hidden className="h-[env(safe-area-inset-bottom)] bg-surface" />
    </nav>
  )
}
