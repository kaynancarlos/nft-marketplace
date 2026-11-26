import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Activity, Download, Heart, LifeBuoy, LogOut, Tag, User, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLogout } from '@/queries/auth'
import { cn } from '@/lib/utils'

/** Mobile: abas em pílula com rolagem lateral. Desktop: lista vertical com marcador à esquerda. */
const itemClass =
  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line px-3 py-2 text-xs text-muted transition-colors hover:text-foreground md:rounded-none md:border-0 md:border-l-2 md:border-transparent md:hover:bg-surface-2 lg:text-[13px] [&_svg]:size-4'

function Item({ to, icon, children }: { to: '/account/profile' | '/account/wallets' | '/account/favorites'; icon: ReactNode; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = pathname === to
  return (
    <Link to={to} aria-current={active ? 'page' : undefined} className={cn(itemClass, active && 'border-primary bg-primary/10 text-primary md:border-primary')}>
      {icon}
      {children}
    </Link>
  )
}

function SoonItem({ section, icon, children }: { section: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to="/em-breve/$section" params={{ section }} className={cn(itemClass, 'text-foreground/80')}>
      {icon}
      {children}
    </Link>
  )
}

export function AccountLayout() {
  const logout = useLogout()
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:gap-10 lg:grid-cols-[290px_1fr] lg:gap-12">
      <nav aria-label="Minha conta" className="h-fit min-w-0 md:rounded-md md:bg-surface md:py-3">
        <p className="mb-2 hidden px-4 text-sm font-bold md:block">Meu perfil</p>
        <ul className="no-scrollbar flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          <li>
            <Item to="/account/profile" icon={<User aria-hidden />}>
              Dados do perfil
            </Item>
          </li>
          <li>
            <Item to="/account/wallets" icon={<Wallet aria-hidden />}>
              Carteiras
            </Item>
          </li>
          <li>
            <SoonItem section="atividade" icon={<Activity aria-hidden />}>
              Atividade
            </SoonItem>
          </li>
          <li>
            <Item to="/account/favorites" icon={<Heart aria-hidden />}>
              Lista de interesse
            </Item>
          </li>
          <li>
            <SoonItem section="ofertas" icon={<Tag aria-hidden />}>
              Ofertas
            </SoonItem>
          </li>
          <li>
            <SoonItem section="downloads" icon={<Download aria-hidden />}>
              Downloads
            </SoonItem>
          </li>
          <li>
            <SoonItem section="suporte" icon={<LifeBuoy aria-hidden />}>
              Suporte
            </SoonItem>
          </li>
          <li className="md:mt-1 md:border-t md:border-primary/60 md:pt-1">
            <button type="button" onClick={() => logout.mutate()} className={cn(itemClass, 'w-full border-danger/40 text-danger')} data-testid="logout-button">
              <LogOut aria-hidden />
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
