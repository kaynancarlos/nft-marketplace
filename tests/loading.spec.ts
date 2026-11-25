import { addToCart, expect, goto, mock, test } from './support/fixtures'

test.describe('Carregamento e recuperação', () => {
  test.describe('rede lenta', () => {
    test.use({ scenario: 'slow' })
    test('skeletons no catálogo, detalhe e resumo do carrinho', async ({ page }) => {
      await goto(page, '/')
      await expect(page.getByTestId('nft-card-skeleton').first()).toBeVisible()
      await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 10_000 })

      await goto(page, '/nft/emerald-ape-042')
      await expect(page.getByTestId('detail-skeleton')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 10_000 })

      await mock(page, (k) => k.setScenario('fast'))
      await addToCart(page, 'emerald-ape-042')
      await mock(page, (k) => k.setScenario('slow'))
      await page.reload()
      await expect(page.getByTestId('cart-skeleton').or(page.getByTestId('quote-skeleton')).first()).toBeVisible()
      await expect(page.getByTestId('quote-total')).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe('falha do servidor', () => {
    test.use({ scenario: 'server-error' })
    test('feedback de erro e recuperação após nova tentativa', async ({ page }) => {
      await goto(page, '/')
      await expect(page.getByRole('heading', { name: 'Não foi possível carregar o catálogo' })).toBeVisible({ timeout: 15_000 })

      // O servidor volta ao normal; o usuário tenta novamente.
      await mock(page, (k) => k.setScenario('fast'))
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(page.getByTestId('nft-card').first()).toBeVisible()
    })
  })

  test.describe('falha transitória', () => {
    test.use({ scenario: 'flaky' })
    test('retry automático recupera sem ação do usuário', async ({ page }) => {
      await goto(page, '/')
      await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('sem conexão', () => {
    test.use({ scenario: 'offline' })
    test('mostra erro de conexão', async ({ page }) => {
      await goto(page, '/')
      await expect(page.getByText(/Sem conexão com o servidor/)).toBeVisible({ timeout: 15_000 })
    })
  })
})
