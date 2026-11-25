import type { Page } from '@playwright/test'
import { ANA, addToCart, expect, goto, login, test } from './support/fixtures'

/**
 * Regressão visual com dados estáveis (seed determinístico + cenário "fast").
 * Baselines versionadas em tests/__screenshots__/<projeto>/.
 * Gere/atualize com: npm run test:e2e:update -- visual.spec.ts
 */
async function stabilize(page: Page) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
      [data-sonner-toaster]{display:none!important}
      [aria-label="Abrir painel de cenários da demonstração"]{display:none!important}`,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
}

const mask = (page: Page) => [page.getByTestId('realtime-status')]

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await goto(page, '/')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await stabilize(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, mask: mask(page) })
  })

  test('detalhe', async ({ page }) => {
    await goto(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, mask: mask(page) })
  })

  test('carrinho', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'violet-nomad-314', 1)
    await expect(page.getByTestId('quote-total')).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, mask: mask(page) })
  })

  test('pagamento', async ({ page }) => {
    await login(page, ANA)
    await addToCart(page, 'ivory-baron-088', 1)
    await goto(page, '/checkout')
    await expect(page.locator('#displayName')).toHaveValue(ANA.name)
    await stabilize(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, mask: mask(page) })
  })
})
