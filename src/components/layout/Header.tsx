import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, LogIn, LogOut, Search, ShoppingCart, User, Wallet, X } from 'lucide-react'
import { useAuth } from '@/auth/authStore'
import { Button } from '@/components/ui/button'
import { useCart } from '@/queries/cart'
import { useLogout } from '@/queries/auth'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { ConnectionIndicator } from './ConnectionIndicator'

const NAV = [
  { label: 'Início', hash: undefined, section: null, match: (p: string) => p === '/' },
  { label: 'Mercado', hash: 'catalogo', section: null, match: (p: string) => /^\/(nft|cart|checkout|orders)/.test(p) },
  { label: 'Criadores', hash: undefined, section: 'criadores', match: (p: string) => p === '/em-breve/criadores' },
  { label: 'Aprenda', hash: undefined, section: 'aprenda', match: (p: string) => p === '/em-breve/aprenda' },
]

function navClass(active: boolean) {
  return cn(
    'relative inline-block py-6 transition-colors hover:text-primary',
    active ? 'text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-foreground',
  )
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useAuth()
  const { data: cart } = useCart()
  const count = cart?.itemCount ?? 0

  // No mobile o Figma não tem cabeçalho: a navegação fica na barra inferior.
  return (
    <header className="mx-auto hidden w-full max-w-[1264px] px-4 md:block md:px-8">
      <div className="flex h-16 items-center justify-between gap-4 border-b border-line md:h-[76px]">
        <Logo />
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8 text-[15px]">
            {NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <li key={item.label}>
                  {item.section ? (
                    <Link
                      to="/em-breve/$section"
                      params={{ section: item.section }}
                      aria-current={active ? 'page' : undefined}
                      className={navClass(active)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <Link to="/" hash={item.hash} aria-current={active ? 'page' : undefined} className={navClass(active)}>
                      {item.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <ConnectionIndicator />
          <HeaderSearch />
          <Link
            to="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-2"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <ShoppingCart className="size-5" aria-hidden />
            <span
              data-testid="cart-count"
              className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground"
              aria-hidden
            >
              {count}
            </span>
          </Link>
          {user ? (
            <UserMenu />
          ) : (
            <Button asChild variant="default" size="sm" className="hidden h-8 md:inline-flex">
              <Link to="/login" search={{ redirect: pathname === '/login' ? undefined : pathname }}>
                <LogIn aria-hidden />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden size-10 items-center justify-center rounded-md hover:bg-surface-2 md:inline-flex"
        aria-label="Abrir busca"
      >
        <Search className="size-5" aria-hidden />
      </button>
    )
  }

  return (
    <form
      role="search"
      className="hidden items-center gap-1 md:flex"
      onSubmit={(e) => {
        e.preventDefault()
        void navigate({ to: '/', search: { q: value.trim() || undefined }, hash: 'catalogo' })
        setOpen(false)
      }}
    >
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="header-search"
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Buscar NFTs…"
        className="h-9 w-48 rounded-md border border-line bg-surface px-3 text-sm placeholder:text-subtle"
      />
      <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-surface-2" aria-label="Fechar busca">
        <X className="size-4" aria-hidden />
      </button>
    </form>
  )
}

function UserMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const logout = useLogout()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const initial = user.displayName.slice(0, 1).toUpperCase()

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="user-menu"
        className="flex items-center gap-2 rounded-md border border-line px-2 py-1 text-sm hover:bg-surface-2"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
        ) : (
          <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden>
            {initial}
          </span>
        )}
        <span className="max-w-28 truncate" data-testid="current-user">
          {user.displayName}
        </span>
      </button>
      {open && (
        <div id="user-menu" className="absolute right-0 top-full z-40 mt-2 w-52 rounded-lg border border-line bg-surface p-1 shadow-xl">
          <MenuLink to="/account/profile" icon={<User aria-hidden />} onSelect={() => setOpen(false)}>
            Meu perfil
          </MenuLink>
          <MenuLink to="/account/wallets" icon={<Wallet aria-hidden />} onSelect={() => setOpen(false)}>
            Carteiras
          </MenuLink>
          <MenuLink to="/account/favorites" icon={<Heart aria-hidden />} onSelect={() => setOpen(false)}>
            Favoritos
          </MenuLink>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              logout.mutate()
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-surface-2 [&_svg]:size-4"
          >
            <LogOut aria-hidden />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

function MenuLink({
  to,
  icon,
  children,
  onSelect,
}: {
  to: '/account/profile' | '/account/wallets' | '/account/favorites'
  icon: ReactNode
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <Link to={to} onClick={onSelect} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-2 [&_svg]:size-4">
      {icon}
      {children}
    </Link>
  )
}
