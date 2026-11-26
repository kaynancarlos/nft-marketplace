import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { authStore } from '@/auth/authStore'
import { validateCatalogSearch } from '@/features/catalog/catalogSearch'
import { RootLayout } from '@/components/layout/RootLayout'
import { NotFoundPage } from '@/features/misc/NotFoundPage'
import { RouteError } from '@/features/misc/RouteError'
import { PageFallback } from '@/features/misc/PageFallback'

export interface RouterContext {
  queryClient: QueryClient
}

/** Caminho interno seguro para retorno pós-login (evita open redirect). */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

function requireAuth({ location }: { location: { href: string } }) {
  if (!authStore.token) {
    const expired = authStore.getSnapshot().endedReason === 'expired'
    throw redirect({ to: '/login', search: { redirect: location.href, reason: expired ? 'expired' : undefined } })
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteError,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateCatalogSearch,
  component: lazyRouteComponent(() => import('@/features/catalog/HomePage'), 'HomePage'),
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: lazyRouteComponent(() => import('@/features/nft/NftDetailPage'), 'NftDetailPage'),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: lazyRouteComponent(() => import('@/features/cart/CartPage'), 'CartPage'),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/checkout/CheckoutPage'), 'CheckoutPage'),
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/orders/OrderPage'), 'OrderPage'),
})

export interface LoginSearch {
  redirect?: string
  reason?: 'expired'
}

function validateLoginSearch(search: Record<string, unknown>): LoginSearch {
  return {
    redirect: typeof search.redirect === 'string' ? safeRedirect(search.redirect) : undefined,
    reason: search.reason === 'expired' ? 'expired' : undefined,
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: validateLoginSearch,
  component: lazyRouteComponent(() => import('@/features/auth/AuthPage'), 'LoginPage'),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: validateLoginSearch,
  component: lazyRouteComponent(() => import('@/features/auth/AuthPage'), 'RegisterPage'),
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/account/AccountLayout'), 'AccountLayout'),
})

const accountIndexRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/account/profile' })
  },
})

const profileRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: 'profile',
  component: lazyRouteComponent(() => import('@/features/account/ProfilePage'), 'ProfilePage'),
})

const walletsRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: 'wallets',
  component: lazyRouteComponent(() => import('@/features/account/WalletsPage'), 'WalletsPage'),
})

const favoritesRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: 'favorites',
  component: lazyRouteComponent(() => import('@/features/account/FavoritesPage'), 'FavoritesPage'),
})

const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explorer/$txHash',
  validateSearch: (search: Record<string, unknown>): { order?: string } => ({
    order: typeof search.order === 'string' ? search.order : undefined,
  }),
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/orders/ExplorerPage'), 'ExplorerPage'),
})

const comingSoonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/em-breve/$section',
  component: lazyRouteComponent(() => import('@/features/misc/ComingSoonPage'), 'ComingSoonPage'),
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  accountRoute.addChildren([accountIndexRoute, profileRoute, walletsRoute, favoritesRoute]),
  explorerRoute,
  comingSoonRoute,
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PageFallback,
    // Erros de uma página aparecem dentro do layout (cabeçalho e navegação continuam visíveis).
    defaultErrorComponent: RouteError,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
