import { test as base, expect, type Page } from '@playwright/test'
import type { KurioMockControl } from '../../mocks/control'

export type ScenarioId = Parameters<KurioMockControl['setScenario']>[0]

export const ANA = { email: 'ana@kurio.dev', password: 'Kurio@123', name: 'Ana Colecionadora' }
export const BRUNO = { email: 'bruno@kurio.dev', password: 'Kurio@123', name: 'Bruno Mint' }

/**
 * Cada teste roda em um contexto novo (storage vazio) → seed da API simulada.
 * O cenário é gravado ANTES do primeiro carregamento; recargas posteriores
 * preservam o que o teste tiver alterado.
 */
export const test = base.extend<{ scenario: ScenarioId }>({
  scenario: ['fast', { option: true }],
  page: async ({ page, scenario }, use) => {
    await page.addInitScript((id) => {
      if (!window.localStorage.getItem('kurio:scenario')) window.localStorage.setItem('kurio:scenario', id)
    }, scenario)
    await use(page)
  },
})

export { expect }

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 768
}

/** Aguarda o boot (MSW ativo + app montado). */
export async function ready(page: Page) {
  await page.waitForFunction(() => Boolean(window.__kurio))
  // O <header> está sempre presente (o <main> fica aria-hidden/vazio sob diálogos em tela cheia).
  await expect(page.locator('header').first()).toBeAttached()
}

export async function goto(page: Page, path: string) {
  await page.goto(path)
  await ready(page)
}

/** Executa uma ação no servidor simulado (window.__kurio) dentro da página. */
export async function mock<T>(page: Page, fn: (control: KurioMockControl, arg: unknown) => T, arg?: unknown): Promise<T> {
  return page.evaluate(
    ([source, a]) => {

      const f = new Function(`return (${source})`)() as (c: unknown, x: unknown) => T
      return f(window.__kurio, a)
    },
    [fn.toString(), arg] as const,
  ) as Promise<T>
}

export async function login(page: Page, user = ANA, redirect?: string) {
  await goto(page, redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeHidden()
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('kurio:session'))).not.toBeNull()
}

/** Abre o detalhe, escolhe quantidade e adiciona ao carrinho (vai para /cart). */
export async function addToCart(page: Page, nftId: string, quantity = 1) {
  await goto(page, `/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  for (let i = 1; i < quantity; i++) {
    await page.getByRole('button', { name: /^Aumentar quantidade/ }).click()
  }
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByTestId(isMobile(page) ? 'cart-item-mobile' : 'cart-item').first()).toBeVisible()
}

export function cartItems(page: Page) {
  return page.getByTestId(isMobile(page) ? 'cart-item-mobile' : 'cart-item')
}

/** No mobile os filtros ficam num drawer. */
export async function filterPanel(page: Page) {
  if (isMobile(page)) {
    await page.getByRole('button', { name: /Abrir filtros/ }).click()
    return page.getByRole('dialog', { name: 'Filtros' })
  }
  return page.getByRole('complementary', { name: 'Filtros do catálogo' })
}

/** Conecta a carteira e abre a revisão no checkout. */
export async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByTestId('wallet-connected')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(review).toBeVisible()
  await expect(review.getByTestId('confirm-order')).toBeEnabled()
  return review
}

export async function ordersCount(page: Page, userId = 'usr_ana') {
  return mock(page, (k, id) => k.snapshot().orders.filter((o: { userId: string }) => o.userId === id).length, userId)
}
