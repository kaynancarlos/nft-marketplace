import { setupWorker } from 'msw/browser'
import { createControl } from './control'
import { schedulePendingOrders } from './domain'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { favoriteHandlers } from './handlers/favorites'
import { nftHandlers } from './handlers/nfts'
import { orderHandlers } from './handlers/orders'
import { profileHandlers } from './handlers/profile'
import { walletHandlers } from './handlers/wallets'
import { realtimeHandler } from './realtime/server'
import { initScenarioFromUrl } from './scenarios'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...walletHandlers,
  ...profileHandlers,
  ...orderHandlers,
  realtimeHandler,
]

export async function startMocks() {
  initScenarioFromUrl()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  window.__kurio = createControl()
  schedulePendingOrders()
  return worker
}
